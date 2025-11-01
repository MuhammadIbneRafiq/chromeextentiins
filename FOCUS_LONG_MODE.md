# 📚 Focus Long Mode - AI-Powered Study Assistant

## Overview

**Focus Long Mode** is an advanced feature that uses AI semantic analysis to ensure you only browse content relevant to your study topics. Unlike simple keyword blocking, it understands context and meaning, allowing educational content while blocking distractions.

## ✨ Features

- **🧠 Semantic Analysis**: Uses Groq LLM to understand content meaning, not just keywords
- **🎯 Topic-Based Filtering**: Define your study topics (e.g., "Data Mining", "Machine Learning")
- **📊 Relevance Scoring**: Each website gets a relevance score (0.0 - 1.0)
- **🎓 Educational Platform Support**: Recognizes Canvas, AI chat tools, and learning platforms
- **⚙️ Adjustable Threshold**: Control how strict the filtering is (0.3 - 0.9)

## 🚀 Quick Start

### 1. Enable Focus Long Mode

1. Click the extension icon to open the popup
2. Scroll to **"📚 Focus Long Mode"** section
3. Toggle **"Enable Focus Long Mode"** to ON
4. Add your study topics
5. Click **"Save Focus Long Settings"**

### 2. Add Study Topics

**Example Topics for Data Mining Study:**
- Data Mining
- Machine Learning
- Pattern Recognition
- Big Data Analytics
- Data Warehousing

**Example Topics for Web Development:**
- JavaScript
- React
- Node.js
- CSS
- Web APIs

### 3. Set Relevance Threshold

- **0.3 - 0.5**: Very lenient (allows more content)
- **0.6 - 0.7**: Balanced (recommended)
- **0.8 - 0.9**: Very strict (only highly relevant content)

## 🎯 How It Works

### Semantic Analysis Process

1. **URL Analysis**: Checks the website URL for topic relevance
2. **Title Analysis**: Examines page title for educational content
3. **Content Analysis**: Scans page content for topic-related material
4. **Platform Detection**: Identifies educational platforms (Canvas, Coursera, etc.)
5. **Score Calculation**: Combines all factors into a relevance score
6. **Decision**: Allows if score >= threshold, blocks otherwise

### Content Categories

- **DIRECTLY RELEVANT**: Tutorials, documentation, courses about your topics
- **SUPPORT RELEVANT**: AI tools, Canvas, Q&A sites discussing your topics
- **NOT RELEVANT**: Entertainment, social media, unrelated content

## 📋 Allowed vs Blocked Examples

### When studying "Data Mining":

**✅ ALLOWED:**
- `canvas.tue.nl/courses/data-mining` - Course platform
- `chat.openai.com/?q=clustering-algorithms` - AI assistant for study
- `stackoverflow.com/questions/data-mining` - Q&A about topic
- `github.com/data-mining-project` - Code repositories
- `towardsdatascience.com/mining-patterns` - Educational articles
- `coursera.org/learn/data-analysis` - Online courses
- `arxiv.org/papers/machine-learning` - Research papers

**🚫 BLOCKED:**
- `netflix.com` - Entertainment
- `facebook.com/feed` - Social media  
- `youtube.com/gaming` - Gaming content
- `amazon.com/deals` - Shopping
- `reddit.com/r/funny` - Memes/entertainment
- `instagram.com` - Social media
- `twitch.tv` - Streaming

### Special Cases

**YouTube Education Exception:**
- `youtube.com/edu/data-structures` - ✅ ALLOWED (educational content)
- `youtube.com/watch?v=funny-cats` - 🚫 BLOCKED (entertainment)

**Medium Articles:**
- `medium.com/towards-data-science/mining-patterns` - ✅ ALLOWED (relevant)
- `medium.com/@user/vacation-photos` - 🚫 BLOCKED (not relevant)

## 🧪 Testing the Feature

### Method 1: Interactive Test Suite

1. Open `test_focus_long_mode.html` in your browser
2. Select or enter your study topics
3. Adjust the threshold
4. Run tests to see how different websites would be filtered

### Method 2: Live Testing

1. Enable Focus Long Mode with topics
2. Try visiting different websites:
   - Educational sites → Should be allowed
   - Entertainment sites → Should be blocked
   - AI chat tools → Should be allowed for study help

### Method 3: Console Testing

```javascript
// Check current Focus Long status
chrome.runtime.sendMessage({ action: 'getFocusLongStatus' }, console.log);

// Enable with Data Mining topics
chrome.runtime.sendMessage({
    action: 'setFocusLongMode',
    enabled: true,
    topics: ['Data Mining', 'Machine Learning', 'Big Data'],
    threshold: 0.7
}, console.log);

// Disable Focus Long mode
chrome.runtime.sendMessage({
    action: 'setFocusLongMode',
    enabled: false
}, console.log);
```

