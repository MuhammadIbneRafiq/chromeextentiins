# 🧪 Testing Your AI Productivity Guardian Extension

## 🚀 **Quick Test Setup**

### **Step 1: Load Extension in Developer Mode**

1. **Open Chrome or Brave**
2. **Go to extensions page:**
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
3. **Enable "Developer mode"** (toggle in top right)
4. **Click "Load unpacked"**
5. **Select your `chromeextentiins` folder**

### **Step 2: Verify Extension Loaded**

✅ **Check these indicators:**
- Extension appears in extensions list
- 🤖 icon visible in browser toolbar
- No error messages in red text
- Status shows "Enabled"

## 🔧 **Console Testing & Debugging**

### **Method 1: Extension Console Logs**

1. **Go to `chrome://extensions/`**
2. **Find your extension**
3. **Click "Inspect views: service worker"** (this opens DevTools for background.js)
4. **Check Console tab for logs:**

```javascript
// You should see these logs when extension loads:
AI Productivity Guardian v1.0.0 initialized
// When you visit blocked sites:
Blocked youtube.com: Explicitly blocked site
```

### **Method 2: Test API Connection**

**Open extension popup and test in browser console:**

1. **Click the 🤖 extension icon**
2. **Right-click popup → "Inspect"**
3. **In console, test API:**

```javascript
// Test if API key is working
chrome.runtime.sendMessage({action: 'checkApiStatus'}, (response) => {
    console.log('API Status:', response);
});
```

### **Method 3: Manual Function Testing**

**In the popup inspector console:**

```javascript
// Test settings save
window.popupManager.settings.groqApiKey = 'test-key';
window.popupManager.saveSettings();

// Check blocked sites list
console.log('Blocked sites:', window.popupManager.settings.blockedSites);

// Test notification system
window.popupManager.showNotification('Test message', 'success');
```

## 📋 **Practical Testing Checklist**

### **✅ Basic Functionality Tests**

1. **Extension Loading:**
   - [ ] Extension appears in `chrome://extensions/`
   - [ ] No error messages shown
   - [ ] 🤖 icon visible in toolbar

2. **Popup Interface:**
   - [ ] Click extension icon opens popup
   - [ ] All sections visible (API config, stats, lists)
   - [ ] Toggle switch works
   - [ ] Input fields accept text

3. **API Configuration:**
   - [ ] Can enter API key
   - [ ] "Save" button shows success message
   - [ ] API key persists after closing popup

4. **Site Blocking:**
   - [ ] Visit `youtube.com` → should be blocked
   - [ ] Visit `sflix.to` → should be blocked  
   - [ ] Visit `stackoverflow.com` → should be allowed
   - [ ] Block page shows with correct site name

### **✅ Advanced Feature Tests**

5. **Statistics Tracking:**
   - [ ] Blocked count increases when sites blocked
   - [ ] "Recent Activity" shows blocked attempts
   - [ ] Time saved calculations appear

6. **Custom Lists:**
   - [ ] Can add sites to block list
   - [ ] Can add sites to allow list
   - [ ] Remove buttons work (×)
   - [ ] Custom blocked sites actually get blocked

7. **AI Analysis (if API key configured):**
   - [ ] Unknown entertainment sites get blocked
   - [ ] Educational sites get allowed
   - [ ] Check console for "AI detected..." messages

## 🐛 **Debugging Common Issues**

### **Extension Won't Load:**

```bash
# Check in terminal/console:
# 1. Verify all files exist
ls -la chromeextentiins/
# Should show: manifest.json, background.js, content.js, popup.*, block-page.html, icons/

# 2. Validate manifest.json
cat manifest.json | python -m json.tool
# Should show formatted JSON without errors
```

### **Console Error Checking:**

1. **Background Script Errors:**
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker"
   - Check Console and Network tabs

2. **Content Script Errors:**
   - Visit any website
   - Press F12 → Console tab
   - Look for extension-related errors

3. **Popup Errors:**
   - Click extension icon
   - Right-click popup → Inspect
   - Check Console tab

### **API Testing Commands:**

```javascript
// Test in background script console (service worker inspect):

// Check if API key exists
chrome.storage.sync.get(['groqApiKey'], (result) => {
    console.log('API Key set:', !!result.groqApiKey);
});

// Test API connection manually
fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_API_KEY_HERE',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{role: 'user', content: 'test'}],
        max_tokens: 1
    })
}).then(r => console.log('API Response:', r.status));
```

## 🧪 **Test Scenarios to Try**

### **Scenario 1: First-Time Setup**
1. Load extension fresh
2. No API key configured
3. Visit `youtube.com` → Should still block (explicit list)
4. Add API key → Should see connection test in console

### **Scenario 2: AI Analysis Testing**
1. Configure valid API key
2. Visit unknown entertainment site (e.g., `9gag.com`)
3. Check console for AI analysis logs
4. Verify blocking decision

### **Scenario 3: Whitelist Override**
1. Add `youtube.com` to allowed sites
2. Visit `youtube.com` → Should NOT be blocked
3. Remove from allowed sites → Should block again

### **Scenario 4: Statistics Verification**
1. Block several sites
2. Check popup stats increase
3. Export settings → Verify data saved

## 📊 **Success Indicators**

**✅ Extension is working if:**
- Sites in block list get redirected to block page
- Popup shows increasing statistics
- Console logs show "AI Productivity Guardian initialized"
- API status shows "working" when key configured
- Block page displays with site name and reason

**❌ Extension needs fixing if:**
- No console logs appear
- Sites load normally despite being blocked
- Extension icon is grayed out
- Error messages in extension console
- Popup doesn't open or shows errors

## 🚀 **Quick Validation Script**

**Run this in background script console:**

```javascript
// Quick extension health check
console.log('=== AI Productivity Guardian Health Check ===');
console.log('Version:', guardian.version);
console.log('Enabled:', guardian.isEnabled);
console.log('API Key Set:', !!guardian.groqApiKey);
console.log('API Working:', guardian.apiWorking);
console.log('Blocked Sites:', guardian.blockedSites.length);
console.log('Allowed Sites:', guardian.allowedSites.length);
console.log('Last API Check:', new Date(guardian.lastApiCheck));
```

This comprehensive testing approach ensures your extension works perfectly before daily use! 🎯 