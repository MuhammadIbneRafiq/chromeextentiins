/**
 * Test script for AI functionality
 * Run this in Node.js or browser console to test Groq API and AI modules
 */

// Test Groq API connection
async function testGroqAPI() {
    const apiKey = 'YOUR_GROQ_API_KEY_HERE'; // Replace with your actual key
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log('🧪 Testing Groq API connection...');
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ 
                    role: 'user', 
                    content: 'Hello! Please respond with "Groq API is working" to confirm the connection.' 
                }],
                max_tokens: 10,
                temperature: 0.1
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const result = data.choices[0]?.message?.content || 'No response';
        
        console.log('✅ Groq API Test Results:');
        console.log('Response:', result);
        console.log('Model:', data.model);
        console.log('Usage:', data.usage);
        
        return { success: true, response: result, data: data };
    } catch (error) {
        console.error('❌ Groq API Test Failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Test Advanced AI Analyzer
async function testAdvancedAI() {
    console.log('🧪 Testing Advanced AI Analyzer...');
    
    try {
        // Import the module (if in Node.js environment)
        const { AdvancedAIAnalyzer } = await import('./advanced-ai-analysis.js');
        
        const analyzer = new AdvancedAIAnalyzer(
            'YOUR_GROQ_API_KEY_HERE', // Replace with your actual key
            'https://api.groq.com/openai/v1/chat/completions'
        );
        
        // Test entity extraction
        const testContent = "Learn about machine learning algorithms like neural networks and decision trees from Andrew Ng's course on Coursera.";
        const entities = analyzer.extractNamedEntities(testContent);
        
        console.log('✅ Named Entity Extraction Test:');
        console.log('Entities:', entities);
        
        // Test semantic similarity
        const topics = ['machine learning', 'AI', 'data science'];
        const similarity = analyzer.calculateSemanticSimilarity(testContent, topics, entities);
        
        console.log('✅ Semantic Similarity Test:');
        console.log('Similarity Score:', similarity);
        
        // Test comprehensive analysis
        const analysis = await analyzer.analyzeContentComprehensive(
            'https://www.coursera.org/learn/machine-learning',
            'Machine Learning by Andrew Ng',
            testContent,
            topics,
            { browsingHistory: [], timePatterns: {}, preferences: {} }
        );
        
        console.log('✅ Comprehensive Analysis Test:');
        console.log('Analysis Result:', analysis);
        
        return { success: true, entities, similarity, analysis };
    } catch (error) {
        console.error('❌ Advanced AI Test Failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Test Focus Analytics
async function testFocusAnalytics() {
    console.log('🧪 Testing Focus Analytics...');
    
    try {
        const { FocusAnalytics } = await import('./focus-analytics.js');
        const analytics = new FocusAnalytics();
        
        // Test session start
        const sessionStarted = analytics.startFocusSession({
            testMode: true,
            trackingLevel: 'full'
        });
        
        console.log('✅ Session Start Test:', sessionStarted);
        
        // Test recording cursor activity
        analytics.recordCursorActivity({
            x: 100,
            y: 200,
            scrollY: 50,
            clicks: 2,
            keystrokes: 15,
            mouseMovement: 150
        });
        
        // Test recording distraction
        analytics.recordDistraction('youtube.com', 'Entertainment video', 'distraction');
        
        // Test session stop
        const report = analytics.stopFocusSession();
        
        console.log('✅ Session Report Test:');
        console.log('Report Summary:', report.summary);
        console.log('Productivity Score:', report.productivity.score);
        
        return { success: true, sessionStarted, report };
    } catch (error) {
        console.error('❌ Focus Analytics Test Failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting AI Functionality Tests...\n');
    
    const results = {
        groqAPI: await testGroqAPI(),
        advancedAI: await testAdvancedAI(),
        focusAnalytics: await testFocusAnalytics()
    };
    
    console.log('\n📊 Test Summary:');
    console.log('Groq API:', results.groqAPI.success ? '✅ PASS' : '❌ FAIL');
    console.log('Advanced AI:', results.advancedAI.success ? '✅ PASS' : '❌ FAIL');
    console.log('Focus Analytics:', results.focusAnalytics.success ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(r => r.success);
    console.log('\n' + (allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed!'));
    
    return results;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testGroqAPI, testAdvancedAI, testFocusAnalytics, runAllTests };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.runAITests = runAllTests;
    console.log('🧪 AI Test Suite loaded. Run runAITests() to test all functionality.');
}
