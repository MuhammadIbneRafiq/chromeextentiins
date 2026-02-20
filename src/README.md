# Extension Guardian - AI-Powered Chrome Extension

## 🚀 First-Ever AI-Powered Chrome Extension with Smart Control

Extension Guardian is the **world's first AI-powered Chrome extension** that combines intelligent distraction management with a comprehensive webapp control system. Using advanced AI technology powered by Groq API, it provides unprecedented control over when and how you access distracting websites, while integrating seamlessly with your productivity workflow.

## ✨ Key Features

### 🤖 AI-Powered Intelligence
- **Smart Rule Engine**: Leverages Groq API for intelligent decision-making about when to allow or block distractions
- **Adaptive Scheduling**: AI learns from your patterns and suggests optimal focus times
- **Context-Aware Blocking**: Understands your current tasks and adjusts restrictions accordingly

### 🌐 Webapp Control Center
- **Time Window Management**: Set precise activation and deactivation schedules
- **Rule Configuration**: Create sophisticated rules about when and how distractions are allowed
- **Real-time Monitoring**: Live dashboard showing extension status and activity
- **Remote Control**: Manage your extension settings from any device through the web interface

### 📅 Google Calendar Integration
- **Schedule Sync**: Connect to Google Calendar to see your upcoming tasks and appointments
- **Task-Aware Blocking**: Automatically adjusts restriction levels based on your calendar events
- **Smart Scheduling**: Plans focus periods around your existing commitments
- **Meeting Mode**: Automatically relaxes restrictions during important meetings or breaks

### 🎯 Advanced Distraction Management
- **Site-Specific Rules**: Create custom rules for different websites (YouTube, social media, etc.)
- **Time-Based Exceptions**: Allow limited access during specific time windows
- **Productivity Mode**: Different restriction levels for work vs. personal time
- **Emergency Override**: Quick access when truly needed with usage tracking

### 🛡️ Multi-Layer Protection
- **Chrome Extension**: Browser-level blocking and monitoring
- **Desktop Application**: Native app for system-wide protection
- **Watchdog Service**: Prevents tampering and ensures continuous operation
- **Cross-Platform Sync**: Settings sync across all your devices

## 🏗️ Architecture

### Core Components
- **Chrome Extension** (`manifest.json`, `content.js`, `popup.js`)
- **Background Service** (`background.js`) - AI decision engine
- **Desktop Guardian** (`extension-guardian-desktop.py`)
- **Web Dashboard** (`dashboard.html`, `dashboard.js`)
- **Native Messaging** (`native-messaging-host.py`)

### AI Integration
- **Groq API Integration**: Fast, efficient AI processing for rule evaluation
- **Smart Decision Making**: AI analyzes context, calendar, and user patterns
- **Learning Algorithm**: Improves recommendations over time
- **Real-time Processing**: Instant decisions for seamless user experience

## 🚀 Getting Started

### Prerequisites
- Google Chrome browser
- Python 3.7+ (for desktop components)
- Groq API key (for AI features)
- Google Calendar access (for calendar integration)

### Installation
1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/extension-guardian.git
   cd extension-guardian
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   # Copy .env.example to .env and add your API keys
   cp .env.example .env
   ```

4. **Install the Chrome extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

5. **Start the desktop service**
   ```bash
   python extension-guardian-desktop.py
   ```

6. **Access the web dashboard**
   - Open `dashboard.html` in your browser
   - Configure your initial settings and connect services

### Configuration
1. **Groq API Setup**
   - Get your API key from [Groq](https://groq.com/)
   - Add it to your `.env` file
   - Test the connection in the dashboard

2. **Google Calendar Integration**
   - Authorize access in the dashboard
   - Select calendars to sync
   - Configure event-based rules

3. **Rule Creation**
   - Use the web dashboard to create custom rules
   - Set time windows for different restriction levels
   - Configure site-specific exceptions

## 📱 Usage

### Chrome Extension
- **Popup Interface**: Quick access to settings and status
- **Content Blocking**: Automatic blocking based on AI decisions
- **Usage Tracking**: Monitor your browsing patterns

### Web Dashboard
- **Schedule Management**: Set focus periods and break times
- **Rule Editor**: Create sophisticated blocking rules
- **Calendar View**: See your schedule alongside restriction settings
- **Analytics**: Track productivity and distraction patterns

### Desktop Application
- **System Protection**: Prevents bypassing browser restrictions
- **Service Management**: Start/stop protection services
- **Log Monitoring**: View detailed activity logs

## 🔧 Advanced Features

### AI Rule Examples
```javascript
// Allow YouTube during lunch breaks
if (isLunchBreak() && isYouTube()) {
  allowLimitedAccess(30); // 30 minutes
}

// Block social media during work hours
if (isWorkHours() && isSocialMedia()) {
  blockAccess();
}

// Relax restrictions after completing important tasks
if (completedImportantTask()) {
  allowBreakTime(15);
}
```

### Calendar Integration
- **Meeting Detection**: Automatically identify meetings from calendar
- **Task Priority**: Adjust restrictions based on task importance
- **Buffer Time**: Add focus periods before important events

### Custom Rules
- **Time-Based**: Different rules for morning, afternoon, evening
- **Location-Based**: Adjust based on work/home location
- **Productivity-Based**: Stricter rules during high-focus periods

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** - For providing fast AI inference capabilities
- **Google Calendar API** - For seamless schedule integration
- **Chrome Extension API** - For powerful browser automation
- **Open Source Community** - For inspiration and tools

## 📞 Support

- **Documentation**: See our [Wiki](https://github.com/yourusername/extension-guardian/wiki)
- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/extension-guardian/issues)
- **Discussions**: Join our [Community Discussions](https://github.com/yourusername/extension-guardian/discussions)

## 🔮 Roadmap

- [ ] Mobile app companion
- [ ] Team/family plans
- [ ] Advanced analytics dashboard
- [ ] Integration with more calendar services
- [ ] Voice control capabilities
- [ ] Machine learning model improvements

---

**Extension Guardian** - *Your AI-powered productivity companion* 🚀
