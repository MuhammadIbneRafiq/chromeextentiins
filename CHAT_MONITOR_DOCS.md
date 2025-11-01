# 💬 AI Chat Monitor Documentation

## Overview

The **AI Chat Monitor** is a powerful feature that tracks and analyzes your queries on AI chat platforms (ChatGPT, Claude, Perplexity, etc.) to ensure you stay focused on your study topics. It prevents procrastination by detecting and blocking off-topic conversations.

## 🎯 Key Features

### Real-Time Query Analysis
- **Monitors keystrokes** and Enter key presses
- **Analyzes queries** before submission
- **Blocks off-topic** queries instantly
- **Shows warnings** for borderline content
- **Tracks query history** for review

### Smart Detection
- **Semantic analysis** using Groq LLM
- **Context understanding** (not just keywords)
- **Platform-specific** monitoring for each AI chat
- **Relevance scoring** (0.0 - 1.0 scale)

### Progressive Enforcement
1. **First offense**: Warning message
2. **Second offense**: Stronger warning
3. **Third offense**: Chat access blocked
4. **Justification required** to unblock

## 🚀 How It Works

### 1. Query Interception

When you type in an AI chat and press Enter:

```
User types → Monitor captures → Analyzes with LLM → Allow/Block decision
```

### 2. Analysis Process

```javascript
Query: "Help me with k-means clustering"
↓
Topics: ["Data Mining", "Machine Learning"]
↓
Analysis: {
  relevant: true,
  score: 0.85,
  category: "STUDY",
  reason: "Directly related to Data Mining topic"
}
↓
Result: ✅ ALLOWED
```

### 3. Warning System

```javascript
Query: "What's the best Netflix show?"
↓
Analysis: {
  relevant: false,
  score: 0.15,
  category: "OFF-TOPIC",
  reason: "Entertainment, not study related"
}
↓
Result: ⚠️ WARNING (1 of 3)
```

## 📋 Monitored Platforms

### Supported AI Chats

| Platform | URL | Status |
|----------|-----|--------|
| ChatGPT | chat.openai.com | ✅ Fully Supported |
| Claude | claude.ai | ✅ Fully Supported |
| Perplexity | perplexity.ai | ✅ Fully Supported |
| Poe | poe.com | ✅ Fully Supported |
| Bard/Gemini | bard.google.com | ✅ Fully Supported |

## ⚙️ Configuration

### Enable Chat Monitoring

1. **Enable Focus Long Mode** first (required)
2. **Set study topics** (e.g., "Data Mining", "Python")
3. **Navigate to any AI chat**
4. **Monitor activates automatically**

### Settings

```javascript
// In popup.js or via extension popup
{
  enabled: true,                    // Master switch
  topics: ["Data Mining", "ML"],    // Study topics
  threshold: 0.7,                    // Strictness (0.3-0.9)
  warningsBeforeBlock: 3            // Tolerance level
}
```

## 🎬 Query Categories

### ✅ STUDY RELATED (Always Allowed)

Examples:
- "Explain the k-means clustering algorithm"
- "Help me debug this Python code"
- "What are the best practices for data preprocessing?"
- "How do neural networks work?"
- "Can you review my SQL query?"

### ⚠️ SOMEWHAT RELATED (Depends on Threshold)

Examples:
- "Is AI going to replace programmers?"
- "Tell me a coding joke to lighten the mood"
- "What's the history of machine learning?"
- "Career advice for data scientists"

### ❌ OFF-TOPIC (Always Blocked)

Examples:
- "What's on Netflix tonight?"
- "Write me a love poem"
- "Plan my vacation to Hawaii"
- "Latest celebrity gossip"
- "Best restaurants near me"

## 🛡️ Warning & Blocking

### Warning Overlay

When an off-topic query is detected:

```
┌─────────────────────────────────────┐
│  ⚠️ Off-Topic Query Detected!       │
│                                      │
│  Query: "Best Netflix shows..."     │
│  Score: 15% (needed: 70%)          │
│  Topics: Data Mining, Python        │
│                                      │
│  Warning 1 of 3                     │
│                                      │
│  [Stay Focused]  [Override Once]    │
└─────────────────────────────────────┘
```

### Block Screen

After 3 warnings:

```
┌─────────────────────────────────────┐
│  🚫 Chat Access Blocked             │
│                                      │
│  Too many off-topic queries.        │
│  You must justify to continue.      │
│                                      │
│  Study Topics:                      │
│  • Data Mining                      │
│  • Machine Learning                 │
│                                      │
│  [Request Unblock]  [View History]  │
└─────────────────────────────────────┘
```

## 📊 Visual Indicators

### Status Bar
Shows at top of AI chat pages:
```
🎯 Focus Long: Data Mining, ML | Queries: 12 | Warnings: 0
```

### Input Indicator
Small icon next to chat input:
```
[Your message...] 🎯
```

### Success Indicator
Brief animation on allowed queries:
```
✅ On-topic!
```

## 🧪 Testing

### Method 1: Interactive Test Suite

1. Open `test_chat_monitor.html`
2. Select platform (ChatGPT, Claude, etc.)
3. Type test queries
4. See real-time analysis

### Method 2: Live Testing

