// Immediate execution BEFORE ContentAnalyzer construction
console.log('[AI Guardian] Content script loaded on:', location.href);
console.log('[AI Guardian] Hostname:', location.hostname);
console.log('[AI Guardian] User Agent:', navigator.userAgent);

// IMMEDIATE YouTube blocking on Perplexity/Comet (runs before class init)
(function() {
  const isPerplexity = /perplexity\.ai/.test(location.hostname) || 
                       location.hostname.includes('perplexity') ||
                       /comet/i.test(navigator.userAgent) ||
                       /perplexity/i.test(navigator.userAgent);
  
  console.log('[AI Guardian] Perplexity/Comet detection (immediate):', isPerplexity);
  
  if (isPerplexity) {
    console.log('[AI Guardian] ✅ PERPLEXITY/COMET DETECTED - Starting immediate YouTube blocking');
    
    const blockYouTube = () => {
      let count = 0;
      document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').forEach(el => {
        el.remove();
        count++;
      });
      document.querySelectorAll('[href*="youtube.com"], [href*="youtu.be"]').forEach(link => {
        let parent = link.closest('div[class*="card"], div[class*="result"], article, section') || link.parentElement;
        if (parent && parent.style.display !== 'none') {
          parent.style.display = 'none';
          count++;
        }
      });
      document.querySelectorAll('img[src*="ytimg.com"], img[src*="youtube.com"], img[src*="youtu.be"]').forEach(img => {
        let parent = img.closest('div[class*="card"], div[class*="result"], article, section') || img.parentElement;
        if (parent && parent.style.display !== 'none') {
          parent.style.display = 'none';
          count++;
        }
      });
      if (count > 0) console.log(`[AI Guardian] 🚫 Blocked ${count} YouTube elements (immediate pass)`);
    };
    
    // Multiple passes
    blockYouTube();
    setTimeout(blockYouTube, 100);
    setTimeout(blockYouTube, 500);
    setTimeout(blockYouTube, 1000);
    setTimeout(blockYouTube, 2000);
    
    // Continuous observation
    if (document.documentElement) {
      const obs = new MutationObserver(blockYouTube);
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } else {
      // If documentElement not ready, wait and try again
      setTimeout(() => {
        if (document.documentElement) {
          const obs = new MutationObserver(blockYouTube);
          obs.observe(document.documentElement, { childList: true, subtree: true });
        }
      }, 100);
    }
  }
})();

