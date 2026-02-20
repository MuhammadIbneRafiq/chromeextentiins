# AI Productivity Guardian

A Chrome extension designed to enhance focus and productivity through intelligent content filtering and analytics.

## Overview

AI Productivity Guardian helps users maintain focus by automatically analyzing web content and blocking distracting sites. The extension uses AI-powered semantic analysis to determine if content is relevant to your study or work topics, providing a smart alternative to traditional keyword-based filtering.

## Features

### Core Functionality
- **Smart Content Filtering**: Uses AI to analyze web pages for relevance to your study/work topics
- **Semantic Analysis**: Goes beyond simple keyword matching to understand content context
- **Named Entity Recognition**: Identifies people, organizations, and concepts in web content
- **Focus Analytics**: Tracks time spent on different tabs and productivity metrics
- **Cursor Activity Monitoring**: Analyzes user interaction patterns
- **Tab Switching Analysis**: Monitors browsing patterns and distraction frequency

### Advanced Features
- **Focus Long Mode**: Topic-based filtering using semantic similarity
- **Focus Lock**: Prevents disabling the extension during focus sessions
- **Session Management**: Pre-configured focus sessions with time limits
- **Distraction Override**: Smart bypass system with justification requirements
- **Real-time Analytics**: Live productivity tracking and reporting

### Integration Capabilities
- **Groq API Integration**: Leverages Llama models for content analysis
- **Environment Variable Support**: Secure API key management
- **Webapp Control**: External dashboard for configuration (planned)
- **Calendar Integration**: Schedule-aware distraction management (planned)

## Installation

1. Clone or download this repository
2. Load the extension in Chrome (chrome://extensions/)
3. Configure your Groq API key in the `.env` file:
   ```
   groq_api_key=your_groq_api_key_here
   ```
4. Enable the extension and configure your focus topics

## Usage

### Basic Setup
1. Add your study or work topics in the Focus Long Mode section
2. Set the relevance threshold (recommended: 0.7)
3. Enable Focus Long Mode to activate AI-powered filtering

### Focus Sessions
- Start a focus session to enable automatic content filtering
- Use Focus Lock to prevent accidental disabling
- Configure time limits for structured work periods

### Analytics
- Start focus analytics to track productivity metrics
- View detailed session reports with insights
- Monitor tab switching patterns and cursor activity

## Configuration

### Environment Setup
Create a `.env` file in the root directory:
```env
groq_api_key=your_groq_api_key_here
```

### Extension Settings
- **Focus Long Topics**: Add subjects you're studying or working on
- **Semantic Threshold**: Adjust strictness of content filtering (0.3-0.9)
- **Blocked Sites**: Manually block specific websites
- **Allowed Sites**: Create whitelist for essential resources

## Architecture

```
src/
├── background/           # Service worker and core logic
├── content/            # Content scripts for page analysis
├── popup/              # Extension popup interface
├── analytics/          # Focus analytics and AI modules
├── utils/              # Utility functions and helpers
├── icons/              # Extension icons and assets
├── rules/              # Declarative blocking rules
├── config/             # Configuration files
└── tests/              # Test scripts and utilities
```

## Security

- **No Hardcoded Secrets**: All API keys loaded from environment variables
- **Secure Storage**: Configuration stored in browser storage
- **Privacy-First**: All analytics data processed locally
- **Open Source**: Full code transparency and auditability

## Development

### Environment Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Build extension
npm run build
```

### File Structure
- `src/background/background.js`: Main service worker
- `src/analytics/`: AI analysis modules
- `src/content/`: Page interaction scripts
- `src/popup/`: User interface components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit pull requests with clear descriptions
4. Follow the established code style and structure

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Groq** - For providing fast AI inference capabilities
- **Google Calendar API** - For seamless schedule integration
- **Chrome Extension API** - For powerful browser automation
- **Open Source Community** - For inspiration and tools

## 🔮 Roadmap

- [ ] Mobile app companion
- [ ] Team/family plans
- [ ] Advanced analytics dashboard
- [ ] Integration with more calendar services
- [ ] Voice control capabilities
- [ ] Machine learning model improvements

---

**Extension Guardian** - *Your AI-powered productivity companion* 🚀
