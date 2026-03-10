---
description: Deadlock prevention and async handling rules
---

# Deadlock Prevention Rules

## 🔄 Async/Await Best Practices

### Required Error Handling
```javascript
// ✅ CORRECT - Proper async handling
async function analyzeContent(content) {
  try {
    const result = await aiAnalysis(content);
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    return null;
  }
}

// ❌ FORBIDDEN - No error handling
async function analyzeContent(content) {
  const result = await aiAnalysis(content);
  return result; // Can throw unhandled exception
}
```

### Chrome Extension Message Handling
```javascript
// ✅ CORRECT - Safe message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'analyzeContent':
          const result = await analyzeContent(request.data);
          sendResponse({ success: true, data: result });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();
  return true; // Required for async response
});
```

### Storage Operations
```javascript
// ✅ CORRECT - Safe storage operations
async function updateSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    return true;
  } catch (error) {
    console.error('Failed to update settings:', error);
    return false;
  }
}

// ❌ FORBIDDEN - Nested callbacks
function updateSettings(settings) {
  chrome.storage.sync.set(settings, function() {
    chrome.tabs.query({}, function(tabs) {
      // Callback hell - deadlock risk
    });
  });
}
```

## ⏱️ Timer and Interval Management

### Required Cleanup
```javascript
// ✅ CORRECT - Proper timer management
class FocusSession {
  constructor() {
    this.timers = [];
    this.intervals = [];
  }
  
  startSession() {
    const timerId = setTimeout(() => {
      this.endSession();
    }, 60 * 60 * 1000); // 1 hour
    
    this.timers.push(timerId);
  }
  
  endSession() {
    // Clean up all timers
    this.timers.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    this.timers = [];
    this.intervals = [];
  }
}
```

### Forbidden Timer Patterns
```javascript
// ❌ FORBIDDEN - Unbounded timer creation
function startTracking() {
  setInterval(() => {
    // Timer created without cleanup mechanism
    console.log('Tracking...');
  }, 1000);
}

// ❌ FORBIDDEN - Timer in loop
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    // Multiple timers without tracking
  }, 1000);
}
```

## 🔗 Promise Chain Management

### Required Promise Handling
```javascript
// ✅ CORRECT - Proper promise chaining
async function processTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    const results = await Promise.all(
      tabs.map(tab => processTab(tab))
    );
    return results;
  } catch (error) {
    console.error('Tab processing failed:', error);
    return [];
  }
}

// ❌ FORBIDDEN - Mixed async patterns
function processTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      processTab(tab).then(result => {
        // Mixed callbacks and promises
      });
    });
  });
}
```

## 🚫 Race Condition Prevention

### Required State Management
```javascript
// ✅ CORRECT - Atomic state updates
class FocusManager {
  constructor() {
    this.isTracking = false;
    this.lock = false;
  }
  
  async startTracking() {
    if (this.lock || this.isTracking) return false;
    
    this.lock = true;
    try {
      await this.initializeTracking();
      this.isTracking = true;
      return true;
    } finally {
      this.lock = false;
    }
  }
  
  async stopTracking() {
    if (this.lock || !this.isTracking) return false;
    
    this.lock = true;
    try {
      await this.cleanupTracking();
      this.isTracking = false;
      return true;
    } finally {
      this.lock = false;
    }
  }
}
```

### Forbidden State Patterns
```javascript
// ❌ FORBIDDEN - Non-atomic state changes
let isTracking = false;

async function startTracking() {
  if (isTracking) return; // Race condition possible
  
  isTracking = true; // Not atomic with check
  await initializeTracking();
}

async function stopTracking() {
  if (!isTracking) return;
  
  isTracking = false; // Not atomic with check
  await cleanupTracking();
}
```

## 📊 Resource Management

### Required Cleanup Patterns
```javascript
// ✅ CORRECT - Resource cleanup
class ResourceManager {
  constructor() {
    this.resources = new Set();
  }
  
  async allocateResource() {
    const resource = await createResource();
    this.resources.add(resource);
    return resource;
  }
  
  async cleanup() {
    const cleanupPromises = Array.from(this.resources).map(
      resource => resource.cleanup()
    );
    
    await Promise.all(cleanupPromises);
    this.resources.clear();
  }
}
```

### Forbidden Resource Leaks
```javascript
// ❌ FORBIDDEN - Resource leaks
function createAnalyzer() {
  const analyzer = new AIAnalyzer();
  // No cleanup mechanism
  return analyzer;
}

// ❌ FORBIDDEN - Event listener leaks
function addListeners() {
  document.addEventListener('click', handler);
  // No removal mechanism
}
```

## 🔍 Detection Rules

### Automated Checks
- All async functions must have try/catch blocks
- Message handlers must return `true` for async responses
- Timer IDs must be stored and cleaned up
- State changes must be atomic
- Resources must have cleanup mechanisms

### Linting Rules
- Require `try/catch` for async functions
- Detect callback hell patterns
- Check for timer cleanup
- Validate atomic state operations
- Ensure resource cleanup
