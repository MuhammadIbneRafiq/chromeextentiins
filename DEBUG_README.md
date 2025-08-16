# 🐛 AI Productivity Guardian - Debug Guide

## 🚨 Problem Solved

You can now see debug information, reasons for blocking, and metadata received in your **regular browser console** instead of just the service worker console!

## 🔍 How to See Debug Information

### 1. **Browser Console (Recommended)**
- Press **F12** or right-click → **Inspect** → **Console**
- You'll see styled debug messages like:
  ```
  [AI Guardian 2:30:45 PM] 🔍 AI Productivity Guardian - Analyzing URL
  [AI Guardian 2:30:45 PM] 📍 URL: https://example.com
  [AI Guardian 2:30:45 PM] 🏠 Hostname: example.com
  ```

### 2. **Extension Popup Debug Console**
- Click the extension icon 🧠
- Scroll down to **"🐛 Debug Console"** section
- See recent debug logs with timestamps and metadata

### 3. **Service Worker Console (Advanced)**
- Go to `chrome://extensions/`
- Find "AI Productivity Guardian"
- Click the **"service worker"** link
- See detailed background processing logs

## 🆕 New Debug Features Added

### ✅ Enhanced Logging
- **Real-time logging** visible in regular browser console
- **Styled console messages** with timestamps
- **Detailed metadata extraction** logging
- **URL analysis step-by-step** logging
- **Focus session enforcement** logging

### ✅ Debug Console Panel
- **Built-in debug console** in extension popup
- **Recent 20 logs** display
- **Clear logs** functionality
- **Auto-refresh** every 30 seconds
- **Metadata display** for each log entry

### ✅ Content Script Logging
- **Page metadata extraction** details
- **Open Graph data** logging
- **Chat site detection** logging
- **Topic filtering** results

## 🧪 Testing the Debug Features

### Test Page
Open `test-debug.html` in your browser to test all debug functionality.

### Manual Testing
1. **Navigate to any website** (e.g., youtube.com, stackoverflow.com)
2. **Open browser console** (F12)
3. **Watch for debug messages** as the extension analyzes the page
4. **Check extension popup** for debug console logs

## 📊 What You'll See in Console

### URL Analysis
```
[AI Guardian 2:30:45 PM] 🔍 AI Productivity Guardian - Analyzing URL
[AI Guardian 2:30:45 PM] 📍 URL: https://youtube.com
[AI Guardian 2:30:45 PM] 🏠 Hostname: youtube.com
[AI Guardian 2:30:45 PM] 🚫 BLOCKING: Site is explicitly blocked
[AI Guardian 2:30:45 PM] 🔍 AI Productivity Guardian - URL Analysis Complete
```

### Content Analysis
```
[AI Guardian 2:30:45 PM] 🔍 AI Productivity Guardian - Content Analysis
[AI Guardian 2:30:45 PM] 📍 URL: https://example.com
[AI Guardian 2:30:45 PM] 📝 Title: Example Domain
[AI Guardian 2:30:45 PM] 📄 Meta Description: This domain is for use in illustrative examples...
[AI Guardian 2:30:45 PM] 🏷️ Meta Keywords: example, domain
```

### Focus Session
```
[AI Guardian 2:30:45 PM] 🎯 Focus Session Active - Checking domain whitelist
[AI Guardian 2:30:45 PM] 📋 Allowed Domains: ['stackoverflow.com', 'github.com']
[AI Guardian 2:30:45 PM] 🔍 Domain Match: ❌ NOT ALLOWED
[AI Guardian 2:30:45 PM] 🚫 BLOCKING: Domain not allowed in focus session
```

## 🔧 Troubleshooting

### No Debug Messages?
1. **Check extension is enabled** in popup
2. **Reload the page** you're testing
3. **Check browser console** (F12) is open
4. **Verify extension permissions** are granted

### Service Worker Issues?
1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"Reload"** button
4. Check **"service worker"** console

### Content Script Not Working?
1. **Refresh the page**
2. **Check manifest.json** has correct permissions
3. **Verify content script** is injected (check console for errors)

## 📝 Debug Log Structure

Each debug log contains:
```json
{
  "hostname": "example.com",
  "reason": "Site blocked for productivity",
  "action": "blocked",
  "metadata": {
    "title": "Page Title",
    "description": "Page description",
    "keywords": "relevant, keywords"
  },
  "timestamp": 1703123456789,
  "time": "2:30:45 PM"
}
```

## 🎯 Pro Tips

1. **Keep console open** while browsing to see real-time analysis
2. **Use the debug console** in extension popup for quick log review
3. **Check service worker** for detailed background processing
4. **Test with known sites** (youtube.com, facebook.com) to see blocking logic
5. **Use focus mode** to see topic filtering in action

## 🚀 Next Steps

1. **Test the extension** on various websites
2. **Check browser console** for debug messages
3. **Explore debug console** in extension popup
4. **Monitor service worker** for background activity
5. **Report any issues** with specific debug logs

---

**🎉 You should now see all the debug information you need in your regular browser console!**
