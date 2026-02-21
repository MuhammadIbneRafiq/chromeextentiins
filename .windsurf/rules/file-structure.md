---
description: File structure and organization rules
---

# File Structure Rules

## 📁 Mandatory Directory Structure

### Core Structure
```
src/
├── background/           # Service worker and core logic
├── content/            # Content scripts and CSS
├── popup/              # Extension popup UI
├── analytics/          # AI analysis and focus tracking
├── utils/              # Utility functions and helpers
├── icons/              # Extension icons and assets
├── rules/              # Declarative blocking rules
├── config/             # Configuration files (gitignored)
└── tests/              # Test scripts and utilities
```

### Root Level Files
```
chromeextentiins/
├── manifest.json        # Extension manifest (root level)
├── .env                 # Environment variables (gitignored)
├── .gitignore          # Git ignore rules
├── README.md           # Project documentation
└── src/                # All source code
```

## 🎯 File Placement Rules

### Background Scripts
- **Location**: `src/background/`
- **Files**: Only service worker files
- **Forbidden**: UI components, content scripts
- **Required**: `background.js` as main service worker

### Content Scripts
- **Location**: `src/content/`
- **Files**: Content scripts and CSS
- **Forbidden**: Background logic, popup UI
- **Required**: Proper manifest references

### Popup Components
- **Location**: `src/popup/`
- **Files**: HTML, CSS, JS for popup
- **Forbidden**: Background logic, content scripts
- **Required**: `popup.html`, `popup.js`, `popup.css`

### Analytics Modules
- **Location**: `src/analytics/`
- **Files**: AI analysis, focus tracking
- **Forbidden**: UI components, background core
- **Required**: `advanced-ai-analysis.js`, `focus-analytics.js`

### Utility Functions
- **Location**: `src/utils/`
- **Files**: Helper functions, utilities
- **Forbidden**: Core logic, UI components
- **Required**: `env-loader.js`

## 🔗 Import Path Rules

### Relative Import Patterns
```javascript
// ✅ CORRECT - Background script imports
import { getEnv } from '../utils/env-loader.js';
import { AdvancedAIAnalyzer } from '../analytics/advanced-ai-analysis.js';

// ✅ CORRECT - Content script imports
import { analyzeContent } from '../utils/content-analyzer.js';

// ✅ CORRECT - Popup script imports
import { FocusAnalytics } from '../analytics/focus-analytics.js';
import { formatTime } from '../utils/formatters.js';
```

### Forbidden Import Patterns
```javascript
// ❌ FORBIDDEN - Absolute imports
import { getEnv } from '/src/utils/env-loader.js';
import { AdvancedAIAnalyzer } from '/src/analytics/advanced-ai-analysis.js';

// ❌ FORBIDDEN - Wrong relative paths
import { getEnv } from '../../utils/env-loader.js'; // Too many ../
import { AdvancedAIAnalyzer } from './analytics/advanced-ai-analysis.js'; // Wrong directory
```

## 📋 Manifest Reference Rules

### Service Worker
```json
{
  "background": {
    "service_worker": "src/background/background.js",
    "type": "module"
  }
}
```

### Content Scripts
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "run_at": "document_start"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/cursor-tracker.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["*://*.perplexity.ai/*"],
      "css": ["src/content/block-youtube-perplexity.css"]
    }
  ]
}
```

### Popup
```json
{
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "src/icons/icon16.png",
      "32": "src/icons/icon32.png",
      "48": "src/icons/icon48.png",
      "128": "src/icons/icon128.png"
    }
  }
}
```

### Web Accessible Resources
```json
{
  "web_accessible_resources": [
    {
      "resources": [
        "src/content/block-page.html",
        "src/popup/dashboard.html",
        "src/popup/dashboard.css",
        "src/popup/dashboard.js",
        "src/icons/*"
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Declarative Rules
```json
{
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "rules_yt_on_google",
        "enabled": true,
        "path": "src/rules/rules_yt_on_google.json"
      },
      {
        "id": "rules_yt_on_perplexity",
        "enabled": true,
        "path": "src/rules/rules_yt_on_perplexity.json"
      }
    ]
  }
}
```

## 🚫 Forbidden File Locations

### Root Level (Except Required Files)
- ❌ JavaScript files in root (except build scripts)
- ❌ CSS files in root
- ❌ HTML files in root (except documentation)
- ❌ Configuration files in root (except .env)

### Wrong Directory Placement
- ❌ Background scripts in `src/content/`
- ❌ Content scripts in `src/background/`
- ❌ Popup files in `src/analytics/`
- ❌ Analytics in `src/utils/`

### Mixed Directory Contents
- ❌ UI components in `src/utils/`
- ❌ Background logic in `src/popup/`
- ❌ Content scripts in `src/analytics/`

## ✅ Required File Organization

### Single Responsibility
- Each directory has a single, clear purpose
- Files placed in appropriate directories
- No cross-contamination of concerns

### Clear Naming
- File names reflect their purpose
- Directory names are descriptive
- Consistent naming conventions

### Proper Dependencies
- Import paths reflect directory structure
- No circular dependencies
- Clear dependency hierarchy

## 🔍 Automated Validation

### File Structure Checks
- Verify all files are in correct directories
- Validate manifest references
- Check import path consistency
- Ensure no forbidden file locations

### Import Path Validation
- All imports use correct relative paths
- No broken import references
- Consistent import patterns
- No circular dependencies

### Manifest Validation
- All referenced files exist
- Correct file paths in manifest
- Proper resource declarations
- Valid JSON structure

## 📝 Documentation Requirements

### Directory Documentation
- Each directory should have a README if complex
- Clear purpose for each directory
- File placement guidelines

### File Documentation
- Complex files need JSDoc comments
- Clear purpose for each file
- Dependencies documented
