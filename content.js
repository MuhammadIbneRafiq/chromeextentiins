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

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyzeContent());
    } else {
      this.analyzeContent();
    }

    // Set up debug message listener
    this.setupDebugListener();
    
    // Log initialization
    this.log('🚀 Content Analyzer initialized');
  }

  // Enhanced logging that will be visible in regular console
  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[AI Guardian ${timestamp}] ${message}`;
    
    // Content script console (blocked page)
    console.log(logMessage, data || '');
    
    // Also log to regular browser console for visibility
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

      // Wait a bit for content to load
      setTimeout(async () => {
        const contentData = this.extractContentData();
        
        // If focus mode is ON, enforce allow-by-metadata first
        if (this.focusMode) {
          this.log('🎯 Focus Mode Active - Checking metadata rules...');
          this.log('📋 Current metadata rules:', this.allowedMetadata);
          
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
        } else {
          this.log('⏭️ Focus mode not active - skipping metadata check');
        }

        // Hybrid approach: Both chat-specific and general topic filtering
        
        // 1. Chat site topic filter (stricter - only allows specific query topics)
        // Wait longer for chat sites to load content
        if (this.isChatSite()) {
          this.log('🤖 Chat site detected - waiting for full page load...');
          // Wait much longer for chat sites to be fully interactive
          setTimeout(() => this.enforceChatTopicFilterIfNeeded(), 80000); // Wait 80 seconds
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

  extractContentData() {
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
    if (/chat\.openai\.com$/.test(host)) {
      const q = document.querySelector('[data-testid="composer"] textarea, textarea')?.value || '';
      data.chatQuery = q;
      this.log('🤖 ChatGPT Query:', q || 'No active query');
    } else if (/perplexity\.ai$/.test(host)) {
      const q = document.querySelector('textarea, input[name="q"]')?.value || '';
      data.chatQuery = q;
      this.log('🔍 Perplexity Query:', q || 'No active query');
    } else if (/claude\.ai$/.test(host)) {
      const q = document.querySelector('textarea')?.value || '';
      data.chatQuery = q;
      this.log('🧠 Claude Query:', q || 'No active query');
    } else if (/bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host)) {
      const q = document.querySelector('textarea, input[type="text"]')?.value || '';
      data.chatQuery = q;
      this.log('🌐 Google AI Query:', q || 'No active query');
    }

    // Look for streaming/entertainment indicators
    data.hasVideoElements = document.querySelectorAll('video').length > 0;
    data.hasStreamingKeywords = this.hasStreamingKeywords(data.title + ' ' + data.description + ' ' + data.textContent);
    
    this.log('🎥 Video Elements:', data.hasVideoElements);
    this.log('🎬 Streaming Keywords Detected:', data.hasStreamingKeywords);

    // Check for social media patterns
    data.isSocialMedia = this.isSocialMediaSite();
    this.log('📱 Social Media Detected:', data.isSocialMedia);

    // Check for entertainment/movie patterns
    data.isEntertainment = this.isEntertainmentSite();
    this.log('🎭 Entertainment Detected:', data.isEntertainment);

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
      attributeFilter: ['value', 'textContent']
    });
    
    // Also check periodically for safety
    setInterval(() => {
      this.checkChatQueryChange();
    }, 2000); // Check every 2 seconds
  }

  // Check if chat query has changed and re-evaluate
  async checkChatQueryChange() {
    try {
      const { focusMode, currentSession } = await chrome.storage.sync.get(['focusMode', 'currentSession']);
      if (!focusMode || !currentSession) return;
    
      const data = this.extractContentData();
      const queryText = data.chatQuery || '';
      
      if (queryText.length > 10) { // Only check if there's a substantial query
        this.log('🔍 Chat query changed, re-evaluating:', queryText.substring(0, 50) + '...');
        
        const activeMetadata = currentSession?.allowedMetadata || {};
        
        // Check both old 'topics' format and new metadata format
        const topics = (activeMetadata?.topics || []).map(t => String(t).toLowerCase());
        const titleIncludes = (activeMetadata?.titleIncludes || []).map(t => String(t).toLowerCase());
        const descriptionIncludes = (activeMetadata?.descriptionIncludes || []).map(t => String(t).toLowerCase());
        const keywordsIncludes = (activeMetadata?.keywordsIncludes || []).map(t => String(t).toLowerCase());
        
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
        
        if (!queryMatches) {
          this.log('🚫 Chat query does not match allowed metadata, blocking...');
          this.blockPage('Focus Session: chat query not allowed');
        } else {
          this.log('✅ Chat query matches allowed metadata');
        }
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

  hasStreamingKeywords(text) {
    const streamingKeywords = [
      'watch', 'stream', 'movie', 'film', 'tv show', 'series', 'episode',
      'cinema', 'trailer', 'video', 'play now', 'watch online', 'free movies',
      'download', 'torrent', 'seasons', 'netflix', 'hulu', 'prime video'
    ];
    
    const lowerText = text.toLowerCase();
    return streamingKeywords.some(keyword => lowerText.includes(keyword));
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

  isEntertainmentSite() {
    const entertainmentKeywords = [
      'sflix', 'movie', 'cinema', 'film', 'entertainment', 'gaming',
      'game', 'meme', 'funny', 'viral', 'celebrity', 'gossip'
    ];
    
    const hostname = window.location.hostname.toLowerCase();
    const title = document.title.toLowerCase();
    const description = (document.querySelector('meta[name="description"]')?.getAttribute('content') || '').toLowerCase();
    
    return entertainmentKeywords.some(keyword => 
      hostname.includes(keyword) || title.includes(keyword) || description.includes(keyword)
    );
  }

  // Check if current site is a chat site
  isChatSite() {
    const host = location.hostname;
    return /chat\.openai\.com$/.test(host) || /perplexity\.ai$/.test(host) || /claude\.ai$/.test(host) || /bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host);
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
    
    const data = this.extractContentData();
    
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
    
    // Check if page content matches any metadata rules
    let contentMatches = false;
    if (topics.length > 0) {
      contentMatches = topics.some(t => pageText.includes(t));
    }
    if (titleIncludes.length > 0) {
      contentMatches = contentMatches || titleIncludes.some(t => pageText.includes(t));
    }
    if (descriptionIncludes.length > 0) {
      contentMatches = contentMatches || descriptionIncludes.some(t => pageText.includes(t));
    }
    if (keywordsIncludes.length > 0) {
      contentMatches = contentMatches || keywordsIncludes.some(t => pageText.includes(t));
    }
    
    this.log('   Content Metadata Match:', contentMatches ? '✅ FOUND' : '❌ NOT FOUND');
    
    // For chat sites, be more lenient - allow if EITHER query OR content matches
    // This prevents blocking when you're just starting to type
    const allowed = queryMatches || contentMatches;
    this.log('🎯 Chat Site Result:', allowed ? '✅ ALLOWED' : '❌ BLOCKED');
    
    if (!allowed) {
      this.log('🚫 BLOCKING: Chat site does not meet metadata requirements');
      this.blockPage('Focus Session: chat site content/query not allowed');
    } else {
      this.log('✅ ALLOWING: Chat site meets metadata requirements');
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
    
    this.log('🔒 General Metadata Filter Check (Any Website)');
    this.log('🎯 Focus Mode Active:', focusMode);
    this.log('📋 Active Session:', currentSession?.name || 'None');
    this.log('📋 Allowed Topics:', topics);
    this.log('📋 Allowed Title Keywords:', titleIncludes);
    this.log('📋 Allowed Description Keywords:', descriptionIncludes);
    this.log('📋 Allowed Keywords:', keywordsIncludes);
    
    const data = this.extractContentData();
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
        <p style="font-size: 24px; margin-bottom: 20px; opacity: 0.9;">
          This site has been blocked to help you stay productive.
        </p>
        <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.7;">
          Reason: ${reason}
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