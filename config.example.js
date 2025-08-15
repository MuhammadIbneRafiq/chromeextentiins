// AI Productivity Guardian - Configuration Example
// Copy this file to config.js and add your Groq API key

const CONFIG = {
  // Get your free API key from: https://console.groq.com
  GROQ_API_KEY: 'your_groq_api_key_here',
  
  // Groq API endpoint (don't change unless using a different provider)
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  
  // Model to use for content analysis
  MODEL: 'llama3-8b-8192',
  
  // Default settings
  DEFAULT_SETTINGS: {
    isEnabled: true,
    strictMode: true,  // When in doubt, block
    
    // Time estimates for productivity calculations
    averageTimeWastedPerSite: 5, // minutes
    
    // Sites that are always blocked (manual list)
    blockedSites: [
      'sflix.to',
      'netflix.com', 
      'youtube.com',
      'facebook.com',
      'instagram.com',
      'tiktok.com',
      'twitter.com',
      'reddit.com',
      'twitch.tv',
      'hulu.com',
      'disneyplus.com'
    ],
    
    // Sites that are always allowed (educational/productive)
    allowedSites: [
      'stackoverflow.com',
      'github.com',
      'developer.mozilla.org',
      'coursera.org',
      'khan-academy.org',
      'w3schools.com',
      'freecodecamp.org',
      'codepen.io',
      'medium.com',
      'dev.to',
      'docs.google.com',
      'scholar.google.com'
    ]
  }
};

// Export for use in extension (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} 