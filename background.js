class ProductivityGuardian {
  constructor() {
    const DEFAULT_ENCODED_KEY = '';
    this.groqApiKey = null;
    this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.isEnabled = true;
    this.blockedSites = [
      'sflix.to', 'netflix.com', 'youtube.com', 'facebook.com', 'instagram.com', 'tiktok.com',
      '123movies', 'putlocker', 'soap2day', 'gomovies', 'fmovies', 'watchseries',
      'fullmoviess.net', 'moviesto', 'watchmovies', 'freemovies', 'hdmovies',
      'streamingmovies', 'moviehub', 'filmhub', 'cinemahub', 'movie4k', 'moviehd',
      'hulu.com', 'disneyplus.com', 'hbomax.com', 'peacock.com', 'paramountplus.com',
      'appletv.com', 'crunchyroll.com', 'funimation.com', 'vudu.com',
      // Adult/vulgar sites
      'pornhub.com', 'xhamster.com', 'xvideos.com', 'redtube.com', 'youporn.com', 'tube8.com',
      'adultfriendfinder.com', 'ashleymadison.com', 'adultdating.com', 'hookup.com'
    ];
    this.allowedSites = ['stackoverflow.com', 'github.com', 'developer.mozilla.org', 'coursera.org', 'khan-academy.org', 'tue.video.yuja.com'];
    this.focusMode = false;
    this.allowedMetadata = {
      titleIncludes: [],
      descriptionIncludes: [],
      keywordsIncludes: []
    };
    this.lastApiCheck = 0;
    this.apiWorking = false;
    this.version = '1.1.0';
    this.currentSession = null; // { id, name, allowedDomains[], allowedMetadata{topics[]}, maxExtraDomains, endTime }
    this.sessionTimerId = null;
    this.focusLockEndTime = null;

    this.debugMode = true; // Enable debug mode by default
    this.init();
  }

  // Enhanced logging that will be visible in regular console
  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[AI Guardian ${timestamp}] ${message}`;
    
    // Service worker console (Extensions page)
    console.log(logMessage, data || '');
    
    // Send to all tabs for regular console visibility
    this.broadcastToAllTabs({
      action: 'debugLog',
      message: logMessage,
      data: data,
      timestamp: timestamp
    });
  }

  // Broadcast message to all tabs
  async broadcastToAllTabs(message) {
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Tab might not have content script loaded yet
          });
        }
      });
    } catch (error) {
      // Ignore errors
    }
  }

  async evaluateJustification(text) {
    // Lightweight heuristic: require length and study-related intent
    const t = (text || '').toLowerCase();
    const minLen = 20;
    const allowKeywords = ['assignment','research','tutorial','docs','documentation','course','class','study','work','bug','issue','learning'];
    if (t.length < minLen) return false;
    if (!allowKeywords.some(k => t.includes(k))) return false;
    // Optional: call AI to evaluate justification string strictly
    if (this.groqApiKey && this.apiWorking) {
      try {
        const prompt = `User justification to bypass focus for 5 minutes:\n\n"${text}"\n\nDecide STRICTLY if this is productive (ALLOW) or a distraction (DENY). Respond with ONLY ALLOW or DENY.`;
        const response = await fetch(this.groqApiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }], max_tokens: 3, temperature: 0 })
        });
        if (response.ok) {
          const data = await response.json();
          const decision = data.choices[0]?.message?.content?.trim().toUpperCase();
          return decision === 'ALLOW';
        }
      } catch {}
    }
    return true;
  }

  async init() {
    // Load settings from storage
    const result = await chrome.storage.sync.get(['groqApiKey', 'isEnabled', 'blockedSites', 'allowedSites', 'focusMode', 'allowedMetadata', 'focusLock', 'focusLockEndTime', 'currentSession']);
    if (result.groqApiKey) this.groqApiKey = result.groqApiKey;
    if (!this.groqApiKey && typeof DEFAULT_ENCODED_KEY === 'string' && DEFAULT_ENCODED_KEY.length > 0) {
      try { this.groqApiKey = atob(DEFAULT_ENCODED_KEY); } catch {}
    }
    if (result.isEnabled !== undefined) this.isEnabled = result.isEnabled;
    if (result.blockedSites) this.blockedSites = result.blockedSites;
    if (result.allowedSites) this.allowedSites = result.allowedSites;
    if (result.focusMode !== undefined) this.focusMode = result.focusMode;
    if (result.allowedMetadata) this.allowedMetadata = result.allowedMetadata;
    this.focusLock = !!result.focusLock;
    if (result.focusLockEndTime) this.focusLockEndTime = result.focusLockEndTime;

    if (result.currentSession) {
      this.currentSession = result.currentSession;
      this.refreshSessionState?.();
    }

    // Set up listeners
    this.setupListeners();
    
    // Check API connection if key exists
    if (this.groqApiKey) {
      this.checkApiConnection();
    }
    
    this.log(`AI Productivity Guardian v${this.version} initialized`);
    
    // Check if focus lock should auto-expire
    this.checkFocusLockExpiry();
  }

  checkFocusLockExpiry() {
    if (this.focusLock && this.focusLockEndTime && Date.now() >= this.focusLockEndTime) {
      this.log('🔓 Focus lock auto-expired');
      this.focusLock = false;
      this.focusLockEndTime = null;
      this.updateSettings({});
    }
  }

  setupListeners() {
    // Monitor tab updates
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && tab.url && this.isEnabled) {
        await this.analyzeAndBlockIfNeeded(tabId, tab.url);
      }
    });

    // Monitor navigation
    chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
      if (details.frameId === 0 && this.isEnabled) {
        await this.analyzeAndBlockIfNeeded(details.tabId, details.url);
      }
    });

    // Handle messages from content script
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      try {
        // COMPLETELY BYPASS Yuja platform - no extension functionality at all
        if (sender?.tab?.url && sender.tab.url.includes('tue.video.yuja.com')) {
          this.log('🎥 Yuja platform detected in message - completely bypassing extension functionality');
          sendResponse({ shouldBlock: false, reason: 'Yuja platform - completely exempt from extension', bypassExtension: true });
          return true;
        }
        
        if (request.action === 'analyzeContent') {
          const result = await this.analyzeContentWithAI(request.data);
          sendResponse(result);
      } else if (request.action === 'updateSettings') {
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
        } else if (request.action === 'checkApiStatus') {
          await this.checkApiConnection();
          sendResponse({ working: this.apiWorking, lastCheck: this.lastApiCheck });
        } else if (request.action === 'requestBypass') {
        const granted = await this.evaluateJustification(request.justification);
        if (granted && sender?.tab?.url) {
          try {
            const host = new URL(sender.tab.url).hostname;
            await this.setBypass(host, 5);
          } catch {}
          sendResponse({ approved: true, minutes: 5 });
        } else {
          sendResponse({ approved: false });
        }
        } else if (request.action === 'startSession') {
          await this.startSession?.(request.session);
          sendResponse({ success: true });
        } else if (request.action === 'stopSession') {
          const ok = await this.stopSession?.(request.justification || '');
          sendResponse({ success: ok });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
      }
      return true;
    });


  }

  async checkApiConnection() {
    if (!this.groqApiKey) {
      this.apiWorking = false;
      return false;
    }

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });

      this.apiWorking = response.ok;
      this.lastApiCheck = Date.now();
      
      if (!response.ok) {
        this.log('⚠️ Groq API check failed:', { status: response.status, statusText: response.statusText });
      }
      
      return this.apiWorking;
    } catch (error) {
      this.log('❌ API connection check failed:', error.message);
      this.apiWorking = false;
      this.lastApiCheck = Date.now();
      return false;
    }
  }

  async analyzeAndBlockIfNeeded(tabId, url) {
    try {
      this.log('🔍 AI Productivity Guardian - Analyzing URL');
      this.log('📍 URL:', url);
      
      // COMPLETELY BYPASS Yuja platform - no extension functionality at all
      if (url.includes('tue.video.yuja.com')) {
        this.log('🎥 Yuja platform detected - completely bypassing extension functionality');
        return;
      }
      
      // Skip chrome:// and extension pages
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('brave://')) {
        this.log('⏭️ Skipping chrome/extension page');
        return;
      }

      const hostname = new URL(url).hostname;
      this.log('🏠 Hostname:', hostname);

      // Check if explicitly allowed
      if (this.allowedSites.some(site => hostname.includes(site))) {
        this.log('✅ ALLOWED: Site is in whitelist');
        return;
      }

      // Active focus session enforcement (domain whitelist)
      if (this.isSessionActive?.()) {
        this.log('🎯 Focus Session Active - Checking domain whitelist');
        const allowed = (this.currentSession.allowedDomains || []);
        const inAllowedDomain = allowed.some(d => hostname.endsWith(d) || hostname.includes(d));
        
        this.log('📋 Allowed Domains:', allowed);
        this.log('🔍 Domain Match:', inAllowedDomain ? '✅ ALLOWED' : '❌ NOT ALLOWED');
        
        if (!inAllowedDomain) {
          // Allow a small number of extra domains if configured (e.g., cdn, auth)
          const res = await chrome.storage.local.get(['sessionExtras']);
          const extras = res.sessionExtras || {};
          const curId = this.currentSession.id;
          const setForId = extras[curId] || new Set();
          const setArr = Array.isArray(setForId) ? setForId : []; // storage serializes sets
          
          this.log('🔢 Extra Domains Used:', setArr.length);
          this.log('🔢 Max Extra Domains Allowed:', this.currentSession.maxExtraDomains || 0);
          
          if (setArr.includes(hostname) || (this.currentSession.maxExtraDomains||0) > setArr.length) {
            if (!setArr.includes(hostname)) {
              setArr.push(hostname);
              extras[curId] = setArr;
              await chrome.storage.local.set({ sessionExtras: extras });
              this.log('✅ ALLOWED: Extra domain added to session');
            } else {
              this.log('✅ ALLOWED: Extra domain already in session');
            }
          } else {
            this.log('🚫 BLOCKING: Domain not allowed in focus session');
            await this.blockTab(tabId, hostname, 'Focus Session: domain not in allowed list');
            return;
          }
        } else {
          this.log('✅ ALLOWED: Domain matches focus session whitelist');
        }
      }

      // Check temporary bypass window
      const bypassOk = await this.isBypassActive(hostname);
      if (bypassOk) {
        this.log('⏰ ALLOWED: Site has active bypass');
        return;
      }

      // Check if explicitly blocked
      if (this.blockedSites.some(site => hostname.includes(site))) {
        this.log('🚫 BLOCKING: Site is explicitly blocked');
        await this.blockTab(tabId, hostname, 'Explicitly blocked site');
        return;
      }

      // Focus Mode: allow only by metadata, otherwise block immediately
      if (this.focusMode) {
        this.log('🎯 Focus Mode Active - Will check metadata via content script');
        try {
          // Ask content script for extracted metadata (best effort)
          const [tab] = await chrome.tabs.query({ tabId });
          // If we don't have content yet, fall back to URL-only AI
        } catch {}
      }

      // Use AI analysis for unknown sites if API is working
      if (this.groqApiKey && this.apiWorking) {
        this.log('🤖 AI Analysis - Checking if site is distracting');
        const isDistracting = await this.analyzeUrlWithAI(url, hostname);
        if (isDistracting) {
          this.log('🚫 BLOCKING: AI detected distracting content');
          await this.blockTab(tabId, hostname, 'AI detected distracting content');
        } else {
          this.log('✅ ALLOWED: AI analysis passed');
        }
      } else if (this.groqApiKey && Date.now() - this.lastApiCheck > 300000) {
        // Check API connection every 5 minutes if we have a key
        this.log('🔄 Checking API connection...');
        this.checkApiConnection();
      } else {
        this.log('⏭️ Skipping AI analysis - No API key or API not working');
      }
    } catch (error) {
      console.error('Error analyzing URL:', error);
    }
    this.log('🔍 AI Productivity Guardian - URL Analysis Complete');
    this.log('─'.repeat(50));
  }


  async isBypassActive(hostname) {
    try {
      const res = await chrome.storage.local.get(['bypassAllowMap']);
      const map = res.bypassAllowMap || {};
      const until = map[hostname];
      if (typeof until === 'number' && until > Date.now()) return true;
      return false;
    } catch { return false; }
  }

  async setBypass(hostname, minutes) {
    try {
      const res = await chrome.storage.local.get(['bypassAllowMap']);
      const map = res.bypassAllowMap || {};
      map[hostname] = Date.now() + minutes * 60 * 1000;
      await chrome.storage.local.set({ bypassAllowMap: map });
    } catch {}
  }

  async analyzeUrlWithAI(url, hostname) {
    try {
      // NEW: Aggressive movie content detection before AI analysis
      const movieBlockResult = this.checkUrlForMovieContent(url, hostname);
      if (movieBlockResult.shouldBlock) {
        this.log('🚫 MOVIE CONTENT DETECTED IN URL - BLOCKING IMMEDIATELY:', movieBlockResult);
        return true; // Block the site
      }

      // NEW: Aggressive vulgar content detection before AI analysis
      const vulgarBlockResult = this.checkUrlForVulgarContent(url, hostname);
      if (vulgarBlockResult.shouldBlock) {
        this.log('🚫 VULGAR CONTENT DETECTED IN URL - BLOCKING IMMEDIATELY:', vulgarBlockResult);
        return true; // Block the site
      }

      // Check if we should test API connection first
      if (!this.apiWorking && Date.now() - this.lastApiCheck > 60000) {
        await this.checkApiConnection();
        if (!this.apiWorking) return false;
      }

      const prompt = `Analyze this URL and determine if it's likely to be distracting or unproductive for studying/work.

URL: ${url}
Hostname: ${hostname}

Consider these factors:
- Is it related to entertainment, movies, TV shows, social media, gaming, or streaming?
- Is it educational, professional, or work-related?
- Does the URL suggest productive content like documentation, tutorials, or academic resources?

Respond with only "BLOCK" if it should be blocked (distracting) or "ALLOW" if it should be allowed (productive).

Be strict - when in doubt, lean towards BLOCK for productivity.`;

      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.error('Groq API error:', response.status, response.statusText);
        this.apiWorking = false;
        return false;
      }

      const data = await response.json();
      const decision = data.choices[0]?.message?.content?.trim().toUpperCase();
      
      return decision === 'BLOCK';
    } catch (error) {
      console.error('AI analysis error:', error);
      this.apiWorking = false;
      return false;
    }
  }

  // NEW: Comprehensive movie content detection for URLs
  checkUrlForMovieContent(url, hostname) {
    const urlLower = (url || '').toLowerCase();
    const hostnameLower = (hostname || '').toLowerCase();
    
    // Comprehensive list of movie-related keywords and patterns
    const movieKeywords = [
      // Movie streaming sites (exact matches)
      '123movies', 'putlocker', 'soap2day', 'gomovies', 'fmovies', 'watchseries',
      
      // Movie/film terms (exact matches)
      'movie', 'movies', 'film', 'films', 'cinema', 'cinematic',
      
      // Streaming platforms (exact matches)
      'netflix', 'hulu', 'disney+', 'disneyplus', 'amazon prime', 'prime video',
      'hbo max', 'hbomax', 'peacock', 'paramount+', 'paramountplus',
      'apple tv', 'appletv', 'crunchyroll', 'funimation', 'vudu',
      
      // Movie-related phrases (exact matches)
      'watch online', 'stream online', 'free movies', 'hd movies', 'full movie',
      'movie streaming', 'film streaming', 'watch free', 'free streaming',
      'movie download', 'film download', 'torrent', 'streaming site',
      
      // Entertainment terms (exact matches)
      'entertainment', 'tv shows', 'television', 'series', 'episode',
      'season', 'watch', 'stream', 'streaming', 'video', 'videos',
      
      // Common movie site patterns (exact matches)
      'fullmoviess', 'moviesto', 'watchmovies', 'freemovies', 'hdmovies',
      'streamingmovies', 'moviehub', 'filmhub', 'cinemahub',
      
      // File extensions and formats (exact matches)
      '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm',
      
      // Common movie site domains (exact matches)
      'movie4k', 'moviehd', 'moviehub', 'filmhub', 'cinemahub'
    ];
    
    // Check URL for movie patterns
    const urlHasMovieContent = movieKeywords.some(keyword => urlLower.includes(keyword));
    if (urlHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => urlLower.includes(k));
      this.log('🚫 MOVIE DETECTED IN URL:', { 
        url, 
        hostname, 
        matchedKeyword,
        context: urlLower.substring(Math.max(0, urlLower.indexOf(matchedKeyword) - 20), urlLower.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Movie streaming site detected in URL: "${matchedKeyword}"`,
        matchedPattern: 'URL contains movie-related keywords'
      };
    }
    
    // Check hostname for movie patterns
    const hostnameHasMovieContent = movieKeywords.some(keyword => hostnameLower.includes(keyword));
    if (hostnameHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => hostnameLower.includes(k));
      this.log('🚫 MOVIE DETECTED IN HOSTNAME:', { 
        url, 
        hostname, 
        matchedKeyword,
        context: hostnameLower.substring(Math.max(0, hostnameLower.indexOf(matchedKeyword) - 10), hostnameLower.indexOf(matchedKeyword) + matchedKeyword.length + 10)
      });
      return {
        shouldBlock: true,
        reason: `Movie streaming site detected in hostname: "${matchedKeyword}"`,
        matchedPattern: 'Hostname contains movie-related keywords'
      };
    }
    
    this.log('✅ No movie content detected in URL - allowing for further analysis');
    return {
      shouldBlock: false,
      reason: 'No movie content detected in URL'
    };
  }

  // NEW: Comprehensive vulgar content detection for URLs
  checkUrlForVulgarContent(url, hostname) {
    const urlLower = (url || '').toLowerCase();
    const hostnameLower = (hostname || '').toLowerCase();
    
    // Comprehensive list of vulgar/inappropriate keywords and patterns
    const vulgarKeywords = [
      // Explicit vulgar terms (exact matches)
      'fuck', 'shit', 'pussy', 'dick', 'cunt', 'asshole', 'bitch', 'slut',
      'nigga', 'nigger', 'whore', 'hoe', 'cock', 'penis', 'vagina', 'ass',
      
      // Adult content terms (exact matches)
      'porn', 'pornhub', 'xhamster', 'xvideos', 'redtube', 'youporn',
      'adult', 'sex', 'sexual', 'nude', 'naked', 'nudity', 'erotic',
      
      // Inappropriate content patterns (exact matches)
      'xxx', 'x-rated', 'adult content', 'mature content', 'explicit',
      'nsfw', 'not safe for work', 'adult entertainment', 'adult site',
      
      // Common vulgar site patterns (exact matches)
      'pornhub', 'xhamster', 'xvideos', 'redtube', 'youporn', 'tube8',
      'adultfriendfinder', 'ashleymadison', 'adult dating', 'hookup',
      
      // File extensions for adult content (exact matches)
      '.xxx', '.adult', '.porn', '.sex'
    ];
    
    // Check URL for vulgar patterns
    const urlHasVulgarContent = vulgarKeywords.some(keyword => urlLower.includes(keyword));
    if (urlHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => urlLower.includes(k));
      this.log('🚫 VULGAR DETECTED IN URL:', { 
        url, 
        hostname, 
        matchedKeyword,
        context: urlLower.substring(Math.max(0, urlLower.indexOf(matchedKeyword) - 20), urlLower.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in URL: "${matchedKeyword}"`,
        matchedPattern: 'URL contains vulgar keywords'
      };
    }
    
    // Check hostname for vulgar patterns
    const hostnameHasVulgarContent = vulgarKeywords.some(keyword => hostnameLower.includes(keyword));
    if (hostnameHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => hostnameLower.includes(k));
      this.log('🚫 VULGAR DETECTED IN HOSTNAME:', { 
        url, 
        hostname, 
        matchedKeyword,
        context: hostnameLower.substring(Math.max(0, hostnameLower.indexOf(matchedKeyword) - 10), hostnameLower.indexOf(matchedKeyword) + matchedKeyword.length + 10)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in hostname: "${matchedKeyword}"`,
        matchedPattern: 'Hostname contains vulgar keywords'
      };
    }
    
    this.log('✅ No vulgar content detected in URL - allowing for further analysis');
    return {
      shouldBlock: false,
      reason: 'No vulgar content detected in URL'
    };
  }

  async analyzeContentWithAI(contentData) {
    if (!this.groqApiKey) return { shouldBlock: false, reason: 'No API key' };
    if (!this.apiWorking) return { shouldBlock: false, reason: 'API not working' };

    // Store debug log for content analysis
    await this.storeDebugLog(contentData.url || 'unknown', 'Content analysis', 'analyzed', contentData);

    try {
      const prompt = `Analyze this webpage content and determine if it's distracting for productivity/studying:

Title: ${contentData.title}
URL: ${contentData.url}
Meta Description: ${contentData.description}
Keywords: ${contentData.keywords}
Content Preview: ${contentData.textContent?.substring(0, 500)}

Is this content likely to be:
1. Entertainment (movies, TV, social media, gaming, gossip)
2. Educational/Professional (learning, work, documentation, tutorials)
3. News/Information (current events, factual content)

Respond with:
- "BLOCK" if it's primarily entertainment or distracting
- "ALLOW" if it's educational, professional, or useful information

Be strict for productivity - when uncertain, choose BLOCK.`;

      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 10,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        this.apiWorking = false;
        return { shouldBlock: false, reason: 'API error' };
      }

      const data = await response.json();
      const decision = data.choices[0]?.message?.content?.trim().toUpperCase();
      
      return { 
        shouldBlock: decision === 'BLOCK', 
        reason: decision === 'BLOCK' ? 'AI detected distracting content' : 'Content allowed by AI'
      };
    } catch (error) {
      console.error('Content analysis error:', error);
      this.apiWorking = false;
      return { shouldBlock: false, reason: 'Analysis failed' };
    }
  }

  async blockTab(tabId, hostname, reason) {
    try {
      // Redirect to block page
      const blockPageUrl = chrome.runtime.getURL('block-page.html') + 
        `?site=${encodeURIComponent(hostname)}&reason=${encodeURIComponent(reason)}`;
      
      await chrome.tabs.update(tabId, { url: blockPageUrl });
      
      // Log the block
      this.log(`🚫 Blocked ${hostname}: ${reason}`);
      
      // Store block event
      const blockData = {
        hostname,
        reason,
        timestamp: Date.now()
      };
      
      const result = await chrome.storage.local.get(['blockedEvents']);
      const blockedEvents = result.blockedEvents || [];
      blockedEvents.push(blockData);
      
      // Keep only last 100 events
      if (blockedEvents.length > 100) {
        blockedEvents.splice(0, blockedEvents.length - 100);
      }
      
      await chrome.storage.local.set({ blockedEvents });
      
      // Also store detailed debug log
      await this.storeDebugLog(hostname, reason, 'blocked');
    } catch (error) {
      console.error('Error blocking tab:', error);
    }
  }

  async storeDebugLog(hostname, reason, action, metadata = null) {
    try {
      const debugLog = {
        hostname,
        reason,
        action, // 'blocked', 'allowed', 'analyzed'
        metadata,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString()
      };
      
      const result = await chrome.storage.local.get(['debugLogs']);
      const debugLogs = result.debugLogs || [];
      debugLogs.push(debugLog);
      
      // Keep only last 200 debug logs
      if (debugLogs.length > 200) {
        debugLogs.splice(0, debugLogs.length - 200);
      }
      
      await chrome.storage.local.set({ debugLogs });
    } catch (error) {
      console.error('Error storing debug log:', error);
    }
  }

  async updateSettings(settings) {
    const oldApiKey = this.groqApiKey;
    
    // Remove user API key changes; keep current key if present (encoded or pre-set)
    if (settings.isEnabled !== undefined) this.isEnabled = settings.isEnabled;
    if (settings.blockedSites !== undefined) this.blockedSites = settings.blockedSites;
    if (settings.allowedSites !== undefined) this.allowedSites = settings.allowedSites;
    if (settings.focusMode !== undefined) this.focusMode = settings.focusMode;
    if (settings.focusLock !== undefined) this.focusLock = settings.focusLock;
    if (settings.allowedMetadata !== undefined) this.allowedMetadata = settings.allowedMetadata;

    await chrome.storage.sync.set({
      groqApiKey: this.groqApiKey,
      isEnabled: this.isEnabled,
      blockedSites: this.blockedSites,
      allowedSites: this.allowedSites,
      focusMode: this.focusMode,
      focusLock: this.focusLock,
      allowedMetadata: this.allowedMetadata,
      currentSession: this.currentSession,

    });

    // Check API if key changed
    if (this.groqApiKey !== oldApiKey && this.groqApiKey) {
      await this.checkApiConnection();
    }
  }
}

