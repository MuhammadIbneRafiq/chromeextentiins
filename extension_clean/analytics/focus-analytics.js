/**
 * Focus Analytics Module
 * Tracks user focus patterns, tab time, cursor positions, and productivity metrics
 */

class FocusAnalytics {
  constructor() {
    this.sessionData = {
      startTime: null,
      endTime: null,
      tabTimeMap: new Map(), // tabId -> {url, title, startTime, totalTime, activeTime}
      cursorActivity: [],
      tabSwitches: [],
      focusEvents: [],
      distractionEvents: []
    };
    this.isTracking = false;
    this.currentTabId = null;
    this.lastTabSwitch = null;
    this.cursorTrackingInterval = null;
    this.analyticsInterval = null;
    this.inactiveThreshold = 30000; // 30 seconds of inactivity
    this.lastActivity = Date.now();
  }

  /**
   * Start focus session tracking
   */
  startFocusSession(sessionConfig = {}) {
    if (this.isTracking) return false;
    
    this.sessionData = {
      startTime: Date.now(),
      endTime: null,
      tabTimeMap: new Map(),
      cursorActivity: [],
      tabSwitches: [],
      focusEvents: [],
      distractionEvents: [],
      config: sessionConfig
    };
    
    this.isTracking = true;
    this.lastActivity = Date.now();
    
    // Start tracking
    this.startTabTracking();
    this.startCursorTracking();
    this.startAnalyticsCollection();
    
    console.log('🎯 Focus Analytics: Session started');
    return true;
  }

  /**
   * Stop focus session tracking
   */
  stopFocusSession() {
    if (!this.isTracking) return null;
    
    this.sessionData.endTime = Date.now();
    this.isTracking = false;
    
    // Stop all tracking
    this.stopTabTracking();
    this.stopCursorTracking();
    this.stopAnalyticsCollection();
    
    // Finalize current tab time
    if (this.currentTabId) {
      this.finalizeTabTime(this.currentTabId);
    }
    
    const sessionReport = this.generateSessionReport();
    console.log('📊 Focus Analytics: Session ended', sessionReport);
    
    return sessionReport;
  }

