// AI Productivity Guardian - Content Script

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

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.analyzeContent());
    } else {
      this.analyzeContent();
    }
  }

  async analyzeContent() {
    // Prevent multiple analyses
    if (this.analyzed) return;
    this.analyzed = true;

    try {
      // Skip if already on block page
      if (window.location.href.includes('block-page.html')) {
        return;
      }

      // Load focus mode settings
      const cfg = await chrome.storage.sync.get(['focusMode', 'allowedMetadata']);
      this.focusMode = !!cfg.focusMode;
      if (cfg.allowedMetadata) this.allowedMetadata = cfg.allowedMetadata;

      // Apply inline YouTube block on Google Search (videos tab and SERP inline players)
      this.blockInlineYouTubeOnGoogle();

      // Wait a bit for content to load
      setTimeout(async () => {
        const contentData = this.extractContentData();
        
        // If focus mode is ON, enforce allow-by-metadata first
        if (this.focusMode && !this.matchesAllowedMetadata(contentData)) {
          const reason = 'Focus Session: site does not match allowed metadata';
          this.blockPage(reason);
          return;
        }

        // Hybrid approach: Both chat-specific and general topic filtering
        
        // 1. Chat site topic filter (stricter - only allows specific query topics)
        await this.enforceChatTopicFilterIfNeeded();
        
        // 2. General website topic filter (broader - allows any page with relevant content)
        await this.enforceTopicFilterIfNeeded();

        // Send to background script for AI analysis
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeContent',
          data: contentData
        });

        if (response && response.shouldBlock) {
          // Block the page by replacing content
          this.blockPage(response.reason);
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

    const titleOk = titleIncludes.length === 0 || titleIncludes.some(k => title.includes(k.toLowerCase()));
    const descOk = descriptionIncludes.length === 0 || descriptionIncludes.some(k => description.includes(k.toLowerCase()));
    const keyOk = keywordsIncludes.length === 0 || keywordsIncludes.some(k => keywords.includes(k.toLowerCase()));

    return titleOk && descOk && keyOk;
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
    console.log('🔍 AI Productivity Guardian - Content Analysis');
    console.log('📍 URL:', data.url);
    console.log('📝 Title:', data.title);

    // Extract meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      data.description = metaDescription.getAttribute('content') || '';
    }
    console.log('📄 Meta Description:', data.description);

    // Extract meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      data.keywords = metaKeywords.getAttribute('content') || '';
    }
    console.log('🏷️ Meta Keywords:', data.keywords);

    // Extract Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogType = document.querySelector('meta[property="og:type"]');
    
    if (ogTitle) data.title = ogTitle.getAttribute('content') || data.title;
    if (ogDescription) data.description = ogDescription.getAttribute('content') || data.description;
    if (ogType) data.ogType = ogType.getAttribute('content') || '';
    
    console.log('🔗 Open Graph Title:', ogTitle?.getAttribute('content') || 'None');
    console.log('🔗 Open Graph Description:', ogDescription?.getAttribute('content') || 'None');
    console.log('🔗 Open Graph Type:', ogType?.getAttribute('content') || 'None');

    // Extract text content (first 1000 characters)
    const bodyText = document.body ? document.body.innerText : '';
    data.textContent = bodyText.substring(0, 1000);
    console.log('📖 Text Content Preview:', data.textContent.substring(0, 200) + '...');

    // Chat site guards: capture the current query/topic heuristically
    const host = location.hostname;
    if (/chat\.openai\.com$/.test(host)) {
      const q = document.querySelector('[data-testid="composer"] textarea, textarea')?.value || '';
      data.chatQuery = q;
      console.log('🤖 ChatGPT Query:', q || 'No active query');
    } else if (/perplexity\.ai$/.test(host)) {
      const q = document.querySelector('textarea, input[name="q"]')?.value || '';
      data.chatQuery = q;
      console.log('🔍 Perplexity Query:', q || 'No active query');
    } else if (/claude\.ai$/.test(host)) {
      const q = document.querySelector('textarea')?.value || '';
      data.chatQuery = q;
      console.log('🧠 Claude Query:', q || 'No active query');
    } else if (/bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host)) {
      const q = document.querySelector('textarea, input[type="text"]')?.value || '';
      data.chatQuery = q;
      console.log('🌐 Google AI Query:', q || 'No active query');
    }

    // Look for streaming/entertainment indicators
    data.hasVideoElements = document.querySelectorAll('video').length > 0;
    data.hasStreamingKeywords = this.hasStreamingKeywords(data.title + ' ' + data.description + ' ' + data.textContent);
    
    console.log('🎥 Video Elements:', data.hasVideoElements);
    console.log('🎬 Streaming Keywords Detected:', data.hasStreamingKeywords);

    // Check for social media patterns
    data.isSocialMedia = this.isSocialMediaSite();
    console.log('📱 Social Media Detected:', data.isSocialMedia);

    // Check for entertainment/movie patterns
    data.isEntertainment = this.isEntertainmentSite();
    console.log('🎭 Entertainment Detected:', data.isEntertainment);

    console.log('📊 Final Extracted Data:', data);
    console.log('🔍 AI Productivity Guardian - Content Analysis Complete');
    console.log('─'.repeat(50));
    return data;
  }

  // Filter Google search results based on focus topics
  async filterGoogleSearchResults() {
    try {
      const { allowedMetadata } = await chrome.storage.sync.get(['allowedMetadata']);
      const topics = (allowedMetadata?.topics || []).map(t => String(t).toLowerCase());
      
      if (topics.length === 0) return;
      
      console.log('🔍 Filtering Google search results for topics:', topics);
      
      // Get all search result cards
      const searchResults = document.querySelectorAll('div[data-ved], div[jscontroller], div[jsaction]');
      
      searchResults.forEach((result, index) => {
        const title = result.querySelector('h3, a[role="heading"]')?.textContent || '';
        const snippet = result.querySelector('div[data-content-feature="1"], span[data-ved]')?.textContent || '';
        const text = `${title} ${snippet}`.toLowerCase();
        
        // Check if result contains any allowed topics
        const matches = topics.some(topic => text.includes(topic));
        
        if (!matches) {
          // Hide results that don't match topics
          result.style.display = 'none';
          console.log(`🚫 Hidden result ${index + 1}: "${title.substring(0, 50)}..." - No topic match`);
        } else {
          console.log(`✅ Showing result ${index + 1}: "${title.substring(0, 50)}..." - Topic match found`);
        }
      });
      
      console.log('🔍 Google search filtering complete');
    } catch (error) {
      console.error('Error filtering Google results:', error);
    }
  }

  blockInlineYouTubeOnGoogle() {
    try {
      const isGoogle = /(^|\.)google\.(com|[a-z]{2,3})(\.[a-z]{2})?$/.test(location.hostname);
      if (!isGoogle) return;

      console.log('🔍 Google Search Detected - Applying Enhanced Blocking');

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

  // Chat site topic filter: stricter filtering for chat AI sites
  async enforceChatTopicFilterIfNeeded() {
    const host = location.hostname;
    const isChatSite = /chat\.openai\.com$/.test(host) || /perplexity\.ai$/.test(host) || /claude\.ai$/.test(host) || /bard\.google\.com$/.test(host) || /gemini\.google\.com$/.test(host);
    if (!isChatSite) return;
    
    console.log('🔒 Chat Site Topic Filter Check (Strict Mode)');
    console.log('🏠 Host:', host);
    
    const { focusMode, allowedMetadata } = await chrome.storage.sync.get(['focusMode', 'allowedMetadata']);
    const topics = (allowedMetadata?.topics || []).map(t=>String(t).toLowerCase());
    
    console.log('🎯 Focus Mode Active:', focusMode);
    console.log('📋 Allowed Topics:', topics);
    
    if (!focusMode || topics.length === 0) {
      console.log('⏭️ Skipping chat topic filter - Focus mode off or no topics');
      return;
    }
    
    const data = this.extractContentData();
    
    // For chat sites, be more strict - check current query AND page content
    const queryText = data.chatQuery || '';
    const pageText = `${data.title} ${data.description} ${data.textContent}`.toLowerCase();
    
    console.log('🔍 Chat Site Strict Check:');
    console.log('   Current Query:', queryText);
    console.log('   Page Content Preview:', pageText.substring(0, 200) + '...');
    
    // Check if current query matches topics
    const queryMatches = topics.some(t => queryText.toLowerCase().includes(t));
    console.log('   Query Topic Match:', queryMatches ? '✅ FOUND' : '❌ NOT FOUND');
    
    // Check if page content matches topics
    const contentMatches = topics.some(t => pageText.includes(t));
    console.log('   Content Topic Match:', contentMatches ? '✅ FOUND' : '❌ NOT FOUND');
    
    // For chat sites, require BOTH query AND content to match (stricter)
    const allowed = queryMatches && contentMatches;
    console.log('🎯 Chat Site Result:', allowed ? '✅ ALLOWED' : '❌ BLOCKED');
    
    if (!allowed) {
      console.log('🚫 BLOCKING: Chat site does not meet strict topic requirements');
      this.blockPage('Focus Session: chat site content/query not allowed');
    } else {
      console.log('✅ ALLOWING: Chat site meets strict topic requirements');
    }
  }

  // Enhanced topic filter: check any website content against allowed topics
  async enforceTopicFilterIfNeeded() {
    const { focusMode, allowedMetadata } = await chrome.storage.sync.get(['focusMode', 'allowedMetadata']);
    const topics = (allowedMetadata?.topics || []).map(t=>String(t).toLowerCase());
    
    if (!focusMode || topics.length === 0) {
      return; // No filtering needed
    }
    
    console.log('🔒 General Topic Filter Check (Any Website)');
    console.log('🎯 Focus Mode Active:', focusMode);
    console.log('📋 Allowed Topics:', topics);
    
    const data = this.extractContentData();
    const text = `${data.title} ${data.description} ${data.textContent} ${data.chatQuery||''}`.toLowerCase();
    
    console.log('🔍 Checking page content against topics:');
    console.log('   Title:', data.title);
    console.log('   Description:', data.description);
    console.log('   Text preview:', text.substring(0, 200) + '...');
    
    const matches = topics.some(t => {
      const found = text.includes(t);
      console.log(`   Topic "${t}": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
      return found;
    });
    
    console.log('🎯 General Topic Match Result:', matches ? '✅ ALLOWED' : '❌ BLOCKED');
    
    if (!matches) {
      console.log('🚫 BLOCKING: Page content does not match allowed topics');
      this.blockPage('Focus Session: content does not match allowed topics');
    } else {
      console.log('✅ ALLOWING: Page content matches focus session topics');
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