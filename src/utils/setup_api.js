/**
 * API Setup Script
 * Run this file in Node.js to set up your Groq API key from .env
 */

const fs = require('fs');
const path = require('path');

// Load .env file
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env file not found!');
        return null;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    const env = {};
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...values] = trimmed.split('=');
            if (key && values.length > 0) {
                env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
            }
        }
    });
    
    return env;
}

// Update background.js with the API key
function updateBackgroundJS(apiKey) {
    const bgPath = path.join(__dirname, 'background.js');
    let bgContent = fs.readFileSync(bgPath, 'utf-8');
    
    // Find the DEFAULT_ENCODED_KEY line and update it
    const encodedKey = Buffer.from(apiKey).toString('base64');
    bgContent = bgContent.replace(
        /const DEFAULT_ENCODED_KEY = ['"].*['"]/,
        `const DEFAULT_ENCODED_KEY = '${encodedKey}'`
    );
    
    fs.writeFileSync(bgPath, bgContent);
    console.log('✅ Updated background.js with encoded API key');
}

// Main setup
function setup() {
    console.log('🔧 Setting up Groq API key from .env...\n');
    
    const env = loadEnv();
    if (!env) {
        return;
    }
    
    const apiKey = env.GROQ_API_KEY || env.groq_api_key || env.GROQ_KEY;
    
    if (!apiKey) {
        console.error('❌ No Groq API key found in .env file!');
        console.log('Please add your API key to .env file:');
        console.log('GROQ_API_KEY=your-api-key-here');
        return;
    }
    
    console.log('✅ Found API key in .env');
    console.log('📝 API key starts with:', apiKey.substring(0, 10) + '...');
    
    // Update background.js
    updateBackgroundJS(apiKey);
    
    console.log('\n✨ Setup complete!');
    console.log('Please reload the Chrome extension to use the new API key.');
}

// Run setup
setup();