## 🎨 Use Case Scenarios

### Scenario 1: Data Science Student

**Topics:** Data Mining, Machine Learning, Python, Statistics
**Threshold:** 0.7

**Result:** Can access Kaggle, Jupyter notebooks, Python docs, Stack Overflow for data science, but blocks Netflix, social media, and gaming sites.

### Scenario 2: Web Developer

**Topics:** React, JavaScript, CSS, Node.js, Web APIs
**Threshold:** 0.6

**Result:** Can access MDN, GitHub, CodePen, dev blogs, but blocks entertainment and shopping sites.

### Scenario 3: Research Mode

**Topics:** Quantum Computing, Physics, Research Papers
**Threshold:** 0.8

**Result:** Very strict - only allows academic papers, research sites, and directly related educational content.

## ⚙️ Configuration Tips

### For Best Results:

1. **Be Specific with Topics**: "Machine Learning" works better than just "Learning"
2. **Add Related Terms**: Include synonyms and related concepts
3. **Start with 0.7 Threshold**: Adjust based on your needs
4. **Include Tool Names**: Add "Canvas", "Jupyter", etc. if you use them
5. **Test First**: Use the test suite to verify settings before studying

### Common Topic Sets:

**Computer Science:**
```
Algorithms, Data Structures, Complexity Theory, 
Dynamic Programming, Graph Theory
```

**Data Science:**
```
Data Mining, Machine Learning, Deep Learning, 
Statistics, Python, R, Data Visualization
```

**Web Development:**
```
HTML, CSS, JavaScript, React, Vue, Angular, 
Node.js, Express, MongoDB, REST APIs
```

**Cybersecurity:**
```
Network Security, Cryptography, Penetration Testing, 
Ethical Hacking, Security Protocols
```

## 🔧 Troubleshooting

### Focus Long not working?

1. **Check API Connection:**
   - Open browser console (F12)
   - Run: `await runTest()` (from test_groq_api.js)
   - Should show "API working"

2. **Verify Topics Are Set:**
   - Check popup shows your topics
   - Ensure mode is enabled (toggle ON)

3. **Adjust Threshold:**
   - If too many sites blocked: Lower threshold (0.5-0.6)
   - If not blocking enough: Raise threshold (0.8-0.9)

### API Errors?

1. **Check API Key:**
   - Ensure `.env` file has valid `GROQ_API_KEY`
   - Run: `node setup_api.js` to reload key

2. **Test API Directly:**
   ```javascript
   // In browser console
   await testWithKey('your-api-key-here')
   ```

## 🔒 Privacy & Security

- **Local Processing**: Initial URL/title checks happen locally
- **Secure API**: Only sends minimal content to Groq for analysis
- **No Storage**: Semantic analysis results are not stored
- **API Key**: Encrypted and stored securely in extension

## 📈 Performance

- **Fast Local Checks**: URLs checked locally first
- **Smart Caching**: Results cached for 5 minutes
- **Efficient API Use**: Only analyzes when needed
- **Minimal Impact**: Adds <500ms to page load

## 🚦 Status Indicators

In the popup, you'll see:
- **Toggle Status**: ON/OFF indicator
- **Topic Count**: Number of active topics
- **Threshold Value**: Current strictness level

When a site is blocked:
- **Reason**: "Focus Long: [specific reason]"
- **Score**: Shows relevance score (0.0-1.0)

## 🎯 Best Practices

1. **Start Broad, Then Narrow**: Begin with general topics, add specific ones as needed
2. **Use During Study Hours**: Perfect for dedicated study sessions
3. **Combine with Time Windows**: Use with 3:30-6:00 AM bypass for flexibility
4. **Regular Reviews**: Adjust topics based on current coursework
5. **Platform Awareness**: Include your learning platform names in topics

## 📝 Examples in Action

### Example 1: Studying for Data Mining Exam

```
Topics: Data Mining, Clustering, Classification, WEKA, Python
Threshold: 0.7
```

**Morning Study Session:**
- ✅ Canvas course page → Allowed
- ✅ ChatGPT for algorithm help → Allowed  
- ✅ Stack Overflow Python questions → Allowed
- 🚫 YouTube trending videos → Blocked
- 🚫 Instagram → Blocked

### Example 2: Web Development Project

```
Topics: React, TypeScript, Tailwind CSS, Next.js
Threshold: 0.6
```

**Coding Session:**
- ✅ React documentation → Allowed
- ✅ GitHub repos → Allowed
- ✅ CSS-Tricks articles → Allowed
- 🚫 Reddit memes → Blocked
- 🚫 Netflix → Blocked

## 🆘 Support

If you need help:
1. Check this documentation
2. Run the test suite
3. Review console logs (F12)
4. Adjust settings and test

---

**Version:** 1.1.0  
**Last Updated:** November 2024  
**Powered by:** Groq LLM API