  /**
   * Start tab time tracking
   */
  startTabTracking() {
    // Get current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        this.switchToTab(tabs[0].id, tabs[0].url, tabs[0].title);
      }
    });

    // Listen for tab updates
    chrome.tabs.onActivated.addListener(this.onTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.onTabUpdated.bind(this));
    chrome.tabs.onRemoved.addListener(this.onTabRemoved.bind(this));
  }

  /**
   * Stop tab tracking
   */
  stopTabTracking() {
    // Remove listeners (Chrome doesn't provide direct way to remove specific listeners)
    // They will be cleaned up when the page is reloaded
  }

  /**
   * Start cursor position tracking
   */
  startCursorTracking() {
    this.cursorTrackingInterval = setInterval(() => {
      if (!this.isTracking) return;
      
      // Send message to content script to get cursor position
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && !tabs[0].url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'getCursorActivity'
          }, (response) => {
            if (response && response.cursorData) {
              this.recordCursorActivity(response.cursorData);
            }
          });
        }
      });
    }, 5000); // Track every 5 seconds
  }

  /**
   * Stop cursor tracking
   */
  stopCursorTracking() {
    if (this.cursorTrackingInterval) {
      clearInterval(this.cursorTrackingInterval);
      this.cursorTrackingInterval = null;
    }
  }

  /**
   * Start analytics collection
   */
  startAnalyticsCollection() {
    this.analyticsInterval = setInterval(() => {
      if (!this.isTracking) return;
      
      this.collectCurrentMetrics();
      this.checkInactivity();
    }, 10000); // Collect every 10 seconds
  }

  /**
   * Stop analytics collection
   */
  stopAnalyticsCollection() {
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
      this.analyticsInterval = null;
    }
  }

  /**
   * Handle tab activation
   */
  onTabActivated(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      this.switchToTab(activeInfo.tabId, tab.url, tab.title);
    });
  }

  /**
   * Handle tab updates
   */
  onTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.url && this.currentTabId === tabId) {
      // Tab URL changed, update tracking
      const tabData = this.sessionData.tabTimeMap.get(tabId);
      if (tabData) {
        this.finalizeTabTime(tabId);
        tabData.url = tab.url;
        tabData.title = tab.title;
        tabData.startTime = Date.now();
      }
    }
  }

  /**
   * Handle tab removal
   */
  onTabRemoved(tabId) {
    if (this.sessionData.tabTimeMap.has(tabId)) {
      this.finalizeTabTime(tabId);
    }
  }

  /**
   * Switch to a new tab
   */
  switchToTab(tabId, url, title) {
    // Finalize previous tab time
    if (this.currentTabId && this.currentTabId !== tabId) {
      this.finalizeTabTime(this.currentTabId);
      
      // Record tab switch
      this.sessionData.tabSwitches.push({
        timestamp: Date.now(),
        fromTabId: this.currentTabId,
        toTabId: tabId,
        fromUrl: this.sessionData.tabTimeMap.get(this.currentTabId)?.url,
        toUrl: url
      });
    }

    this.currentTabId = tabId;
    this.lastActivity = Date.now();

    // Initialize or update tab data
    if (!this.sessionData.tabTimeMap.has(tabId)) {
      this.sessionData.tabTimeMap.set(tabId, {
        url: url,
        title: title,
        startTime: Date.now(),
        totalTime: 0,
        activeTime: 0,
        visits: 1,
        firstVisit: Date.now()
      });
    } else {
      const tabData = this.sessionData.tabTimeMap.get(tabId);
      tabData.visits++;
      tabData.startTime = Date.now();
      tabData.url = url;
      tabData.title = title;
    }
  }

  /**
   * Finalize time for a tab
   */
  finalizeTabTime(tabId) {
    const tabData = this.sessionData.tabTimeMap.get(tabId);
    if (tabData && tabData.startTime) {
      const timeSpent = Date.now() - tabData.startTime;
      tabData.totalTime += timeSpent;
      tabData.activeTime += timeSpent; // Will be adjusted by inactivity detection
      tabData.startTime = null;
    }
  }

  /**
   * Record cursor activity
   */
  recordCursorActivity(cursorData) {
    this.lastActivity = Date.now();
    
    this.sessionData.cursorActivity.push({
      timestamp: Date.now(),
      tabId: this.currentTabId,
      x: cursorData.x,
      y: cursorData.y,
      scrollY: cursorData.scrollY,
      clicks: cursorData.clicks || 0,
      keystrokes: cursorData.keystrokes || 0,
      mouseMovement: cursorData.mouseMovement || 0
    });

    // Keep only last 1000 cursor events to prevent memory issues
    if (this.sessionData.cursorActivity.length > 1000) {
      this.sessionData.cursorActivity = this.sessionData.cursorActivity.slice(-1000);
    }
  }

  /**
   * Collect current metrics
   */
  collectCurrentMetrics() {
    if (!this.currentTabId) return;

    const tabData = this.sessionData.tabTimeMap.get(this.currentTabId);
    if (tabData && tabData.startTime) {
      const currentSessionTime = Date.now() - tabData.startTime;
      
      // Record focus event
      this.sessionData.focusEvents.push({
        timestamp: Date.now(),
        tabId: this.currentTabId,
        url: tabData.url,
        title: tabData.title,
        sessionTime: currentSessionTime,
        isActive: Date.now() - this.lastActivity < this.inactiveThreshold
      });
    }
  }

  /**
   * Check for user inactivity
   */
  checkInactivity() {
    const inactiveTime = Date.now() - this.lastActivity;
    
    if (inactiveTime > this.inactiveThreshold && this.currentTabId) {
      const tabData = this.sessionData.tabTimeMap.get(this.currentTabId);
      if (tabData && tabData.startTime) {
        // Subtract inactive time from active time
        const inactivePeriod = Math.min(inactiveTime - this.inactiveThreshold, Date.now() - tabData.startTime);
        tabData.activeTime = Math.max(0, tabData.activeTime - inactivePeriod);
      }
    }
  }

  /**
   * Record distraction event
   */
  recordDistraction(url, reason, category = 'distraction') {
    this.sessionData.distractionEvents.push({
      timestamp: Date.now(),
      url: url,
      reason: reason,
      category: category,
      tabId: this.currentTabId
    });
  }

  /**
   * Generate comprehensive session report
   */
  generateSessionReport() {
    const sessionDuration = this.sessionData.endTime - this.sessionData.startTime;
    
    // Calculate tab statistics
    const tabStats = [];
    for (const [tabId, tabData] of this.sessionData.tabTimeMap) {
      tabStats.push({
        url: tabData.url,
        title: tabData.title,
        totalTime: tabData.totalTime,
        activeTime: tabData.activeTime,
        visits: tabData.visits,
        firstVisit: tabData.firstVisit,
        efficiency: tabData.totalTime > 0 ? (tabData.activeTime / tabData.totalTime) : 0
      });
    }

    // Sort by time spent
    tabStats.sort((a, b) => b.totalTime - a.totalTime);

    // Calculate productivity metrics
    const totalActiveTime = tabStats.reduce((sum, tab) => sum + tab.activeTime, 0);
    const productivityScore = sessionDuration > 0 ? (totalActiveTime / sessionDuration) * 100 : 0;

    // Analyze cursor patterns
    const cursorPatterns = this.analyzeCursorPatterns();

    // Tab switching analysis
    const tabSwitchingAnalysis = this.analyzeTabSwitching();

    return {
      session: {
        startTime: this.sessionData.startTime,
        endTime: this.sessionData.endTime,
        duration: sessionDuration,
        config: this.sessionData.config
      },
      productivity: {
        score: Math.round(productivityScore),
        totalActiveTime: totalActiveTime,
        focusEfficiency: Math.round((totalActiveTime / sessionDuration) * 100),
        distractionCount: this.sessionData.distractionEvents.length
      },
      tabs: tabStats,
      cursorPatterns: cursorPatterns,
      tabSwitching: tabSwitchingAnalysis,
      distractions: this.sessionData.distractionEvents,
      summary: this.generateSummary(tabStats, productivityScore)
    };
  }

  /**
   * Analyze cursor movement patterns
   */
  analyzeCursorPatterns() {
    if (this.sessionData.cursorActivity.length === 0) {
      return { pattern: 'no_data', insights: [] };
    }

    const recentActivity = this.sessionData.cursorActivity.slice(-50); // Last 50 events
    const avgClicks = recentActivity.reduce((sum, event) => sum + (event.clicks || 0), 0) / recentActivity.length;
    const avgKeystrokes = recentActivity.reduce((sum, event) => sum + (event.keystrokes || 0), 0) / recentActivity.length;
    const avgMouseMovement = recentActivity.reduce((sum, event) => sum + (event.mouseMovement || 0), 0) / recentActivity.length;

    let pattern = 'normal';
    let insights = [];

    if (avgKeystrokes > 5) {
      pattern = 'high_typing';
      insights.push('High typing activity detected - likely productive work');
    } else if (avgClicks > 3) {
      pattern = 'high_clicking';
      insights.push('High clicking activity - possible browsing or navigation');
    } else if (avgMouseMovement > 1000) {
      pattern = 'high_movement';
      insights.push('High mouse movement - possible exploration or distraction');
    } else {
      insights.push('Low activity - possible reading or thinking');
    }

    return {
      pattern,
      insights,
      metrics: {
        avgClicks: Math.round(avgClicks * 10) / 10,
        avgKeystrokes: Math.round(avgKeystrokes * 10) / 10,
        avgMouseMovement: Math.round(avgMouseMovement)
      }
    };
  }

  /**
   * Analyze tab switching patterns
   */
  analyzeTabSwitching() {
    const switches = this.sessionData.tabSwitches;
    if (switches.length === 0) {
      return { pattern: 'no_switches', frequency: 0, insights: [] };
    }

    const sessionDuration = this.sessionData.endTime - this.sessionData.startTime;
    const switchFrequency = (switches.length / sessionDuration) * 1000 * 60; // switches per minute

    let pattern = 'normal';
    let insights = [];

    if (switchFrequency > 10) {
      pattern = 'high_frequency';
      insights.push('Very frequent tab switching - possible distraction or multitasking');
    } else if (switchFrequency > 5) {
      pattern = 'moderate_frequency';
      insights.push('Moderate tab switching - normal research/work pattern');
    } else {
      pattern = 'low_frequency';
      insights.push('Low tab switching - good focus on single tasks');
    }

    // Analyze switching patterns
    const uniqueUrls = new Set(switches.map(s => s.toUrl)).size;
    insights.push(`Visited ${uniqueUrls} different pages during session`);

    return {
      pattern,
      frequency: Math.round(switchFrequency * 10) / 10,
      totalSwitches: switches.length,
      uniquePages: uniqueUrls,
      insights
    };
  }

  /**
   * Generate session summary
   */
  generateSummary(tabStats, productivityScore) {
    const topTab = tabStats[0];
    const totalTabs = tabStats.length;
    const sessionTimeMinutes = Math.round((this.sessionData.endTime - this.sessionData.startTime) / 60000);

    let summary = `Session lasted ${sessionTimeMinutes} minutes with ${totalTabs} tabs visited. `;
    
    if (topTab) {
      summary += `Most time spent on "${topTab.title}" (${Math.round(topTab.totalTime / 60000)} minutes). `;
    }

    summary += `Productivity score: ${productivityScore}%. `;

    if (productivityScore >= 80) {
      summary += 'Excellent focus session!';
    } else if (productivityScore >= 60) {
      summary += 'Good focus with room for improvement.';
    } else {
      summary += 'Consider reducing distractions for better focus.';
    }

    return summary;
  }

  /**
   * Get real-time focus status
   */
  getCurrentFocusStatus() {
    if (!this.isTracking) {
      return { status: 'not_tracking', message: 'No active focus session' };
    }

    const currentTab = this.sessionData.tabTimeMap.get(this.currentTabId);
    const sessionTime = Date.now() - this.sessionData.startTime;
    const inactiveTime = Date.now() - this.lastActivity;

    return {
      status: 'tracking',
      sessionTime: sessionTime,
      currentTab: currentTab ? {
        url: currentTab.url,
        title: currentTab.title,
        timeOnTab: currentTab.startTime ? Date.now() - currentTab.startTime : 0
      } : null,
      isActive: inactiveTime < this.inactiveThreshold,
      inactiveTime: inactiveTime,
      tabSwitches: this.sessionData.tabSwitches.length,
      distractions: this.sessionData.distractionEvents.length
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FocusAnalytics;
} else if (typeof window !== 'undefined') {
  window.FocusAnalytics = FocusAnalytics;
}
