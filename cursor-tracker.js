/**
 * Cursor Tracker Content Script
 * Tracks mouse movement, clicks, keystrokes, and scroll position for focus analytics
 */

class CursorTracker {
  constructor() {
    this.isActive = false;
    this.cursorData = {
      x: 0,
      y: 0,
      scrollY: 0,
      clicks: 0,
      keystrokes: 0,
      mouseMovement: 0,
      lastX: 0,
      lastY: 0,
      lastUpdate: Date.now()
    };
    this.eventListeners = [];
    this.scrollTimeout = null;
    this.movementThreshold = 5; // Minimum movement to count
  }

  /**
   * Start tracking cursor activity
   */
  startTracking() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.cursorData.lastX = window.event?.clientX || 0;
    this.cursorData.lastY = window.event?.clientY || 0;
    this.cursorData.lastUpdate = Date.now();
    
    // Add event listeners
    this.addEventListeners();
    
    console.log('🖱️ Cursor tracking started');
  }

  /**
   * Stop tracking cursor activity
   */
  stopTracking() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeEventListeners();
    
    console.log('🖱️ Cursor tracking stopped');
  }

  /**
   * Add all event listeners
   */
  addEventListeners() {
    // Mouse movement
    const mouseMoveHandler = this.throttle((e) => {
      if (!this.isActive) return;
      
      const deltaX = Math.abs(e.clientX - this.cursorData.lastX);
      const deltaY = Math.abs(e.clientY - this.cursorData.lastY);
      
      if (deltaX > this.movementThreshold || deltaY > this.movementThreshold) {
        this.cursorData.mouseMovement += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.cursorData.x = e.clientX;
        this.cursorData.y = e.clientY;
        this.cursorData.lastX = e.clientX;
        this.cursorData.lastY = e.clientY;
        this.cursorData.lastUpdate = Date.now();
      }
    }, 100);

    // Mouse clicks
    const clickHandler = (e) => {
      if (!this.isActive) return;
      
      this.cursorData.clicks++;
      this.cursorData.x = e.clientX;
      this.cursorData.y = e.clientY;
      this.cursorData.lastUpdate = Date.now();
    };

    // Keyboard activity
    const keyHandler = (e) => {
      if (!this.isActive) return;
      
      // Only count actual typing, not modifier keys
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        this.cursorData.keystrokes++;
        this.cursorData.lastUpdate = Date.now();
      }
    };

    // Scroll position
    const scrollHandler = this.throttle(() => {
      if (!this.isActive) return;
      
      this.cursorData.scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      this.cursorData.lastUpdate = Date.now();
    }, 100);

    // Add listeners
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);
    window.addEventListener('scroll', scrollHandler);

    // Store references for removal
    this.eventListeners = [
      { element: document, event: 'mousemove', handler: mouseMoveHandler },
      { element: document, event: 'click', handler: clickHandler },
      { element: document, event: 'keydown', handler: keyHandler },
      { element: window, event: 'scroll', handler: scrollHandler }
    ];
  }

  /**
   * Remove all event listeners
   */
  removeEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Get current cursor data
   */
  getCursorData() {
    return {
      ...this.cursorData,
      timestamp: Date.now(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight
      },
      page: {
        url: window.location.href,
        title: document.title
      }
    };
  }

  /**
   * Reset cursor data
   */
  resetData() {
    this.cursorData = {
      x: this.cursorData.x,
      y: this.cursorData.y,
      scrollY: this.cursorData.scrollY,
      clicks: 0,
      keystrokes: 0,
      mouseMovement: 0,
      lastX: this.cursorData.x,
      lastY: this.cursorData.y,
      lastUpdate: Date.now()
    };
  }

  /**
   * Throttle function to limit event frequency
   */
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Get focus heatmap data
   */
  getHeatmapData() {
    // This would collect cursor positions for heatmap visualization
    // For now, return basic data structure
    return {
      positions: [], // Would store cursor positions over time
      clicks: this.cursorData.clicks,
      keystrokes: this.cursorData.keystrokes,
      scrollDepth: this.cursorData.scrollY,
      timeOnPage: Date.now() - (this.cursorData.lastUpdate - (this.cursorData.mouseMovement > 0 ? 0 : 60000))
    };
  }
}

// Initialize cursor tracker
let cursorTracker = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCursorTracking') {
    if (!cursorTracker) {
      cursorTracker = new CursorTracker();
    }
    cursorTracker.startTracking();
    sendResponse({ success: true });
  } else if (request.action === 'stopCursorTracking') {
    if (cursorTracker) {
      cursorTracker.stopTracking();
    }
    sendResponse({ success: true });
  } else if (request.action === 'getCursorActivity') {
    if (cursorTracker) {
      const data = cursorTracker.getCursorData();
      sendResponse({ cursorData: data });
    } else {
      sendResponse({ cursorData: null });
    }
  } else if (request.action === 'resetCursorData') {
    if (cursorTracker) {
      cursorTracker.resetData();
    }
    sendResponse({ success: true });
  }
  return true;
});

// Auto-start if focus analytics is active
chrome.storage.sync.get(['focusAnalyticsActive'], (result) => {
  if (result.focusAnalyticsActive) {
    setTimeout(() => {
      if (!cursorTracker) {
        cursorTracker = new CursorTracker();
      }
      cursorTracker.startTracking();
    }, 1000); // Delay to ensure page is loaded
  }
});

// Export for testing
if (typeof window !== 'undefined') {
  window.CursorTracker = CursorTracker;
}
