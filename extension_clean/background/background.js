/**
 * Clean background script with proper environment variable loading
 * NO HARDCODED API KEYS - EVER!
 */

class ProductivityGuardian {
  constructor() {
    // NO HARDCODED API KEYS - Load from environment or user input
    this.groqApiKey = null;
    this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.isEnabled = true;
    this.blockedSites = [
      'sflix.to', 'netflix.com', 'youtube.com', 'facebook.com', 'instagram.com', 'tiktok.com',
      '123movies', 'putlocker', 'soap2day', 'gomovies', 'fmovies',
      'fullmoviess.net', 'moviesto', 'watchmovies', 'freemovies', 'hdmovies',
      'streamingmovies', 'moviehub', 'filmhub', 'cinemahub', 'movie4k', 'moviehd',
      'hulu.com', 'disneyplus.com', 'hbomax.com', 'peacock.com', 'paramountplus.com',
      'appletv.com', 'crunchyroll.com', 'funimation.com', 'vudu.com',
      'linkedin.com',
      // Adult/vulgar sites
      'pornhub.com', 'xhamster.com', 'xvideos.com', 'redtube.com', 'youporn.com', 'tube8.com',
      'adultfriendfinder.com', 'ashleymadison.com', 'adultdating.com', 'hookup.com',
      'blacked.com', 'tushy.com', 'vixen.com'
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
    this.currentSession = null;
    this.sessionTimerId = null;
    this.focusLockEndTime = null;
    
    // Focus Long mode settings
    this.focusLongMode = false;
    this.focusLongTopics = [];
    this.semanticThreshold = 0.7;
    this.debugMode = true;
    
    // Advanced AI Analysis
    this.advancedAI = null;
    this.useAdvancedAnalysis = false;
    this.userContext = {
      browsingHistory: [],
      timePatterns: {},
      preferences: {}
    };
    
    // Focus Analytics
    this.focusAnalytics = null;
    this.focusAnalyticsActive = false;
    this.currentFocusSession = null;
    
    this.init();
  }

  // Enhanced logging
  log(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[AI Guardian ${timestamp}] ${message}`;
    
    console.log(logMessage, data || '');
    
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

  async init() {
    // Load settings from storage
    const result = await chrome.storage.sync.get(['groqApiKey', 'isEnabled', 'blockedSites', 'allowedSites', 'focusMode', 'allowedMetadata', 'focusLock', 'focusLockEndTime', 'currentSession', 'focusLongMode', 'focusLongTopics', 'semanticThreshold', 'useAdvancedAnalysis', 'userContext']);
    if (result.groqApiKey) this.groqApiKey = result.groqApiKey;
    
    // Try to load API key from environment variables (development only)
    if (!this.groqApiKey) {
      try {
        // Import environment loader
        const { getEnv } = await import('../utils/env-loader.js');
        const envApiKey = getEnv('groq_api_key');
        
        if (envApiKey && envApiKey.startsWith('gsk_')) {
          this.groqApiKey = envApiKey;
          this.log('🔑 Loaded API key from environment variables');
        }
      } catch (error) {
        this.log('⚠️ Could not load API key from environment:', error.message);
      }
    }
    
    if (result.isEnabled !== undefined) this.isEnabled = result.isEnabled;
    if (result.blockedSites) this.blockedSites = result.blockedSites;
    if (result.allowedSites) this.allowedSites = result.allowedSites;
    if (result.focusMode !== undefined) this.focusMode = result.focusMode;
    if (result.allowedMetadata) this.allowedMetadata = result.allowedMetadata;
    this.focusLock = !!result.focusLock;
    if (result.focusLockEndTime) this.focusLockEndTime = result.focusLockEndTime;
    
    // Load Focus Long settings
    if (result.focusLongMode !== undefined) this.focusLongMode = result.focusLongMode;
    if (result.focusLongTopics) this.focusLongTopics = result.focusLongTopics;
    if (result.semanticThreshold) this.semanticThreshold = result.semanticThreshold;

    // Load Focus Analytics settings
    if (result.focusAnalyticsActive !== undefined) this.focusAnalyticsActive = result.focusAnalyticsActive;

    // Load Advanced Analysis settings
    if (result.useAdvancedAnalysis !== undefined) this.useAdvancedAnalysis = result.useAdvancedAnalysis;
    if (result.userContext) this.userContext = { ...this.userContext, ...result.userContext };

    if (result.currentSession) {
      this.currentSession = result.currentSession;
      this.refreshSessionState?.();
    }

    // Initialize Advanced AI Analyzer
    if (this.groqApiKey && this.useAdvancedAnalysis) {
      try {
        const { AdvancedAIAnalyzer } = await import('../analytics/advanced-ai-analysis.js');
        this.advancedAI = new AdvancedAIAnalyzer(this.groqApiKey, this.groqApiUrl);
        this.log('🧠 Advanced AI Analyzer initialized');
      } catch (error) {
        this.log('⚠️ Failed to initialize Advanced AI Analyzer:', error.message);
        this.useAdvancedAnalysis = false;
      }
    }

    // Set up listeners
    this.setupListeners();
    
    // Check API connection if key exists
    if (this.groqApiKey) {
      this.checkApiConnection();
    }
    
    this.log(`AI Productivity Guardian v${this.version} initialized`);
    this.logBlockingKeywordLists();
    
    // Check if focus lock should auto-expire
    this.checkFocusLockExpiry();
    
    // Initialize extension monitoring to prevent disabling
    this.initExtensionMonitoring();

    // Check incognito/private access and warn if disabled
    this.checkIncognitoAccess();
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
        if (request.action === 'analyzeContent') {
          const result = await this.analyzeContentWithAI(request.data);
          sendResponse(result);
        } else if (request.action === 'updateSettings') {
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
        } else if (request.action === 'checkApiStatus') {
          await this.checkApiConnection();
          sendResponse({ working: this.apiWorking, lastCheck: this.lastApiCheck });
        } else if (request.action === 'getAmsterdamHour') {
          try {
            const hour = await this.getAmsterdamHour();
            sendResponse({ hour });
          } catch (e) {
            sendResponse({ error: String(e) });
          }
        } else if (request.action === 'startFocusAnalytics') {
          const success = await this.startFocusAnalytics(request.config || {});
          sendResponse({ success, status: success ? 'started' : 'already_running' });
        } else if (request.action === 'stopFocusAnalytics') {
          const report = await this.stopFocusAnalytics();
          sendResponse({ success: true, report });
        } else if (request.action === 'getFocusAnalyticsStatus') {
          const status = this.getFocusAnalyticsStatus();
          sendResponse(status);
        } else if (request.action === 'getFocusAnalyticsReport') {
          const report = await this.getLatestFocusReport();
          sendResponse(report);
        } else if (request.action === 'recordDistraction') {
          if (this.focusAnalytics) {
            this.focusAnalytics.recordDistraction(request.url, request.reason, request.category);
          }
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
      }
      return true;
    });
  }

  async getAmsterdamHour() {
    try {
      const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Amsterdam');
      const data = await response.json();
      return data.hour;
    } catch (error) {
      const now = new Date();
      return now.getHours();
    }
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

  // Focus Analytics Methods
  async startFocusAnalytics(config = {}) {
    if (this.focusAnalytics && this.focusAnalytics.isTracking) {
      return false;
    }

    try {
      const { FocusAnalytics } = await import('../analytics/focus-analytics.js');
      this.focusAnalytics = new FocusAnalytics();
      
      const success = this.focusAnalytics.startFocusSession(config);
      if (success) {
        this.focusAnalyticsActive = true;
        this.currentFocusSession = {
          startTime: Date.now(),
          config: config
        };
        
        await chrome.storage.sync.set({ 
          focusAnalyticsActive: this.focusAnalyticsActive,
          currentFocusSession: this.currentFocusSession
        });
        
        await this.startCursorTracking();
        
        this.log('📊 Focus Analytics session started');
        return true;
      }
    } catch (error) {
      this.log('❌ Failed to start Focus Analytics:', error.message);
    }
    
    return false;
  }

  async stopFocusAnalytics() {
    if (!this.focusAnalytics || !this.focusAnalytics.isTracking) {
      return null;
    }

    try {
      await this.stopCursorTracking();
      
      const report = this.focusAnalytics.stopFocusSession();
      
      const { focusReports = [] } = await chrome.storage.local.get(['focusReports']);
      focusReports.push(report);
      
      if (focusReports.length > 30) {
        focusReports.splice(0, focusReports.length - 30);
      }
      
      await chrome.storage.local.set({ focusReports });
      
      this.focusAnalyticsActive = false;
      this.currentFocusSession = null;
      this.focusAnalytics = null;
      
      await chrome.storage.sync.set({ 
        focusAnalyticsActive: false,
        currentFocusSession: null
      });
      
      this.log('📊 Focus Analytics session ended');
      return report;
    } catch (error) {
      this.log('❌ Failed to stop Focus Analytics:', error.message);
      return null;
    }
  }

  getFocusAnalyticsStatus() {
    if (!this.focusAnalytics) {
      return {
        active: false,
        message: 'No analytics instance'
      };
    }

    return {
      active: this.focusAnalytics.isTracking,
      status: this.focusAnalytics.getCurrentFocusStatus(),
      session: this.currentFocusSession
    };
  }

  async getLatestFocusReport() {
    try {
      const { focusReports = [] } = await chrome.storage.local.get(['focusReports']);
      return focusReports.length > 0 ? focusReports[focusReports.length - 1] : null;
    } catch (error) {
      this.log('❌ Failed to get latest focus report:', error.message);
      return null;
    }
  }

  async startCursorTracking() {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'startCursorTracking' });
          } catch (error) {
            // Tab might not have content script loaded
          }
        }
      }
    } catch (error) {
      this.log('❌ Failed to start cursor tracking:', error.message);
    }
  }

  async stopCursorTracking() {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: 'stopCursorTracking' });
          } catch (error) {
            // Tab might not have content script loaded
          }
        }
      }
    } catch (error) {
      this.log('❌ Failed to stop cursor tracking:', error.message);
    }
  }

  async analyzeAndBlockIfNeeded(tabId, url) {
    // Implementation would go here
    this.log('🔍 Analyzing URL:', url);
  }

  checkFocusLockExpiry() {
    if (this.focusLock && this.focusLockEndTime && Date.now() >= this.focusLockEndTime) {
      this.log('🔓 Focus lock auto-expired');
      this.focusLock = false;
      this.focusLockEndTime = null;
      this.updateSettings({});
    }
  }

  initExtensionMonitoring() {
    // Implementation would go here
  }

  checkIncognitoAccess() {
    // Implementation would go here
  }

  logBlockingKeywordLists() {
    this.log('📋 Blocked sites loaded:', this.blockedSites.length);
    this.log('✅ Allowed sites loaded:', this.allowedSites.length);
  }

  refreshSessionState() {
    // Implementation would go here
  }

  updateSettings(settings) {
    // Implementation would go here
    return chrome.storage.sync.set(settings);
  }

  analyzeContentWithAI(data) {
    // Implementation would go here
    return { success: true };
  }
}

// Initialize the extension
new ProductivityGuardian();