(function() {
  const host = location.hostname;
  const isGoogleHost = /(^|\.)google\.(com|[a-z]{2,3})(\.[a-z]{2})?$/.test(host) || /^images\.google\./.test(host);
  if (!isGoogleHost) return;

  const isImagesVertical = () => {
    try {
      const search = location.search || '';
      const pathname = location.pathname || '';
      if (/[?&]tbm=isch(&|$)/.test(search)) return true;
      if (/[?&]udm=2(&|$)/.test(search)) return true;
      if (pathname === '/imghp') return true;
      if (/^images\.google\./.test(host)) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  const redirectIfImages = () => {
    if (!isImagesVertical()) return;
    if (window._aiGuardianImagesRedirected) return;
    window._aiGuardianImagesRedirected = true;
    try {
      const url = new URL(location.href);
      const tbm = url.searchParams.get('tbm');
      const udm = url.searchParams.get('udm');
      if (tbm === 'isch' || udm === '2') {
        if (tbm === 'isch') url.searchParams.delete('tbm');
        if (udm === '2') url.searchParams.delete('udm');
        url.searchParams.delete('source');
        try { if (window.stop) window.stop(); } catch (e) {}
        location.replace(url.toString());
        return;
      }
    } catch (e) {
      try {
        if (document.documentElement) {
          document.documentElement.innerHTML = '';
        }
        document.write('<!DOCTYPE html><html><head><title>Blocked</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#111;color:#fff;"><div style="text-align:center;max-width:480px;padding:24px;"><h1 style="font-weight:400;margin-bottom:12px;">Google Images blocked</h1><p style="opacity:0.8;">AI Productivity Guardian has disabled Google Images to help you stay focused.</p></div></body></html>');
        document.close();
      } catch (e2) {}
    }
  };

  const block = () => {
    redirectIfImages();
    try {
      document.querySelectorAll('a[href*="tbm=isch"], a[href*="/imghp"], a[href*="udm=2"]').forEach(link => {
        const tab = link.closest('g-menu-item, div, span, a') || link;
        tab.style.display = 'none';
        link.removeAttribute('href');
        link.style.pointerEvents = 'none';
        link.style.cursor = 'default';
      });
    } catch (e) {}
  };

  block();
  setTimeout(block, 100);
  setTimeout(block, 500);
  setTimeout(block, 1000);
  setTimeout(block, 2000);

  if (document.documentElement) {
    const obs = new MutationObserver(block);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    setTimeout(() => {
      if (document.documentElement) {
        const obs2 = new MutationObserver(block);
        obs2.observe(document.documentElement, { childList: true, subtree: true });
      }
    }, 100);
  }
})();

class ContentAnalyzer {
  constructor() {
    this.analyzed = false;
    this.focusMode = false;
    this.allowedMetadata = {
      titleIncludes: [],
      descriptionIncludes: [],
      keywordsIncludes: []
    };
    this.init();
  }

  async getAmsterdamHour() {
    // Prefer asking background (which uses network providers and cache)
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getAmsterdamHour' });
      if (res && typeof res.hour === 'number') {
        this.log('🕒 Amsterdam hour from background (content): ' + res.hour);
        return res.hour;
      }
    } catch (e) {
      // fall through to Intl fallback
    }
    // Fallback: compute with Intl locally
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false });
      const hourStr = fmt.format(Date.now());
      const hour = parseInt(hourStr, 10);
      this.log('🕒 Amsterdam hour via Intl (content): ' + hour);
      return hour;
    } catch (e) {
      const h = new Date().getHours();
      this.log('⚠️ Amsterdam hour fallback (local): ' + h);
      return h;
    }
  }

  async init() {
    // IMMEDIATELY block YouTube on Perplexity/Comet BEFORE anything else
    this.blockInlineYouTubeOnPerplexity();
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyzeContent());
    } else {
      this.analyzeContent();
    }

    this.setupDebugListener();
  }

  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[AI Guardian ${timestamp}] ${message}`;
    console.log(logMessage, data || '');
    
    if (window.console && window.console.log) {
      console.log(`%c${logMessage}`, 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;', data || '');
    }
  }

  // Set up listener for debug messages from background script
  setupDebugListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'debugLog') {
        // Display debug messages in the regular browser console
        const style = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;';
        console.log(`%c${request.message}`, style, request.data || '');
        
        // Also log to page console for visibility
        if (window.console && window.console.log) {
          console.log(`[AI Guardian Debug] ${request.message}`, request.data || '');
        }
      }
      return true;
    });
  }

  async analyzeContent() {
    // Prevent multiple analyses
    if (this.analyzed) return;
    this.analyzed = true;

    try {
      // COMPLETELY BYPASS Yuja platform - no extension functionality at all
      if (window.location.hostname.includes('tue.video.yuja.com')) {
        this.log('🎥 Yuja platform detected - completely bypassing extension functionality');
        return;
      }
      
      // Skip if already on block page
      if (window.location.href.includes('block-page.html')) {
        this.log('🚫 Already on block page, skipping analysis');
        return;
      }

      // Load focus mode settings
      const cfg = await chrome.storage.sync.get(['focusMode', 'allowedMetadata']);
      this.focusMode = !!cfg.focusMode;
      if (cfg.allowedMetadata) this.allowedMetadata = cfg.allowedMetadata;

      this.log('🎯 Focus Mode Status:', { 
        focusMode: this.focusMode, 
        allowedMetadata: this.allowedMetadata,
        hasTitleRules: this.allowedMetadata.titleIncludes.length > 0,
        hasDescriptionRules: this.allowedMetadata.descriptionIncludes.length > 0,
        hasKeywordsRules: this.allowedMetadata.keywordsIncludes.length > 0
      });

      // Apply inline YouTube block on Google Search (videos tab and SERP inline players)
      this.blockInlineYouTubeOnGoogle();
      
      // Apply inline YouTube block on Perplexity Search
      this.blockInlineYouTubeOnPerplexity();

      // Wait a bit for content to load
      setTimeout(async () => {
        const contentData = await this.extractContentData();
        
        // Night relax window for Amsterdam: 03:00–06:00 — allow everything except vulgar
        try {
          const amsHour = await this.getAmsterdamHour();
          if (typeof amsHour === 'number' && amsHour >= 3 && amsHour < 6) {
            const vulgarBlockResult = this.checkForVulgarContent(contentData);
            if (vulgarBlockResult.shouldBlock) {
              this.log('🚫 VULGAR CONTENT (night window) - BLOCKING:', vulgarBlockResult);
              this.blockPage(vulgarBlockResult.reason);
              return;
            }
            this.log('🌙 03–06 Amsterdam: relaxing rules – allowing non‑vulgar content');
            return; // Skip all other blocking during relax window
          }
        } catch (e) {
          this.log('⚠️ Amsterdam time check failed; proceeding with normal rules');
        }
        
        // NEW: AGGRESSIVE MOVIE BLOCKING - Check for movie-related content first
        const movieBlockResult = this.checkForMovieContent(contentData);
        if (movieBlockResult.shouldBlock) {
          this.log('🚫 MOVIE CONTENT DETECTED - BLOCKING IMMEDIATELY:', movieBlockResult);
          this.blockPage(movieBlockResult.reason);
          return;
        }
        const vulgarBlockResult = this.checkForVulgarContent(contentData);
        if (vulgarBlockResult.shouldBlock) {
          this.log('🚫 VULGAR CONTENT DETECTED - BLOCKING IMMEDIATELY:', vulgarBlockResult);
          this.blockPage(vulgarBlockResult.reason);
          return;
        }
        
        // If focus mode is ON, enforce allow-by-metadata first
        if (this.focusMode) {
          this.log('🎯 Focus Mode Active - Checking metadata rules...');
          this.log('📋 Current metadata rules:', this.allowedMetadata);
          
          // For chat sites, allow initially and check query later
          const isChat = this.isChatSite();
          this.log('🔍 Chat site check result:', isChat);
          
          if (isChat) {
            this.log('🤖 Chat site detected - allowing initial access, will check query when typed');
            // Don't block chat sites initially - let the chat query filter handle it
          } else {
            // For non-chat sites, check metadata immediately
            this.log('🌐 Non-chat site detected - checking metadata immediately');
            const metadataMatch = this.matchesAllowedMetadata(contentData);
            this.log('🎯 Metadata check result:', metadataMatch ? '✅ MATCH' : '❌ NO MATCH');
            
            if (!metadataMatch) {
              const reason = 'Focus Session: site does not match allowed metadata';
              this.log('🚫 BLOCKING: Focus mode active but metadata does not match', { contentData, reason });
              this.blockPage(reason);
              return;
            } else {
              this.log('✅ ALLOWING: Page matches focus mode metadata rules');
            }
          }
        } else {
          this.log('⏭️ Focus mode not active - skipping metadata check');
        }

        // Hybrid approach: Both chat-specific and general topic filtering
        
        // 1. Chat site topic filter (stricter - only allows specific query topics)
        // Wait longer for chat sites to load content
        if (this.isChatSite()) {
          this.log('🤖 Chat site detected - waiting for interface to load...');
          // Wait for chat interface to be ready, then check
          setTimeout(async () => {
            try {
              await this.enforceChatTopicFilterIfNeeded();
            } catch (error) {
              this.log('⚠️ Error in chat topic filter:', error);
            }
          }, 5000); // Wait 5 seconds for interface to load
          // Also set up continuous monitoring for chat sites
          this.setupChatSiteMonitoring();
        } else {
          await this.enforceChatTopicFilterIfNeeded();
        }
        
        // 2. General website topic filter (broader - allows any page with relevant content)
        await this.enforceTopicFilterIfNeeded();

        // Send to background script for AI analysis
        this.log('🤖 Sending content data to background script for AI analysis:', contentData);
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          data: contentData
        });

        if (response && response.shouldBlock) {
          // Block the page by replacing content
          this.log('🚫 AI analysis result: BLOCK', response);
          this.blockPage(response.reason);
        } else {
          this.log('✅ AI analysis result: ALLOW', response);
        }
      }, 2000); // Wait 2 seconds for page content to load

    } catch (error) {
      console.error('Content analysis error:', error);
    }
  }

  matchesAllowedMetadata(data) {
    const title = (data.title || '').toLowerCase();
    const description = (data.description || '').toLowerCase();
    const keywords = (data.keywords || '').toLowerCase();

    const { titleIncludes, descriptionIncludes, keywordsIncludes } = this.allowedMetadata;

    this.log('🔍 Checking metadata against allowed rules:', { titleIncludes, descriptionIncludes, keywordsIncludes });
    this.log('🔍 Page metadata:', { title, description, keywords });

    // Check if ANY metadata field has rules and matches
    let hasAnyRules = false;
    let anyMatch = false;

    // Check title includes
    if (titleIncludes.length > 0) {
      hasAnyRules = true;
      const titleOk = titleIncludes.some(k => title.includes(k.toLowerCase()));
      this.log(`   Title keyword check: ${titleOk ? '✅ MATCH' : '❌ NO MATCH'} for keywords:`, titleIncludes);
      anyMatch = anyMatch || titleOk;
    }

    // Check description includes
    if (descriptionIncludes.length > 0) {
      hasAnyRules = true;
      const descOk = descriptionIncludes.some(k => description.includes(k.toLowerCase()));
      this.log(`   Description keyword check: ${descOk ? '✅ MATCH' : '❌ NO MATCH'} for keywords:`, descriptionIncludes);
      anyMatch = anyMatch || descOk;
    }

    // Check keywords includes
    if (keywordsIncludes.length > 0) {
      hasAnyRules = true;
      const keyOk = keywordsIncludes.some(k => keywords.includes(k.toLowerCase()));
      this.log(`   Meta keywords check: ${keyOk ? '✅ MATCH' : '❌ NO MATCH'} for keywords:`, keywordsIncludes);
      anyMatch = anyMatch || keyOk;
    }

    // If no rules are set, allow everything
    if (!hasAnyRules) {
      this.log('🎯 No metadata rules set - allowing page');
      return true;
    }

    // If rules are set, at least one must match
    this.log('🎯 Final metadata check result:', anyMatch ? '✅ ALLOWED' : '❌ BLOCKED');
    return anyMatch;
  }

  async extractContentData() {
    const data = {
      url: window.location.href,
      title: document.title || '',
      description: '',
      keywords: '',
      textContent: '',
      images: [],
      videos: []
    };

    // Enhanced logging for debugging
    this.log('🔍 AI Productivity Guardian - Content Analysis');
    this.log('📍 URL:', data.url);
    this.log('📝 Title:', data.title);

    // Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      data.description = metaDescription.getAttribute('content') || '';
    }
    this.log('📄 Meta Description:', data.description);

    // Extract meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      data.keywords = metaKeywords.getAttribute('content') || '';
    }
    this.log('🏷️ Meta Keywords:', data.keywords);

    // Extract Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogType = document.querySelector('meta[property="og:type"]');
    
    if (ogTitle) data.title = ogTitle.getAttribute('content') || data.title;
    if (ogDescription) data.description = ogDescription.getAttribute('content') || data.description;
    if (ogType) data.ogType = ogType.getAttribute('content') || '';
    
    this.log('🔗 Open Graph Title:', ogTitle?.getAttribute('content') || 'None');
    this.log('🔗 Open Graph Description:', ogDescription?.getAttribute('content') || 'None');
    this.log('🔗 Open Graph Type:', ogType?.getAttribute('content') || 'None');

    // Extract text content (first 1000 characters)
    const bodyText = document.body ? document.body.innerText : '';
    data.textContent = bodyText.substring(0, 1000);
    this.log('📖 Text Content Preview:', data.textContent.substring(0, 200) + '...');

    // Chat site guards: capture the current query/topic heuristically
    const host = location.hostname;
    if (this.isChatSite()) {
      // Use enhanced chat query extraction for chat sites
      data.chatQuery = await this.extractChatQuery();
    }

    // Look for streaming indicators (simplified)
    data.hasVideoElements = document.querySelectorAll('video').length > 0;
    
    this.log('🎥 Video Elements:', data.hasVideoElements);

    // Check for social media patterns (simplified)
    data.isSocialMedia = this.isSocialMediaSite();
    this.log('📱 Social Media Detected:', data.isSocialMedia);

    this.log('📊 Final Extracted Data:', data);
    this.log('🔍 AI Productivity Guardian - Content Analysis Complete');
    this.log('─'.repeat(50));
    return data;
  }

  // Filter Google search results based on focus metadata
  async filterGoogleSearchResults() {
    try {
      const { allowedMetadata, currentSession } = await chrome.storage.sync.get(['allowedMetadata', 'currentSession']);
      
      // If there's an active session, use its metadata instead of the general settings
      const activeMetadata = currentSession?.allowedMetadata || allowedMetadata;
      
      // Check both old 'topics' format and new metadata format
      const topics = (activeMetadata?.topics || []).map(t => String(t).toLowerCase());
      const titleIncludes = (activeMetadata?.titleIncludes || []).map(t => String(t).toLowerCase());
      const descriptionIncludes = (activeMetadata?.descriptionIncludes || []).map(t => String(t).toLowerCase());
      const keywordsIncludes = (activeMetadata?.keywordsIncludes || []).map(t => String(t).toLowerCase());
      
      if (topics.length === 0 && titleIncludes.length === 0 && descriptionIncludes.length === 0 && keywordsIncludes.length === 0) return;
      
      this.log('🔍 Filtering Google search results for metadata:', { topics, titleIncludes, descriptionIncludes, keywordsIncludes });
      this.log('📋 Active Session:', currentSession?.name || 'None');
      
      // Get all search result cards
      const searchResults = document.querySelectorAll('div[data-ved], div[jscontroller], div[jsaction]');
      
      searchResults.forEach((result, index) => {
        const title = result.querySelector('h3, a[role="heading"]')?.textContent || '';
        const snippet = result.querySelector('div[data-content-feature="1"], span[data-ved]')?.textContent || '';
        const text = `${title} ${snippet}`.toLowerCase();
        
        // Check if result contains any allowed metadata
        let matches = false;
        if (topics.length > 0) {
          matches = matches || topics.some(topic => text.includes(topic));
        }
        if (titleIncludes.length > 0) {
          matches = matches || titleIncludes.some(topic => text.includes(topic));
        }
        if (descriptionIncludes.length > 0) {
          matches = matches || descriptionIncludes.some(topic => text.includes(topic));
        }
        if (keywordsIncludes.length > 0) {
          matches = matches || keywordsIncludes.some(topic => text.includes(topic));
        }
        
        if (!matches) {
          // Hide results that don't match metadata
          result.style.display = 'none';
          this.log(`🚫 Hidden result ${index + 1}: "${title.substring(0, 50)}..." - No metadata match`);
        } else {
          this.log(`✅ Showing result ${index + 1}: "${title.substring(0, 50)}..." - Metadata match found`);
        }
      });
      
      this.log('🔍 Google search filtering complete');
    } catch (error) {
      console.error('Error filtering Google results:', error);
    }
  }

  // Set up continuous monitoring for chat sites
  setupChatSiteMonitoring() {
    if (!this.isChatSite()) return;
    
    this.log('🔍 Setting up chat site monitoring...');
    
    // Monitor for changes in the chat input
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Check if the query has changed
          this.checkChatQueryChange();
        }
      });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'textContent', 'contenteditable']
    });
    
    // Also check more frequently for chat sites to catch typing quickly
    setInterval(async () => {
      try {
        const currentQuery = await this.extractChatQuery();
        if (currentQuery && currentQuery.length > 3) { // Check even short queries
          this.log('🔄 Frequent chat query check:', currentQuery.substring(0, 50) + '...');
          await this.checkChatQueryChange();
        }
      } catch (error) {
        // Ignore errors in periodic checks
      }
    }, 1500); // Check every 1.5 seconds for chat sites
  }

  // Check if chat query has changed and re-evaluate
  async checkChatQueryChange() {
    try {
      const { focusMode, currentSession } = await chrome.storage.sync.get(['focusMode', 'currentSession']);
      if (!focusMode || !currentSession) return;
    
      const data = await this.extractContentData();
      const queryText = data.chatQuery || '';
      
      this.log('🔍 Chat query change detected:', { 
        queryLength: queryText.length, 
        queryPreview: queryText.substring(0, 100),
        focusMode,
        hasSession: !!currentSession
      });
      
      if (queryText.length > 3) { // Check even short queries
        this.log('🔍 Evaluating chat query against focus rules:', queryText.substring(0, 50) + '...');
        
        const activeMetadata = currentSession?.allowedMetadata || {};
        
        // Check both old 'topics' format and new metadata format
        const topics = (activeMetadata?.topics || []).map(t => String(t).toLowerCase());
        const titleIncludes = (activeMetadata?.titleIncludes || []).map(t => String(t).toLowerCase());
        const descriptionIncludes = (activeMetadata?.descriptionIncludes || []).map(t => String(t).toLowerCase());
        const keywordsIncludes = (activeMetadata?.keywordsIncludes || []).map(t => String(t).toLowerCase());
        
        this.log('📋 Checking query against metadata rules:', { topics, titleIncludes, descriptionIncludes, keywordsIncludes });
        
        let queryMatches = false;
        if (topics.length > 0) {
          queryMatches = queryMatches || topics.some(t => queryText.toLowerCase().includes(t));
        }
        if (titleIncludes.length > 0) {
          queryMatches = queryMatches || titleIncludes.some(t => queryText.toLowerCase().includes(t));
        }
        if (descriptionIncludes.length > 0) {
          queryMatches = queryMatches || descriptionIncludes.some(t => queryText.toLowerCase().includes(t));
        }
        if (keywordsIncludes.length > 0) {
          queryMatches = queryMatches || keywordsIncludes.some(t => queryText.toLowerCase().includes(t));
        }
        
        this.log('🎯 Query metadata match result:', queryMatches ? '✅ MATCH' : '❌ NO MATCH');
        
        if (!queryMatches) {
          this.log('🚫 Chat query does not match allowed metadata, blocking...');
          this.blockPage('Focus Session: chat query not allowed');
        } else {
          this.log('✅ Chat query matches allowed metadata - allowing');
        }
      } else {
        this.log('⏭️ Query too short, waiting for more input...');
      }
    } catch (error) {
      console.error('Error checking chat query change:', error);
    }
  }

  blockInlineYouTubeOnGoogle() {
    try {
      const isGoogle = /(^|\.)google\.(com|[a-z]{2,3})(\.[a-z]{2})?$/.test(location.hostname);
      if (!isGoogle) return;

      this.log('🔍 Google Search Detected - Applying Enhanced Blocking');

      const nuke = () => {
        // Remove inline ytd-player, youtube iframes, and preview players inside SERP
        document.querySelectorAll('iframe[src*="youtube.com"], ytd-player, ytd-video-renderer, div[aria-label*="YouTube" i]').forEach(el => {
          el.remove();
        });
        // Hide video tab results that are from YouTube
        document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"]').forEach(a => {
          const card = a.closest('div');
          if (card) card.style.display = 'none';
        });
        
        document.querySelectorAll('a[href*="tbm=isch"], a[href*="/imghp"]').forEach(link => {
          const tab = link.closest('g-menu-item, div, span, a') || link;
          tab.style.display = 'none';
          link.removeAttribute('href');
          link.style.pointerEvents = 'none';
          link.style.cursor = 'default';
        });
        
        if (/[?&]tbm=isch(&|$)/.test(location.search) || location.pathname === '/imghp') {
          if (!this._aiGuardianImagesBlocked) {
            this._aiGuardianImagesBlocked = true;
            this.blockPage('Google Images search is blocked');
          }
        }
        
        // Enhanced: Hide Google search results that don't match focus topics
        if (this.focusMode) {
          this.filterGoogleSearchResults();
        }
      };

      // Initial pass and observe mutations
      nuke();
      const obs = new MutationObserver(() => nuke());
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {
      // no-op
    }
  }

  blockInlineYouTubeOnPerplexity() {
    try {
      // Log detection attempt
      this.log('🔍 Checking for Perplexity/Comet...', {
        hostname: location.hostname,
        userAgent: navigator.userAgent,
        href: location.href
      });
      
      // Check for Perplexity (works in all browsers including Comet)
      const isPerplexity = /perplexity\.ai/.test(location.hostname) || 
                          location.hostname.includes('perplexity') ||
                          /comet/i.test(navigator.userAgent) || // Comet browser
                          /perplexity/i.test(navigator.userAgent); // Perplexity in UA
      
      this.log('🔍 Detection result:', isPerplexity ? '✅ PERPLEXITY/COMET DETECTED' : '❌ Not Perplexity/Comet');
      
      if (!isPerplexity) return;

      this.log('🔍 Perplexity Search Detected (including Comet browser) - Applying YouTube Blocking');

      const nuke = () => {
        let blockedCount = 0;
        
        // Remove YouTube iframes and embeds
        document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]').forEach(el => {
          el.remove();
          blockedCount++;
        });

        // Hide YouTube video cards in search results
        document.querySelectorAll('[href*="youtube.com"], [href*="youtu.be"]').forEach(link => {
          // Find the parent card/container element
          let parent = link.closest('div[class*="card"], div[class*="result"], article, section');
          if (!parent) {
            // If no specific card found, try to find the nearest meaningful container
            parent = link.parentElement;
            while (parent && parent.parentElement && parent.parentElement.tagName !== 'BODY') {
              // Look for a container that seems to be a result item
              if (parent.children.length > 1 || parent.querySelector('img, video')) {
                break;
              }
              parent = parent.parentElement;
            }
          }
          if (parent && parent.style.display !== 'none') {
            parent.style.display = 'none';
            blockedCount++;
            this.log('🚫 Hidden YouTube result on Perplexity');
          }
        });

        // Also remove any video elements that might be YouTube related
        document.querySelectorAll('video[src*="youtube"], video[src*="youtu.be"]').forEach(el => {
          el.remove();
          blockedCount++;
        });

        // Remove YouTube thumbnails
        document.querySelectorAll('img[src*="ytimg.com"], img[src*="youtube.com"], img[src*="youtu.be"]').forEach(img => {
          const parent = img.closest('div[class*="card"], div[class*="result"], article, section') || img.parentElement;
          if (parent && parent.style.display !== 'none') {
            parent.style.display = 'none';
            blockedCount++;
          }
        });
        
        if (blockedCount > 0) {
          this.log(`🚫 Blocked ${blockedCount} YouTube elements on Perplexity/Comet`);
        }
      };

      // Multiple aggressive passes for Comet browser compatibility
      nuke(); // Initial pass
      setTimeout(() => nuke(), 500);  // Second pass after 500ms
      setTimeout(() => nuke(), 1000); // Third pass after 1s
      setTimeout(() => nuke(), 2000); // Fourth pass after 2s
      
      // Continuous observation
      const obs = new MutationObserver(() => nuke());
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {
      this.log('⚠️ Error blocking YouTube on Perplexity:', e);
    }
  }

  isSocialMediaSite() {
    const socialKeywords = [
      'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat', 'linkedin',
      'reddit', 'pinterest', 'tumblr', 'discord', 'telegram', 'whatsapp'
    ];
    
    const hostname = window.location.hostname.toLowerCase();
    const title = document.title.toLowerCase();
    
    return socialKeywords.some(keyword => 
      hostname.includes(keyword) || title.includes(keyword)
    );
  }



  // Check if current site is a chat site
  isChatSite() {
    const host = location.hostname;
    this.log('🔍 Checking if site is chat site:', { host, location: location.href });
    
    // Check for various chat site patterns
    const isChat = /chat\.openai\.com$/.test(host) || 
                   /chatgpt\.com$/.test(host) || 
                   /perplexity\.ai$/.test(host) || 
                   /claude\.ai$/.test(host) || 
                   /bard\.google\.com$/.test(host) || 
                   /gemini\.google\.com$/.test(host);
    
    this.log('🤖 Chat site detection result:', isChat);
    return isChat;
  }

  // Enhanced chat query extraction that waits for interface to load
  async extractChatQuery() {
    const host = location.hostname;
    let query = '';
    
    // Wait for chat interface to be fully loaded
    await this.waitForChatInterface();
    
    if (/chat\.openai\.com$/.test(host) || /chatgpt\.com$/.test(host)) {
      // ChatGPT - look for multiple possible selectors
      const selectors = [
        '[data-testid="composer"] textarea',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Send a message"]',
        'textarea',
        'input[type="text"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.value) {
          query = element.value;
          break;
        }
      }
    } else if (/perplexity\.ai$/.test(host)) {
      // Perplexity - look for the main input field
      const selectors = [
        'textarea[placeholder*="Ask anything"]',
        'textarea[placeholder*="Ask"]',
        'textarea',
        'input[type="text"]',
        '[contenteditable="true"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            query = element.value || '';
          } else if (element.contentEditable === 'true') {
            query = element.textContent || '';
          }
          if (query) break;
        }
      }
    } else if (/claude\.ai$/.test(host)) {
      // Claude
      const selectors = [
        'textarea[placeholder*="Message"]',
        'textarea',
        'input[type="text"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.value) {
          query = element.value;
          break;
        }
      }
    } else if (/bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host)) {
      // Google AI
      const selectors = [
        'textarea[placeholder*="Message"]',
        'textarea',
        'input[type="text"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.value) {
          query = element.value;
          break;
        }
      }
    }
    
    this.log('🤖 Chat Query Extracted:', { host, query, length: query.length });
    return query;
  }

  // Wait for chat interface to be ready
  async waitForChatInterface() {
    const host = location.hostname;
    let maxWait = 10000; // 10 seconds max
    let waited = 0;
    const interval = 500; // Check every 500ms
    
    while (waited < maxWait) {
      // Check if chat interface elements exist
      let interfaceReady = false;
      
      if (/perplexity\.ai$/.test(host)) {
        interfaceReady = !!document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
      } else if (/chat\.openai\.com$/.test(host) || /chatgpt\.com$/.test(host)) {
        interfaceReady = !!document.querySelector('textarea, input[type="text"]');
      } else if (/claude\.ai$/.test(host)) {
        interfaceReady = !!document.querySelector('textarea, input[type="text"]');
      } else if (/bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host)) {
        interfaceReady = !!document.querySelector('textarea, input[type="text"]');
      }
      
      if (interfaceReady) {
        this.log('✅ Chat interface ready after', waited, 'ms');
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      waited += interval;
    }
    
    this.log('⚠️ Chat interface not ready after', maxWait, 'ms - proceeding anyway');
  }

  // Chat site topic filter: stricter filtering for chat AI sites
  async enforceChatTopicFilterIfNeeded() {
    if (!this.isChatSite()) return;
    
    this.log('🔒 Chat Site Topic Filter Check (Strict Mode)');
    this.log('🏠 Host:', location.hostname);
    
    const { focusMode, allowedMetadata, currentSession } = await chrome.storage.sync.get(['focusMode', 'allowedMetadata', 'currentSession']);
    
    // If there's an active session, use its metadata instead of the general settings
    const activeMetadata = currentSession?.allowedMetadata || allowedMetadata;
    
    // Check both old 'topics' format and new metadata format
    const topics = (activeMetadata?.topics || []).map(t=>String(t).toLowerCase());
    const titleIncludes = (activeMetadata?.titleIncludes || []).map(t=>String(t).toLowerCase());
    const descriptionIncludes = (activeMetadata?.descriptionIncludes || []).map(t=>String(t).toLowerCase());
    const keywordsIncludes = (activeMetadata?.keywordsIncludes || []).map(t=>String(t).toLowerCase());
    
    this.log('🎯 Focus Mode Active:', focusMode);
    this.log('📋 Active Session:', currentSession?.name || 'None');
    this.log('📋 Allowed Topics:', topics);
    this.log('📋 Allowed Title Keywords:', titleIncludes);
    this.log('📋 Allowed Description Keywords:', descriptionIncludes);
    this.log('📋 Allowed Keywords:', keywordsIncludes);
    
    if (!focusMode || (topics.length === 0 && titleIncludes.length === 0 && descriptionIncludes.length === 0 && keywordsIncludes.length === 0)) {
      this.log('⏭️ Skipping chat topic filter - Focus mode off or no metadata rules');
      return;
    }
    
    const data = await this.extractContentData();
    
    // For chat sites, be more strict - check current query AND page content
    const queryText = data.chatQuery || '';
    const pageText = `${data.title} ${data.description} ${data.textContent}`.toLowerCase();
    
    this.log('🔍 Chat Site Strict Check:');
    this.log('   Current Query:', queryText);
    this.log('   Page Content Preview:', pageText.substring(0, 200) + '...');
    
    // Check if current query matches any metadata rules
    let queryMatches = false;
    if (topics.length > 0) {
      queryMatches = topics.some(t => queryText.toLowerCase().includes(t));
    }
    if (titleIncludes.length > 0) {
      queryMatches = queryMatches || titleIncludes.some(t => queryText.toLowerCase().includes(t));
    }
    if (descriptionIncludes.length > 0) {
      queryMatches = queryMatches || descriptionIncludes.some(t => queryText.toLowerCase().includes(t));
    }
    if (keywordsIncludes.length > 0) {
      queryMatches = queryMatches || keywordsIncludes.some(t => queryText.toLowerCase().includes(t));
    }
    
    this.log('   Query Metadata Match:', queryMatches ? '✅ FOUND' : '❌ NOT FOUND');
    
    // For chat sites, ONLY check the query, not page content
    // Page content should always be allowed initially
    if (queryText.length === 0) {
      this.log('⏭️ No query typed yet - allowing chat site access');
      return;
    }
    
    // Only block if there's a query and it doesn't match
    if (!queryMatches) {
      this.log('🚫 BLOCKING: Chat query does not meet metadata requirements');
      this.blockPage('Focus Session: chat query not allowed');
    } else {
      this.log('✅ ALLOWING: Chat query meets metadata requirements');
    }
  }

  // Enhanced topic filter: check any website content against allowed metadata
  async enforceTopicFilterIfNeeded() {
    const { focusMode, allowedMetadata, currentSession } = await chrome.storage.sync.get(['focusMode', 'allowedMetadata', 'currentSession']);
    
    // If there's an active session, use its metadata instead of the general settings
    const activeMetadata = currentSession?.allowedMetadata || allowedMetadata;
    
    // Check both old 'topics' format and new metadata format
    const topics = (activeMetadata?.topics || []).map(t=>String(t).toLowerCase());
    const titleIncludes = (activeMetadata?.titleIncludes || []).map(t=>String(t).toLowerCase());
    const descriptionIncludes = (activeMetadata?.descriptionIncludes || []).map(t=>String(t).toLowerCase());
    const keywordsIncludes = (activeMetadata?.keywordsIncludes || []).map(t=>String(t).toLowerCase());
    
    if (!focusMode || (topics.length === 0 && titleIncludes.length === 0 && descriptionIncludes.length === 0 && keywordsIncludes.length === 0)) {
      this.log('⏭️ No topic filtering needed - Focus mode off or no metadata rules');
      return; // No filtering needed
    }
    
    // Skip this check for chat sites - they're handled by chat query filter
    if (this.isChatSite()) {
      this.log('🤖 Chat site detected - skipping general metadata check (will check queries instead)');
      return;
    }
    
    this.log('🔒 General Metadata Filter Check (Any Website)');
    this.log('🎯 Focus Mode Active:', focusMode);
    this.log('📋 Active Session:', currentSession?.name || 'None');
    this.log('📋 Allowed Topics:', topics);
    this.log('📋 Allowed Title Keywords:', titleIncludes);
    this.log('📋 Allowed Description Keywords:', descriptionIncludes);
    this.log('📋 Allowed Keywords:', keywordsIncludes);
    
    const data = await this.extractContentData();
    const title = data.title.toLowerCase();
    const description = data.description.toLowerCase();
    const keywords = data.keywords.toLowerCase();
    const textContent = data.textContent.toLowerCase();
    
    this.log('🔍 Checking page content against metadata rules:');
    this.log('   Title:', data.title);
    this.log('   Description:', data.description);
    this.log('   Keywords:', data.keywords);
    this.log('   Text preview:', textContent.substring(0, 200) + '...');
    
    // Check topics (if any)
    let topicMatches = false;
    if (topics.length > 0) {
      topicMatches = topics.some(t => {
        const found = textContent.includes(t);
        this.log(`   Topic "${t}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return found;
      });
    }
    
    // Check title includes (if any)
    let titleMatches = false;
    if (titleIncludes.length > 0) {
      titleMatches = titleIncludes.some(t => {
        const found = title.includes(t);
        this.log(`   Title keyword "${t}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return found;
      });
    }
    
    // Check description includes (if any)
    let descriptionMatches = false;
    if (descriptionIncludes.length > 0) {
      descriptionMatches = descriptionIncludes.some(t => {
        const found = description.includes(t);
        this.log(`   Description keyword "${t}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return found;
      });
    }
    
    // Check keywords includes (if any)
    let keywordsMatches = false;
    if (keywordsIncludes.length > 0) {
      keywordsMatches = keywordsIncludes.some(t => {
        const found = keywords.includes(t);
        this.log(`   Meta keywords "${t}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
        return found;
      });
    }
    
    // Allow if ANY of the metadata rules match
    const allowed = topicMatches || titleMatches || descriptionMatches || keywordsMatches;
    
    this.log('🎯 Metadata Match Results:');
    this.log('   Topics:', topicMatches ? '✅ MATCH' : '❌ NO MATCH');
    this.log('   Title Keywords:', titleMatches ? '✅ MATCH' : '❌ NO MATCH');
    this.log('   Description Keywords:', descriptionMatches ? '✅ MATCH' : '❌ NO MATCH');
    this.log('   Meta Keywords:', keywordsMatches ? '✅ MATCH' : '❌ NO MATCH');
    this.log('🎯 Final Result:', allowed ? '✅ ALLOWED' : '❌ BLOCKED');
    
    if (!allowed) {
      this.log('🚫 BLOCKING: Page content does not match any allowed metadata rules');
      this.blockPage('Focus Session: content does not match allowed metadata');
    } else {
      this.log('✅ ALLOWING: Page content matches focus session metadata rules');
    }
  }

  // NEW: Comprehensive movie content detection and blocking
  checkForMovieContent(contentData) {
    const url = (contentData.url || '').toLowerCase();
    const title = (contentData.title || '').toLowerCase();
    const description = (contentData.description || '').toLowerCase();
    const keywords = (contentData.keywords || '').toLowerCase();
    const textContent = (contentData.textContent || '').toLowerCase();
    
    // Comprehensive list of movie-related keywords and patterns
    const movieKeywords = [
      // Movie streaming sites (exact matches)
      '123movies', 'putlocker', 'soap2day', 'gomovies', 'fmovies',
      
      // Movie/film terms (exact matches)
      'movie', 'movies', 'film', 'films',
          
      // Movie-related phrases (exact matches)
      'watch online', 'free movies', 'hd movies', 'full movie',
      'movie', 'film',
      'movie download', 'film download', 'torrent',
          
      // Common movie site patterns (exact matches)
      'fullmoviess', 'moviesto', 'watchmovies', 'freemovies', 'hdmovies',
      'streamingmovies', 'moviehub', 'filmhub', 'cinemahub',
      
      // Common movie site domains (exact matches)
      'movie4k', 'moviehd', 'moviehub', 'filmhub', 'cinemahub'
    ];
    
    // Helper function to check for word boundaries to prevent false positives
    const hasWordBoundary = (text, keyword) => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(text);
    };
    
    // Check URL for movie patterns
    const urlHasMovieContent = movieKeywords.some(keyword => url.includes(keyword));
    if (urlHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => url.includes(k));
      this.log('🚫 MOVIE DETECTED IN URL:', { 
        url, 
        matchedKeyword,
        context: url.substring(Math.max(0, url.indexOf(matchedKeyword) - 20), url.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Movie streaming site detected in URL: "${matchedKeyword}"`,
        matchedPattern: 'URL contains movie-related keywords'
      };
    }
    
    // Check title for movie patterns
    const titleHasMovieContent = movieKeywords.some(keyword => title.includes(keyword));
    if (titleHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => title.includes(k));
      this.log('🚫 MOVIE DETECTED IN TITLE:', { 
        title, 
        matchedKeyword,
        context: title.substring(Math.max(0, title.indexOf(matchedKeyword) - 20), title.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Movie content detected in page title: "${matchedKeyword}"`,
        matchedPattern: 'Title contains movie-related keywords'
      };
    }
    
    // Check description for movie patterns
    const descriptionHasMovieContent = movieKeywords.some(keyword => description.includes(keyword));
    if (descriptionHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => description.includes(k));
      this.log('🚫 MOVIE DETECTED IN DESCRIPTION:', { 
        description, 
        matchedKeyword,
        context: description.substring(Math.max(0, description.indexOf(matchedKeyword) - 30), description.indexOf(matchedKeyword) + matchedKeyword.length + 30)
      });
      return {
        shouldBlock: true,
        reason: `Movie content detected in page description: "${matchedKeyword}"`,
        matchedPattern: 'Description contains movie-related keywords'
      };
    }
    
    // Check keywords for movie patterns
    const keywordsHasMovieContent = movieKeywords.some(keyword => keywords.includes(keyword));
    if (keywordsHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => keywords.includes(k));
      this.log('🚫 MOVIE DETECTED IN KEYWORDS:', { 
        keywords, 
        matchedKeyword,
        context: keywords.substring(Math.max(0, keywords.indexOf(matchedKeyword) - 20), keywords.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Movie content detected in page keywords: "${matchedKeyword}"`,
        matchedPattern: 'Keywords contain movie-related terms'
      };
    }
    
    // Check text content for movie patterns (with word boundary checking for common terms)
    const textContentHasMovieContent = movieKeywords.some(keyword => {
      // For common words like "stream", use word boundary checking
      const commonWords = ['movies', 'film'];
      if (commonWords.includes(keyword)) {
        return hasWordBoundary(textContent, keyword);
      }
      // For specific terms like "123movies", "netflix", etc., use simple includes
      return textContent.includes(keyword);
    });
    
    if (textContentHasMovieContent) {
      const matchedKeyword = movieKeywords.find(k => {
        const commonWords = ['movies', 'film', 'films'];
        if (commonWords.includes(k)) {
          return hasWordBoundary(textContent, k);
        }
        return textContent.includes(k);
      });
      
      this.log('🚫 MOVIE DETECTED IN TEXT CONTENT:', { 
        textPreview: textContent.substring(0, 200), 
        matchedKeyword,
        context: textContent.substring(Math.max(0, textContent.indexOf(matchedKeyword) - 30), textContent.indexOf(matchedKeyword) + matchedKeyword.length + 30)
      });
      return {
        shouldBlock: true,
        reason: `Movie content detected in page text: "${matchedKeyword}"`,
        matchedPattern: 'Page content contains movie-related keywords'
      };
    }
    
    if (contentData.hasVideoElements && (urlHasMovieContent || titleHasMovieContent || descriptionHasMovieContent)) {
      this.log('🚫 VIDEO ELEMENTS WITH MOVIE CONTEXT DETECTED');
      return {
        shouldBlock: true,
        reason: 'Video streaming content detected',
        matchedPattern: 'Video elements with movie-related context'
      };
    }
    
    this.log('✅ No movie content detected - allowing page');
    return {
      shouldBlock: false,
      reason: 'No movie content detected'
    };
  }

  // NEW: Comprehensive vulgar content detection and blocking
  checkForVulgarContent(contentData) {
    const url = (contentData.url || '').toLowerCase();
    const title = (contentData.title || '').toLowerCase();
    const description = (contentData.description || '').toLowerCase();
    const keywords = (contentData.keywords || '').toLowerCase();
    const textContent = (contentData.textContent || '').toLowerCase();
    
    // Comprehensive list of vulgar/inappropriate keywords and patterns
    const vulgarKeywords = [
      // Explicit vulgar terms (exact matches)
      'pussy', 'vagina',
      
      // Adult content terms (exact matches)
      'porn', 'pornhub', 'xhamster', 'xvideos', 'redtube', 'youporn',
      'adult', 'sex', 'sexual', 'nude', 'naked', 'nudity', 'erotic',
      
      // Inappropriate content patterns (exact matches)
      'xxx', 'x-rated', 'adult content', 'mature content', 'explicit',
      'nsfw', 'not safe for work', 'adult site',
      
      // Common vulgar site patterns (exact matches)
      'pornhub', 'xhamster', 'xvideos', 'redtube', 'youporn', 'tube8',
      'adultfriendfinder', 'ashleymadison', 'adult dating',
      
      // File extensions for adult content (exact matches)
      '.xxx', '.adult', '.porn', '.sex'
    ];
    
    // Helper function to check for word boundaries to prevent false positives
    const hasWordBoundary = (text, keyword) => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(text);
    };
    
    // Check URL for vulgar patterns
    const urlHasVulgarContent = vulgarKeywords.some(keyword => url.includes(keyword));
    if (urlHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => url.includes(k));
      this.log('🚫 VULGAR DETECTED IN URL:', { 
        url, 
        matchedKeyword,
        context: url.substring(Math.max(0, url.indexOf(matchedKeyword) - 20), url.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in URL: "${matchedKeyword}"`,
        matchedPattern: 'URL contains vulgar keywords'
      };
    }
    
    // Check title for vulgar patterns
    const titleHasVulgarContent = vulgarKeywords.some(keyword => title.includes(keyword));
    if (titleHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => title.includes(k));
      this.log('🚫 VULGAR DETECTED IN TITLE:', { 
        title, 
        matchedKeyword,
        context: title.substring(Math.max(0, title.indexOf(matchedKeyword) - 20), title.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in page title: "${matchedKeyword}"`,
        matchedPattern: 'Title contains vulgar keywords'
      };
    }
    
    // Check description for vulgar patterns
    const descriptionHasVulgarContent = vulgarKeywords.some(keyword => description.includes(keyword));
    if (descriptionHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => description.includes(k));
      this.log('🚫 VULGAR DETECTED IN DESCRIPTION:', { 
        description, 
        matchedKeyword,
        context: description.substring(Math.max(0, description.indexOf(matchedKeyword) - 30), description.indexOf(matchedKeyword) + matchedKeyword.length + 30)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in page description: "${matchedKeyword}"`,
        matchedPattern: 'Description contains vulgar keywords'
      };
    }
    
    // Check keywords for vulgar patterns
    const keywordsHasVulgarContent = vulgarKeywords.some(keyword => keywords.includes(keyword));
    if (keywordsHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => keywords.includes(k));
      this.log('🚫 VULGAR DETECTED IN KEYWORDS:', { 
        keywords, 
        matchedKeyword,
        context: keywords.substring(Math.max(0, keywords.indexOf(matchedKeyword) - 20), keywords.indexOf(matchedKeyword) + matchedKeyword.length + 20)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in page keywords: "${matchedKeyword}"`,
        matchedPattern: 'Keywords contain vulgar terms'
      };
    }
    
    // Check text content for vulgar patterns (with word boundary checking for common terms)
    const textContentHasVulgarContent = vulgarKeywords.some(keyword => {
      // For common words like "sex", "adult", "nude", use word boundary checking
      const commonWords = ['sex', 'adult', 'nude', 'naked', 'erotic', 'mature', 'explicit'];
      if (commonWords.includes(keyword)) {
        return hasWordBoundary(textContent, keyword);
      }
      // For specific terms like "pornhub", "fuck", etc., use simple includes
      return textContent.includes(keyword);
    });
    
    if (textContentHasVulgarContent) {
      const matchedKeyword = vulgarKeywords.find(k => {
        const commonWords = ['sex', 'adult', 'nude', 'naked', 'erotic', 'mature', 'explicit'];
        if (commonWords.includes(k)) {
          return hasWordBoundary(textContent, k);
        }
        return textContent.includes(k);
      });
      
      this.log('🚫 VULGAR DETECTED IN TEXT CONTENT:', { 
        textPreview: textContent.substring(0, 200), 
        matchedKeyword,
        context: textContent.substring(Math.max(0, textContent.indexOf(matchedKeyword) - 30), textContent.indexOf(matchedKeyword) + matchedKeyword.length + 30)
      });
      return {
        shouldBlock: true,
        reason: `Vulgar content detected in page text: "${matchedKeyword}"`,
        matchedPattern: 'Page content contains vulgar keywords'
      };
    }
    
    this.log('✅ No vulgar content detected - allowing page');
    return {
      shouldBlock: false,
      reason: 'No vulgar content detected'
    };
  }

  blockPage(reason) {
    // Create block overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div style="max-width: 600px;">
        <div style="font-size: 80px; margin-bottom: 20px;">🚫</div>
        <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: 300;">Stay Focused!</h1>
        <p style="font-size: 24px; margin-bottom: 30px; opacity: 0.9;">
          This site has been blocked to help you stay productive.
        </p>
        <div style="margin-bottom: 30px;">
          <p style="font-size: 16px; margin-bottom: 15px;">Try these productive alternatives instead:</p>
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <a href="https://stackoverflow.com" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; transition: all 0.3s;">📚 Stack Overflow</a>
            <a href="https://github.com" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; transition: all 0.3s;">💻 GitHub</a>
            <a href="https://coursera.org" style="color: white; text-decoration: none; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 25px; transition: all 0.3s;">🎓 Coursera</a>
          </div>
        </div>
        <div style="display:flex; gap:10px; justify-content:center;">
        <button id="closeBlocker" style="
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          color: white;
          padding: 12px 30px;
          font-size: 16px;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          I understand, take me back
        </button>
        <button id="requestBypass" style="
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          color: white;
          padding: 12px 30px;
          font-size: 16px;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
          Request 5-min bypass
        </button>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(overlay);

    // Hide original content
    document.body.style.overflow = 'hidden';

    // Handle close button
    document.getElementById('closeBlocker').addEventListener('click', () => {
      window.history.back();
    });

    // Handle temporary bypass with justification
    document.getElementById('requestBypass').addEventListener('click', async () => {
      const justification = prompt('Briefly justify why you need temporary access (will be evaluated)');
      if (!justification) return;
      try {
        const res = await chrome.runtime.sendMessage({ action: 'requestBypass', justification });
        if (res && res.approved) {
          overlay.remove();
          document.body.style.overflow = '';
        } else {
          alert('Bypass denied. Stay focused.');
        }
      } catch (e) {}
    });

    // Also hide the original page content
    const originalContent = document.querySelectorAll('body > *:not([style*="z-index: 999999"])');
    originalContent.forEach(element => {
      if (element !== overlay) {
        element.style.display = 'none';
      }
    });
  }
}

// Initialize content analyzer
new ContentAnalyzer();

// Listen for messages from dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCurrentPage') {
    const contentData = window.contentAnalyzer.extractContentData();
    sendResponse({ contentData });
  }
  return true; // Keep message channel open for async response
}); 