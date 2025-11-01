/**
 * Groq API Test Script
 * Run this to verify your API key is working
 */

// Test function for Groq API
async function testGroqAPI(apiKey) {
    const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    
    console.log('🔧 Testing Groq API key...');
    
    if (!apiKey) {
        console.error('❌ No API key provided!');
        return false;
    }
    
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{
                    role: 'user',
                    content: 'Test message. Reply with "API working" only.'
                }],
                max_tokens: 10,
                temperature: 0
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Groq API is working!');
            console.log('Response:', data.choices[0]?.message?.content);
            return true;
        } else {
            console.error('❌ API error:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('Error details:', errorData);
            return false;
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
        return false;
    }
}

// Get API key from storage and test
async function runTest() {
    try {
        // Try to get from Chrome storage
        const result = await chrome.storage.sync.get(['groqApiKey']);
        
        if (result.groqApiKey) {
            console.log('📦 Found API key in storage');
            return await testGroqAPI(result.groqApiKey);
        } else {
            console.log('⚠️ No API key found in storage');
            console.log('Please set your Groq API key first');
            return false;
        }
    } catch (error) {
        console.error('Error accessing storage:', error);
        return false;
    }
}

// Manual test with API key
async function testWithKey(apiKey) {
    return await testGroqAPI(apiKey);
}

// Set API key in storage
async function setApiKey(apiKey) {
    try {
        await chrome.storage.sync.set({ groqApiKey: apiKey });
        console.log('✅ API key saved to storage');
        return true;
    } catch (error) {
        console.error('Error saving API key:', error);
        return false;
    }
}

// Instructions
console.log(`
%c🧪 Groq API Tester
%cAvailable commands:
  runTest()                - Test API key from storage
  testWithKey('your-key')  - Test specific API key
  setApiKey('your-key')    - Save API key to storage
`, 'color: #4CAF50; font-size: 16px; font-weight: bold;', 'color: #666;');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testGroqAPI, runTest, testWithKey, setApiKey };
}