// Initialize the productivity guardian
const guardian = new ProductivityGuardian();

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    guardian.log('🎉 AI Productivity Guardian installed for the first time');
  } else if (details.reason === 'update') {
    guardian.log('🔄 AI Productivity Guardian updated');
  }
}); 

// Session helpers (appended to class via prototype)
ProductivityGuardian.prototype.isSessionActive = function() {
  return !!(this.currentSession && typeof this.currentSession.endTime === 'number' && this.currentSession.endTime > Date.now());
}

ProductivityGuardian.prototype.refreshSessionState = function() {
  const active = this.isSessionActive();
  if (active) {
    this.focusMode = true;
    this.focusLock = true;
    const msLeft = this.currentSession.endTime - Date.now();
    if (this.sessionTimerId) clearTimeout(this.sessionTimerId);
    this.sessionTimerId = setTimeout(() => this.endSession(), msLeft + 1000);
  } else {
    this.endSession();
  }
}

ProductivityGuardian.prototype.startSession = async function(session) {
  const endTime = Date.now() + Math.max(1, Number(session.durationMin || 25)) * 60 * 1000;
  this.currentSession = {
    id: session.id || `sess_${Date.now()}`,
    name: session.name || 'Focus Session',
    allowedDomains: session.allowedDomains || [],
    allowedMetadata: session.allowedMetadata || this.allowedMetadata,
    maxExtraDomains: session.maxExtraDomains || 0,
    endTime
  };
  this.refreshSessionState();
  await this.persistSessionHistory('start');
  await this.updateSettings({});
}

ProductivityGuardian.prototype.stopSession = async function(justification) {
  const ok = await this.evaluateJustification(justification || 'ending session');
  if (!ok) return false;
  await this.endSession();
  return true;
}

ProductivityGuardian.prototype.endSession = async function() {
  if (!this.currentSession) return;
  await this.persistSessionHistory('end');
  this.currentSession = null;
  this.focusLock = false;
  if (this.sessionTimerId) { clearTimeout(this.sessionTimerId); this.sessionTimerId = null; }
  await chrome.storage.sync.set({ currentSession: null, focusLock: this.focusLock });
}

ProductivityGuardian.prototype.persistSessionHistory = async function(event) {
  try {
    const res = await chrome.storage.local.get(['sessionHistory']);
    const history = res.sessionHistory || [];
    history.push({
      event,
      name: this.currentSession?.name || '',
      timestamp: Date.now(),
      endTime: this.currentSession?.endTime || null,
      allowedDomains: this.currentSession?.allowedDomains || []
    });
    await chrome.storage.local.set({ sessionHistory: history });
  } catch {}
}