1. Enable Focus Long mode with topics
2. Go to ChatGPT or Claude
3. Try these queries:
   - ✅ "Help with data mining assignment"
   - ❌ "What should I watch on Netflix?"

### Method 3: Batch Testing

```javascript
// Run in test suite
const testQueries = [
  "Explain clustering",      // ✅ Study
  "Debug my code",           // ✅ Study
  "Tell me a joke",          // ⚠️ Somewhat
  "Netflix recommendations"  // ❌ Off-topic
];
runBatchTest(testQueries);
```

## 🔧 Troubleshooting

### Monitor Not Working?

1. **Check Focus Long is enabled**
   ```javascript
   chrome.runtime.sendMessage({action: 'getFocusLongStatus'}, console.log)
   ```

2. **Verify on supported platform**
   - Must be on ChatGPT, Claude, Perplexity, etc.

3. **Reload the page**
   - Content script may need refresh

### Too Strict/Lenient?

Adjust threshold in popup:
- **0.3-0.5**: Very lenient
- **0.6-0.7**: Balanced (default)
- **0.8-0.9**: Very strict

### Queries Not Being Caught?

1. Check console for errors:
   ```javascript
   console.log(window.chatMonitor)
   ```

2. Verify input selector matches:
   - ChatGPT: `textarea#prompt-textarea`
   - Claude: `div[contenteditable="true"]`

## 📈 Query History

### View in Dashboard

All queries are logged and viewable:

```javascript
// Get history
chrome.storage.local.get(['chatQueryHistory'], result => {
  console.table(result.chatQueryHistory);
});
```

### History Entry Format

```javascript
{
  query: "Help with k-means clustering",
  timestamp: 1699123456789,
  platform: "chatgpt",
  analysis: {
    relevant: true,
    score: 0.85,
    category: "STUDY",
    reason: "Directly related to Data Mining"
  }
}
```

## 🔐 Privacy & Security

### What's Stored

- ✅ Query text (first 100 chars)
- ✅ Analysis results
- ✅ Timestamps
- ✅ Platform used

### What's NOT Stored

- ❌ AI responses
- ❌ Full conversation context
- ❌ Personal identifiers
- ❌ Sensitive data

### Data Retention

- Last 100 queries kept
- Older entries auto-deleted
- Can manually clear history

## 🎯 Best Practices

### For Students

1. **Be specific with topics**
   - Good: "Data Mining", "K-means", "Python pandas"
   - Bad: "Study", "Work", "School"

2. **Start with lower threshold (0.6)**
   - Adjust based on experience
   - Increase gradually if needed

3. **Use override sparingly**
   - Each override is logged
   - Pattern of overrides reduces effectiveness

### For Productivity

1. **Combine with time windows**
   - Stricter during study hours
   - Relaxed during breaks

2. **Review query history weekly**
   - Identify procrastination patterns
   - Adjust topics accordingly

3. **Set clear study sessions**
   - Enable before studying
   - Disable during legitimate breaks

## 🆘 Override & Justification

### When to Override

Legitimate reasons:
- "This joke helps me remember a programming concept"
- "I need a quick break to avoid burnout"
- "This is related to my broader learning goals"

### Justification Requirements

Must be:
- At least 50 characters
- Related to learning/productivity
- Specific and honest

### Override Tracking

All overrides logged:
```javascript
{
  query: "Original off-topic query",
  justification: "User's explanation",
  platform: "chatgpt",
  timestamp: 1699123456789
}
```

## 🚦 Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Query allowed | Continue normally |
| 300 | Borderline query | Show mild warning |
| 400 | Off-topic query | Show strong warning |
| 403 | Blocked | Require justification |

## 📝 Examples

### Scenario 1: Good Study Session

```
Query 1: "Explain supervised learning" → ✅ Allowed
Query 2: "Python code for clustering" → ✅ Allowed
Query 3: "Debug this DataFrame error" → ✅ Allowed
Result: Productive session!
```

### Scenario 2: Getting Distracted

```
Query 1: "Help with assignment" → ✅ Allowed
Query 2: "Best TV shows 2024" → ⚠️ Warning 1
Query 3: "Restaurant recommendations" → ⚠️ Warning 2
Query 4: "Dating advice" → 🚫 BLOCKED
Result: Chat access restricted
```

### Scenario 3: Mixed Usage

```
Query 1: "ML algorithm explanation" → ✅ Allowed
Query 2: "Quick joke break" → ⚠️ Warning (but justified)
Query 3: "Back to clustering help" → ✅ Allowed
Result: Mostly productive with brief break
```

## 🔄 Updates & Improvements

### Coming Soon
- Voice input monitoring
- Multi-language support
- Custom warning messages
- Study streak tracking
- Productivity reports

### Recent Updates
- Added Perplexity support
- Improved Claude detection
- Better context understanding
- Faster analysis response

---

**Version:** 1.1.0  
**Last Updated:** November 2024  
**Powered by:** Groq LLM API

## Quick Reference Card

```
Enable: Focus Long Mode → ON
Topics: Add your subjects
Browse: Go to ChatGPT/Claude
Type: Study-related queries only
Warnings: 3 strikes = blocked
Unblock: Provide justification
```
