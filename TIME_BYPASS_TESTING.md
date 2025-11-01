# Time-Based Bypass Testing Guide

## Overview

The extension now implements a **time-based bypass system** for Amsterdam time between **3:30 AM and 6:00 AM**:

- ✅ **During 3:30 AM - 6:00 AM**: All content is allowed EXCEPT vulgar content
- 🚫 **Vulgar content**: ALWAYS BLOCKED (regardless of time)
- 🎬 **Movie content**: Blocked outside the time window, allowed during the time window
- 📚 **Other content**: Follows normal extension rules

## Testing Methods

### Method 1: Interactive HTML Test Suite

**File**: `test_time_bypass.html`

1. Open `test_time_bypass.html` in your browser
2. The page shows current Amsterdam time and bypass window status
3. Use the time simulator to test different times:
   - Set Hour (0-23) and Minute (0-59)
   - Click "Set Simulated Time"
4. Run tests:
   - **Run All Tests**: Complete test suite
   - **Test Time Windows**: Verify time window logic
   - **Test Vulgar Blocking**: Verify vulgar content is always blocked
   - **Test Movie Blocking**: Verify movies are allowed during bypass window

**Features**:
- ⏰ Real-time Amsterdam time display
- 🎮 Time simulator for testing different scenarios
- 📊 Visual test results with pass/fail indicators
- 📈 Summary statistics

### Method 2: Browser Console Testing

**File**: `test_extension_time_bypass.js`

1. Open your browser and install the extension
2. Open Developer Tools (F12)
3. Go to Console tab
4. Copy and paste the entire contents of `test_extension_time_bypass.js`
5. Run commands:

```javascript
// Run all tests
await testExtension()

// Run specific test categories
await testVulgar()    // Test vulgar content blocking
await testMovies()    // Test movie content blocking
await testClean()     // Test clean content

// Simulate different times
await simulateTime(4, 30)   // Simulate 4:30 AM (in bypass window)
await simulateTime(12, 0)   // Simulate 12:00 PM (outside bypass window)
await clearSimulation()     // Clear simulation and use real time
```

**Features**:
- 🎨 Styled console output
- 📋 Detailed test results
- 🕐 Time simulation
- 📊 Automatic summary table

## Test Scenarios

### Time Window Tests

Test various times to verify the bypass window:

| Time     | Expected Result              | Notes                    |
|----------|------------------------------|--------------------------|
| 3:29 AM  | ❌ NOT in bypass window      | 1 minute before start    |
| 3:30 AM  | ✅ IN bypass window          | Start of window          |
| 4:00 AM  | ✅ IN bypass window          | Middle of window         |
| 5:30 AM  | ✅ IN bypass window          | Still inside             |
| 5:59 AM  | ✅ IN bypass window          | Last minute              |
| 6:00 AM  | ❌ NOT in bypass window      | End of window            |
| 12:00 PM | ❌ NOT in bypass window      | Midday                   |

### Vulgar Content Tests

These URLs should **ALWAYS BE BLOCKED** (even during bypass window):

- `https://pornhub.com` - Adult site
- `https://xvideos.com` - Adult site
- `https://example.com/xxx-content` - URL with XXX
- Any URL containing: porn, xxx, adult, sex, nude, etc.

### Movie Content Tests

During **3:30 AM - 6:00 AM**: ✅ ALLOWED
Outside time window: 🚫 BLOCKED

Test URLs:
- `https://netflix.com/watch/123`
- `https://youtube.com/watch?v=movie`
- `https://123movies.com/film`
- `https://hulu.com/series`

### Clean Content Tests

Should **ALWAYS BE ALLOWED**:
- `https://stackoverflow.com/questions`
- `https://github.com/project`
- `https://developer.mozilla.org/docs`
- `https://coursera.org/learn`

## Manual Testing Procedure

### Step 1: Test Outside Bypass Window

1. Ensure current time is NOT between 3:30 AM - 6:00 AM
2. Try accessing:
   - ✅ Clean sites (should be allowed)
   - 🚫 Movie sites (should be BLOCKED)
   - 🚫 Vulgar sites (should be BLOCKED)

