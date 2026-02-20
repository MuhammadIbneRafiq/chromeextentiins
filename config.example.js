/**
 * Configuration file example
 * Copy this to config.js and add your API key
 * NEVER commit config.js with real API keys to version control
 */

// Add your Groq API key here
const GROQ_API_KEY = 'your_groq_api_key_here';

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GROQ_API_KEY };
} else if (typeof window !== 'undefined') {
  window.CONFIG = { GROQ_API_KEY };
}
