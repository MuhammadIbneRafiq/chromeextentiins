# 🤖 AI Productivity Guardian

A powerful Chrome/Brave browser extension that uses AI to intelligently block distracting websites and boost your productivity. Unlike simple site blockers, this extension analyzes webpage content using AI to determine if it's truly distracting or educational.

## ✨ Features

- **🧠 AI-Powered Content Analysis**: Uses Groq's Llama model to analyze webpage content and metadata
- **🚫 Smart Website Blocking**: Blocks entertainment, social media, and streaming sites including sflix.to
- **📊 Productivity Analytics**: Track blocked sites, time saved, and focus streaks
- **⚙️ Customizable Lists**: Manually add sites to block or allow lists
- **🎯 Productive Redirects**: Suggests educational alternatives when sites are blocked
- **🔒 Password Protection**: Secure your settings with API key protection
- **💼 Brave Browser Compatible**: Works perfectly on both Chrome and Brave browsers

## 🚀 Installation

### Method 1: Load Extension Manually

1. **Download/Clone this repository**
2. **Get a Groq API Key** (free):
   - Visit [Groq Console](https://console.groq.com)
   - Sign up for a free account
   - Generate an API key

3. **Install in Browser**:
   - Open Chrome or Brave browser
   - Go to `chrome://extensions/` (or `brave://extensions/`)
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chromeextentiins` folder
   - The extension should appear in your extensions list

4. **Configure the Extension**:
   - Click the extension icon in your browser toolbar
   - Enter your Groq API key in the settings
   - Toggle "Enable Protection" to activate
   - Customize blocked/allowed sites as needed

## 🔧 Setup & Configuration

### Adding Your Groq API Key

1. Click the extension icon
2. In the "Groq API Configuration" section, paste your API key
3. Click "Save" - the extension will now use AI analysis

### Default Blocked Sites

The extension comes pre-configured to block:
- `sflix.to` (streaming movies)
- `netflix.com`
- `youtube.com`
- `facebook.com`
- `instagram.com`
- `tiktok.com`

### Default Allowed Sites

Educational/productive sites that are always allowed:
- `stackoverflow.com`
- `github.com`
- `developer.mozilla.org`
- `coursera.org`
- `khan-academy.org`

## 🎯 How It Works

1. **URL Analysis**: When you visit a website, the extension first checks if it's in your explicit block/allow lists
2. **AI Content Analysis**: If unknown, it scrapes the page metadata (title, description, content preview)
3. **Groq API Call**: Sends the content to Groq's Llama model for analysis
4. **Smart Decision**: AI determines if the content is educational/productive or distracting/entertainment
5. **Action**: Blocks distracting sites with a beautiful redirect page offering productive alternatives

## 📱 Usage

### Managing Sites
- **Add to Block List**: Enter domain in "Blocked Sites" section and click "Add"
- **Add to Allow List**: Enter domain in "Allowed Sites" section and click "Add"
- **Remove Sites**: Click the "×" button next to any site in the lists

### Viewing Analytics
- **Today's Stats**: See sites blocked and estimated time saved
- **Recent Activity**: View your last 5 blocked attempts
- **Focus Streak**: Track consecutive days of productivity

### Temporary Disable
- Use the toggle switch to temporarily disable protection without losing settings

## 🔒 Privacy & Security

- **API Key Security**: Your Groq API key is stored locally and never shared
- **Data Storage**: All blocking data is stored locally on your device
- **No Tracking**: The extension doesn't track your browsing outside of blocking events
- **Open Source**: Full source code is available for review

## ⚡ Browser Compatibility

### Fully Supported:
- ✅ **Chrome** (Latest versions)
- ✅ **Brave** (Latest versions)
- ✅ **Chromium-based browsers**

### How Brave Compatibility Works:
Brave is built on Chromium, so Chrome extensions work perfectly. The extension specifically:
- Uses manifest v3 for maximum compatibility
- Handles `brave://` URLs properly
- Works with Brave's privacy features
- Maintains all functionality including AI analysis

## 🛠️ Technical Details

### Architecture:
- **Background Service Worker**: Monitors tab navigation and handles AI analysis
- **Content Script**: Scrapes page metadata for AI evaluation
- **Popup Interface**: Beautiful UI for settings and statistics
- **Block Page**: Motivational redirect page with productive alternatives

### AI Integration:
- **Model**: Llama 3 8B via Groq API
- **Analysis**: Title, meta description, keywords, and content preview
- **Decision Logic**: Strict productivity focus - when in doubt, blocks content
- **Fallback**: If AI is unavailable, falls back to explicit lists only

## 📊 Statistics & Analytics

The extension tracks:
- Daily blocked sites count
- Estimated time saved (5 minutes per block)
- Focus streak (consecutive days with blocks)
- Recent blocking activity with timestamps

## 🔧 Troubleshooting

### Extension Not Working:
1. Ensure you've entered a valid Groq API key
2. Check that "Enable Protection" is toggled on
3. Verify you're not on an exempt site (chrome://, extension pages)

### API Issues:
1. Verify your Groq API key is correct
2. Check your Groq account has API credits
3. Ensure stable internet connection

### Sites Not Being Blocked:
1. Check if the site is in your "Allowed Sites" list
2. The AI might have classified it as educational
3. Add to "Blocked Sites" for manual override

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both Chrome and Brave
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with Groq's lightning-fast Llama API
- Inspired by productivity tools like BlockSite and StayFocusd
- Designed for students, professionals, and anyone wanting to stay focused

---

**Stay focused, stay productive! 🚀**

For support or feature requests, please open an issue on GitHub. 