### Step 2: Test During Bypass Window

**Option A: Wait for real time (3:30 AM - 6:00 AM Amsterdam time)**

**Option B: Simulate the time**

Using HTML test suite:
1. Open `test_time_bypass.html`
2. Set Hour: 4, Minute: 0
3. Click "Set Simulated Time"
4. Run tests

Using console:
```javascript
await simulateTime(4, 0)  // Simulate 4:00 AM
```

3. Try accessing:
   - ✅ Clean sites (should be allowed)
   - ✅ Movie sites (should be ALLOWED during window)
   - 🚫 Vulgar sites (should STILL be BLOCKED)

### Step 3: Verify Vulgar Blocking

Test at ANY time (3:30 AM or 12:00 PM):
- Navigate to any URL containing vulgar keywords
- Expected: Should be BLOCKED immediately
- Reason shown: "Vulgar content detected in URL"

## Expected Behavior

### During Bypass Window (3:30 AM - 6:00 AM)

```
✅ netflix.com → ALLOWED
✅ youtube.com/movie → ALLOWED  
✅ stackoverflow.com → ALLOWED
🚫 pornhub.com → BLOCKED (vulgar content always blocked)
```

### Outside Bypass Window (6:00 AM - 3:30 AM)

```
🚫 netflix.com → BLOCKED (movie content)
🚫 youtube.com/movie → BLOCKED (movie content)
✅ stackoverflow.com → ALLOWED
🚫 pornhub.com → BLOCKED (vulgar content always blocked)
```

## Troubleshooting

### Time not showing correctly

1. Check your system time zone
2. The extension uses Amsterdam time (Europe/Amsterdam timezone)
3. Verify internet connection (needed for time API)

### Tests failing unexpectedly

1. Clear browser cache: `chrome.storage.local.clear()`
2. Reload extension
3. Check console for error messages
4. Verify extension is enabled

### Simulation not working

1. Make sure to use `await` with async functions
2. Clear simulation: `await clearSimulation()`
3. Check storage: `chrome.storage.local.get('amsTimeCache', console.log)`

## Implementation Details

### Time Check Logic

```javascript
// Convert time to minutes since midnight
const currentMinutes = hour * 60 + minute;
const startMinutes = 3 * 60 + 30;  // 3:30 AM = 210 minutes
const endMinutes = 6 * 60;          // 6:00 AM = 360 minutes

// Check if in bypass window
const inBypassWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
```

### Content Blocking Priority

1. **First**: Check for vulgar content → ALWAYS BLOCK
2. **Second**: Check time window → If in window, allow (except vulgar)
3. **Third**: Check for movie content → Block if outside window
4. **Fourth**: Apply normal extension rules

### Files Modified

- `background.js`:
  - `getAmsterdamTime()` - Now returns {hour, minute}
  - `isInTimeBypassWindow()` - New method to check time window
  - `analyzeAndBlockIfNeeded()` - Updated with time checks
  - `analyzeUrlWithAI()` - Always checks vulgar content first
  - `checkUrlForVulgarContent()` - Vulgar content detection
  
- `content.js`:
  - `analyzeContent()` - Always checks vulgar content first
  - `checkForVulgarContent()` - Content-level vulgar detection

## API Rate Limiting

The extension caches Amsterdam time for 5 minutes to avoid excessive API calls. If testing multiple times quickly, you may see cached results.

To force fresh time lookup:
```javascript
await chrome.storage.local.remove('amsTimeCache');
```

## Success Criteria

All tests should pass with these results:

- ✅ Time window detection: 100% accuracy
- ✅ Vulgar content blocking: ALWAYS blocked (during and outside window)
- ✅ Movie content during window: ALLOWED
- ✅ Movie content outside window: BLOCKED
- ✅ Clean content: ALWAYS allowed

## Support

If tests fail consistently:
1. Check browser console for errors
2. Verify extension permissions
3. Check network connectivity (for time API)
4. Review extension logs in chrome://extensions

---

**Last Updated**: November 2025
**Extension Version**: 1.1.0
**Time Window**: 3:30 AM - 6:00 AM (Amsterdam Time)
