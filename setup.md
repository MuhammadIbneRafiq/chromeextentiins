# 🚀 Quick Setup Guide - AI Productivity Guardian

## ✅ Pre-Installation Checklist

Before installing the extension, make sure you have:

1. **✅ All required files present:**
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `popup.html`, `popup.css`, `popup.js`
   - `block-page.html`
   - `icons/` folder with icon16.png, icon32.png, icon48.png, icon128.png

2. **🔑 Groq API Key ready:**
   - Sign up at [console.groq.com](https://console.groq.com)
   - Generate a free API key
   - Copy it for later use

## 📥 Installation Steps

### Step 1: Load Extension in Browser

**For Chrome:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this folder (`chromeextentiins`)
5. The extension should appear with a 🤖 icon

**For Brave:**
1. Open Brave and go to `brave://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this folder (`chromeextentiins`)
5. The extension should appear with a 🤖 icon

### Step 2: Configure the Extension

1. **Click the extension icon** in your browser toolbar
2. **Enter your Groq API key** in the settings
3. **Click "Save"** - you should see a success message
4. **Toggle "Enable Protection"** to activate blocking
5. **Customize lists** if needed (add/remove sites)

### Step 3: Test the Extension

1. **Visit a blocked site** like:
   - `youtube.com`
   - `netflix.com`
   - `sflix.to`
   - `facebook.com`

2. **You should see:**
   - Beautiful block page with motivational message
   - Productive alternatives suggested
   - Your stats updated

## 🔧 Troubleshooting

### Extension not loading:
- Check that all files are present
- Make sure `manifest.json` is valid
- Try refreshing the extension in `chrome://extensions/`

### Sites not being blocked:
- Verify API key is entered correctly
- Check that "Enable Protection" is toggled ON
- Sites might be in your "Allowed Sites" list
- AI might have classified the site as educational

### API not working:
- Verify your Groq API key is valid
- Check you have API credits remaining
- Ensure stable internet connection

## 🎯 What Gets Blocked by Default

**Explicit Block List:**
- `sflix.to` (streaming movies)
- `netflix.com`
- `youtube.com`
- `facebook.com`
- `instagram.com`
- `tiktok.com`

**AI Detection:**
- Movie/TV streaming sites
- Social media platforms
- Gaming sites
- Entertainment news
- Gossip/celebrity sites

**Always Allowed:**
- `stackoverflow.com`
- `github.com`
- `developer.mozilla.org`
- `coursera.org`
- `khan-academy.org`

## 📊 Features to Try

1. **View Statistics:** Click extension icon to see blocked sites and time saved
2. **Add Custom Sites:** Add sites to block/allow lists
3. **Export Settings:** Backup your configuration
4. **Monitor Activity:** See recent blocking activity

## 🆘 Need Help?

- Check the main `README.md` for detailed documentation
- Review the console logs in `chrome://extensions/` for errors
- Test with a simple site like `youtube.com` first

---

**🎉 You're all set! The AI Productivity Guardian is now protecting your focus and productivity.** 