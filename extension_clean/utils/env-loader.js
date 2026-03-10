/**
 * Environment loader for Chrome extension
 * Safely loads environment variables without exposing them in source code
 */

// Load environment variables from .env file (development only)
let envVars = {};

// Try to load from .env file (only works in development/Node.js environment)
if (typeof require !== 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(__dirname, '..', '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  } catch (error) {
    console.warn('Could not load .env file:', error.message);
  }
}

// Export environment variables
export function getEnv(key) {
  return envVars[key] || process?.env?.[key] || undefined;
}

export function hasEnv(key) {
  return !!(envVars[key] || process?.env?.[key]);
}

// For use in non-module contexts
if (typeof window !== 'undefined') {
  window.getEnv = getEnv;
  window.hasEnv = hasEnv;
}

// For CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getEnv, hasEnv };
}
