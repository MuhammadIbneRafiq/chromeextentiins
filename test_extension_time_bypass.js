/**
 * Extension Time-Based Bypass Test Script
 * Run this in the browser console to test the extension's time-based bypass logic
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: await testExtension()
 */

const ExtensionTester = {
    testResults: [],
    
    // Test URLs
    testUrls: {
        vulgar: [
            'https://pornhub.com',
            'https://xvideos.com/test',
            'https://example.com/xxx-content',
            'https://adultsite.com/content'
        ],
        movies: [
            'https://netflix.com/watch/123',
            'https://youtube.com/watch?v=movie',
            'https://123movies.com/film',
            'https://hulu.com/series'
        ],
        clean: [
            'https://stackoverflow.com/questions',
            'https://github.com/project',
            'https://developer.mozilla.org/docs',
            'https://coursera.org/learn'
        ]
    },
    
    // Log styled message
    log(message, type = 'info') {
        const styles = {
            info: 'background: #2196F3; color: white; padding: 5px 10px; border-radius: 3px;',
            success: 'background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px;',
            error: 'background: #F44336; color: white; padding: 5px 10px; border-radius: 3px;',
            warning: 'background: #FF9800; color: white; padding: 5px 10px; border-radius: 3px;',
            header: 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; border-radius: 5px; font-size: 16px; font-weight: bold;'
        };
        console.log(`%c${message}`, styles[type] || styles.info);
    },
    
    // Get current Amsterdam time from extension
    async getExtensionTime() {
        try {
            // Try to call extension's time method if exposed
            return await chrome.runtime.sendMessage({ action: 'getAmsterdamTime' });
        } catch {
            // Fallback: calculate ourselves
            const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Amsterdam');
            const data = await response.json();
            return { hour: data.hour, minute: data.minute };
        }
    },
    
    // Check if time is in bypass window
    isInBypassWindow(hour, minute) {
        const currentMinutes = hour * 60 + minute;
        const startMinutes = 3 * 60 + 30; // 3:30 AM
        const endMinutes = 6 * 60; // 6:00 AM
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    },
    
    // Test a single URL
    async testUrl(url, category) {
        this.log(`Testing: ${url}`, 'info');
        
        try {
            // Send message to extension to analyze
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeContent',
                data: {
                    url: url,
                    title: 'Test Page',
                    description: 'Test Description',
                    keywords: '',
                    textContent: 'Test content'
                }
            });
            
            return {
                url,
                category,
                shouldBlock: response.shouldBlock,
                reason: response.reason,
                success: true
            };
        } catch (error) {
            this.log(`Error testing ${url}: ${error.message}`, 'error');
            return {
                url,
                category,
                error: error.message,
                success: false
            };
        }
    },
    
    // Test vulgar content (should ALWAYS be blocked)
    async testVulgarContent() {
        this.log('🚫 Testing Vulgar Content (Should ALWAYS be blocked)', 'header');
        
        const time = await this.getExtensionTime();
        const inWindow = this.isInBypassWindow(time.hour, time.minute);
        
        this.log(`Current Time: ${time.hour}:${String(time.minute).padStart(2, '0')} (${inWindow ? 'IN' : 'NOT IN'} bypass window)`, 'info');
        
        let allPassed = true;
        
        for (const url of this.testUrls.vulgar) {
            const result = await this.testUrl(url, 'vulgar');
            
            if (result.success) {
                // Vulgar content should ALWAYS be blocked
                if (result.shouldBlock) {
                    this.log(`✅ PASS: ${url} - Correctly blocked`, 'success');
                    this.testResults.push({ ...result, passed: true });
                } else {
                    this.log(`❌ FAIL: ${url} - Should be blocked but was allowed!`, 'error');
                    this.testResults.push({ ...result, passed: false });
                    allPassed = false;
                }
            }
        }
        
        return allPassed;
    },
    
    // Test movie content (allowed during bypass window)
    async testMovieContent() {
        this.log('🎬 Testing Movie Content (Allowed 3:30-6:00 AM)', 'header');
        
        const time = await this.getExtensionTime();
        const inWindow = this.isInBypassWindow(time.hour, time.minute);
        
        this.log(`Current Time: ${time.hour}:${String(time.minute).padStart(2, '0')} (${inWindow ? 'IN' : 'NOT IN'} bypass window)`, 'info');
        
        let allPassed = true;
        
        for (const url of this.testUrls.movies) {
            const result = await this.testUrl(url, 'movie');
            
            if (result.success) {
                if (inWindow) {
                    // During bypass window, movies should be allowed
                    if (!result.shouldBlock) {
                        this.log(`✅ PASS: ${url} - Correctly allowed during bypass window`, 'success');
                        this.testResults.push({ ...result, passed: true });
                    } else {
                        this.log(`❌ FAIL: ${url} - Should be allowed during bypass window but was blocked!`, 'error');
                        this.testResults.push({ ...result, passed: false });
                        allPassed = false;
                    }
                } else {
                    // Outside bypass window, movies should be blocked
                    if (result.shouldBlock) {
                        this.log(`✅ PASS: ${url} - Correctly blocked outside bypass window`, 'success');
                        this.testResults.push({ ...result, passed: true });
                    } else {
                        this.log(`⚠️  WARNING: ${url} - Should be blocked outside bypass window but was allowed`, 'warning');
                        this.testResults.push({ ...result, passed: false });
                        allPassed = false;
                    }
                }
            }
        }
        
        return allPassed;
    },
    
    // Test clean content (should always be allowed)
    async testCleanContent() {
        this.log('✅ Testing Clean Content (Should be allowed)', 'header');
        
        let allPassed = true;
        
        for (const url of this.testUrls.clean) {
            const result = await this.testUrl(url, 'clean');
            
            if (result.success) {
                if (!result.shouldBlock) {
                    this.log(`✅ PASS: ${url} - Correctly allowed`, 'success');
                    this.testResults.push({ ...result, passed: true });
                } else {
                    this.log(`❌ FAIL: ${url} - Should be allowed but was blocked!`, 'error');
                    this.testResults.push({ ...result, passed: false });
                    allPassed = false;
                }
            }
        }
        
        return allPassed;
    },
    
    // Run all tests
    async runAllTests() {
        this.log('🧪 Starting Extension Time-Based Bypass Tests', 'header');
        this.testResults = [];
        
        console.log('\n');
        const vulgarPass = await this.testVulgarContent();
        
        console.log('\n');
        const moviePass = await this.testMovieContent();
        
        console.log('\n');
        const cleanPass = await this.testCleanContent();
        
        console.log('\n');
        this.printSummary();
        
        return this.testResults;
    },
    
    // Print summary
    printSummary() {
        this.log('📊 Test Summary', 'header');
        
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        
        console.log('\n');
        console.log(`%cTotal Tests: ${total}`, 'font-size: 18px; font-weight: bold;');
        console.log(`%c✅ Passed: ${passed}`, 'color: #4CAF50; font-size: 18px; font-weight: bold;');
        console.log(`%c❌ Failed: ${failed}`, 'color: #F44336; font-size: 18px; font-weight: bold;');
        console.log(`%cSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`, 'font-size: 18px; font-weight: bold;');
        
        if (failed > 0) {
            console.log('\n');
            this.log('❌ Failed Tests:', 'error');
            this.testResults.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.url} (${r.category}): ${r.reason || r.error}`);
            });
        }
        
        console.log('\n');
        console.table(this.testResults.map(r => ({
            URL: r.url,
            Category: r.category,
            Blocked: r.shouldBlock ? 'YES' : 'NO',
            Passed: r.passed ? '✅' : '❌',
            Reason: r.reason || r.error || 'N/A'
        })));
    },
    
    // Manual time test
    async testSpecificTime(hour, minute) {
        this.log(`🕐 Testing with simulated time: ${hour}:${String(minute).padStart(2, '0')}`, 'header');
        
        const inWindow = this.isInBypassWindow(hour, minute);
        this.log(`Time ${hour}:${String(minute).padStart(2, '0')} is ${inWindow ? 'IN' : 'NOT IN'} bypass window`, 
                 inWindow ? 'success' : 'info');
        
        // Set cache with simulated time
        try {
            await chrome.storage.local.set({ 
                amsTimeCache: { 
                    hour: hour, 
                    minute: minute, 
                    timestamp: Date.now() 
                } 
            });
            this.log('✅ Simulated time set in cache', 'success');
            this.log('⚠️  Note: Clear cache or wait 5 minutes for real time to resume', 'warning');
        } catch (error) {
            this.log(`❌ Could not set simulated time: ${error.message}`, 'error');
        }
    }
};

// Export for easy access
window.ExtensionTester = ExtensionTester;

// Main test function
async function testExtension() {
    return await ExtensionTester.runAllTests();
}

// Individual test functions
async function testVulgar() {
    ExtensionTester.testResults = [];
    await ExtensionTester.testVulgarContent();
    ExtensionTester.printSummary();
}

async function testMovies() {
    ExtensionTester.testResults = [];
    await ExtensionTester.testMovieContent();
    ExtensionTester.printSummary();
}

async function testClean() {
    ExtensionTester.testResults = [];
    await ExtensionTester.testCleanContent();
    ExtensionTester.printSummary();
}

// Time simulation functions
async function simulateTime(hour, minute) {
    await ExtensionTester.testSpecificTime(hour, minute);
}

async function clearSimulation() {
    try {
        await chrome.storage.local.remove('amsTimeCache');
        console.log('%c✅ Time simulation cleared - using real time', 'color: #4CAF50; font-weight: bold;');
    } catch (error) {
        console.error('Error clearing simulation:', error);
    }
}

// Print usage instructions
console.log('%c🧪 Extension Time-Based Bypass Tester Loaded!', 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; font-size: 20px; font-weight: bold;');
console.log('\n%cAvailable Commands:', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('%c  testExtension()          %c- Run all tests', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('%c  testVulgar()             %c- Test vulgar content blocking', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('%c  testMovies()             %c- Test movie content blocking', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('%c  testClean()              %c- Test clean content', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('%c  simulateTime(hour, min)  %c- Simulate specific time (e.g., simulateTime(4, 30))', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('%c  clearSimulation()        %c- Clear time simulation', 'color: #4CAF50; font-weight: bold;', 'color: #666;');
console.log('\n%c💡 Quick Start: Run "await testExtension()" to start testing!', 'background: #FFC107; color: #000; padding: 10px; font-weight: bold;');
