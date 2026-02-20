/**
 * Advanced AI Analysis Module with Similarity Matching & Named Entity Recognition
 * Enhances the existing Groq API integration with sophisticated content understanding
 */

class AdvancedAIAnalyzer {
  constructor(groqApiKey, groqApiUrl) {
    this.groqApiKey = groqApiKey;
    this.groqApiUrl = groqApiUrl;
    this.cache = new Map(); // Cache for similarity results
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.entityExtractionPrompt = this.getEntityExtractionPrompt();
    this.similarityPrompt = this.getSimilarityPrompt();
  }

  /**
   * Extract named entities from content (people, places, organizations, concepts)
   */
  async extractNamedEntities(content) {
    const cacheKey = `entities_${this.hashString(content.substring(0, 200))}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const prompt = `${this.entityExtractionPrompt}

Content to analyze:
"""
${content.substring(0, 2000)}
"""

Extract and categorize entities. Respond in JSON format:`;

      const response = await this.makeGroqRequest(prompt, 300);
      const entities = this.parseEntityResponse(response);
      
      this.setCache(cacheKey, entities);
      return entities;
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return { persons: [], places: [], organizations: [], concepts: [], keywords: [] };
    }
  }

  /**
   * Calculate semantic similarity between content and target topics
   */
  async calculateSemanticSimilarity(content, targetTopics, entities = null) {
    const cacheKey = `sim_${this.hashString(content.substring(0, 100))}_${targetTopics.join(',')}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Extract entities if not provided
      if (!entities) {
        entities = await this.extractNamedEntities(content);
      }

      const prompt = `${this.similarityPrompt}

Target Topics:
${targetTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

Content Entities:
- Persons: ${entities.persons.slice(0, 5).join(', ') || 'None'}
- Organizations: ${entities.organizations.slice(0, 5).join(', ') || 'None'}
- Concepts: ${entities.concepts.slice(0, 5).join(', ') || 'None'}
- Keywords: ${entities.keywords.slice(0, 10).join(', ') || 'None'}

Content Preview:
"""
${content.substring(0, 1500)}
"""

Calculate semantic similarity. Respond in JSON format:`;

      const response = await this.makeGroqRequest(prompt, 200);
      const similarity = this.parseSimilarityResponse(response);
      
      this.setCache(cacheKey, similarity);
      return similarity;
    } catch (error) {
      console.error('Similarity calculation failed:', error);
      return { similarity: 0, confidence: 0, matches: [], reasoning: 'Analysis failed' };
    }
  }

  /**
   * Advanced content analysis combining multiple AI techniques
   */
  async analyzeContentComprehensive(url, title, content, targetTopics, userContext = {}) {
    try {
      // Step 1: Extract named entities
      const entities = await this.extractNamedEntities(content);
      
      // Step 2: Calculate semantic similarity
      const similarity = await this.calculateSemanticSimilarity(content, targetTopics, entities);
      
      // Step 3: Contextual analysis (time of day, user history, etc.)
      const contextualScore = await this.analyzeContext(url, title, entities, userContext);
      
      // Step 4: Intent classification
      const intent = await this.classifyUserIntent(content, entities, targetTopics);
      
      // Step 5: Generate comprehensive recommendation
      const recommendation = await this.generateRecommendation({
        url,
        title,
        entities,
        similarity,
        contextualScore,
        intent,
        targetTopics
      });

      return {
        shouldAllow: recommendation.action === 'allow',
        confidence: recommendation.confidence,
        reasoning: recommendation.reasoning,
        details: {
          entities,
          similarity,
          contextualScore,
          intent,
          recommendation
        }
      };
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      return {
        shouldAllow: true, // Fail safe
        confidence: 0,
        reasoning: 'Analysis failed - allowing by default',
        details: { error: error.message }
      };
    }
  }

  /**
   * Classify user intent based on content and entities
   */
  async classifyUserIntent(content, entities, targetTopics) {
    const prompt = `You are an intent classification expert. Analyze the user's intent based on content and entities.

Target Topics: ${targetTopics.join(', ')}

Content Entities:
- Persons: ${entities.persons.slice(0, 3).join(', ') || 'None'}
- Organizations: ${entities.organizations.slice(0, 3).join(', ') || 'None'}
- Concepts: ${entities.concepts.slice(0, 3).join(', ') || 'None'}

Content Preview:
"""
${content.substring(0, 1000)}
"""

Classify the primary intent. Respond in JSON format:
{
  "intent": "educational|entertainment|social|work|shopping|news|other",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

    try {
      const response = await this.makeGroqRequest(prompt, 150);
      return this.parseIntentResponse(response);
    } catch (error) {
      return { intent: 'other', confidence: 0, reasoning: 'Classification failed' };
    }
  }

  /**
   * Analyze contextual factors
   */
  async analyzeContext(url, title, entities, userContext) {
    const currentHour = new Date().getHours();
    const isWorkHours = currentHour >= 9 && currentHour <= 17;
    const isEducationalDomain = this.isEducationalDomain(url);
    const hasEducationalEntities = entities.organizations.some(org => 
      this.isEducationalEntity(org)
    );

    let contextualScore = 0.5; // Neutral base

    // Time-based scoring
    if (isWorkHours) {
      contextualScore += isEducationalDomain ? 0.3 : -0.2;
    } else {
      contextualScore += isEducationalDomain ? 0.1 : 0.1;
    }

    // Entity-based scoring
    if (hasEducationalEntities) {
      contextualScore += 0.2;
    }

    // Domain-based scoring
    if (this.isProductivityDomain(url)) {
      contextualScore += 0.3;
    } else if (this.isDistractionDomain(url)) {
      contextualScore -= 0.3;
    }

    return Math.max(0, Math.min(1, contextualScore));
  }

  /**
   * Generate final recommendation based on all analysis
   */
  async generateRecommendation(analysisData) {
    const prompt = `You are a productivity assistant making a recommendation about web content access.

Analysis Data:
- URL: ${analysisData.url}
- Title: ${analysisData.title}
- Similarity Score: ${analysisData.similarity.similarity}
- Contextual Score: ${analysisData.contextualScore}
- Intent: ${analysisData.intent.intent} (confidence: ${analysisData.intent.confidence})
- Target Topics: ${analysisData.targetTopics.join(', ')}

Make a recommendation. Respond in JSON format:
{
  "action": "allow|block",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of the decision",
  "suggestedAction": "Optional suggestion for user"
}`;

    try {
      const response = await this.makeGroqRequest(prompt, 200);
      return this.parseRecommendationResponse(response);
    } catch (error) {
      return {
        action: 'allow',
        confidence: 0,
        reasoning: 'Recommendation failed - allowing by default',
        suggestedAction: null
      };
    }
  }

  /**
   * Helper methods
   */
  async makeGroqRequest(prompt, maxTokens = 200) {
    const response = await fetch(this.groqApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '{}';
  }

  parseEntityResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        persons: parsed.persons || [],
        places: parsed.places || [],
        organizations: parsed.organizations || [],
        concepts: parsed.concepts || [],
        keywords: parsed.keywords || []
      };
    } catch {
      return { persons: [], places: [], organizations: [], concepts: [], keywords: [] };
    }
  }

  parseSimilarityResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        similarity: parsed.similarity || 0,
        confidence: parsed.confidence || 0,
        matches: parsed.matches || [],
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch {
      return { similarity: 0, confidence: 0, matches: [], reasoning: 'Parse failed' };
    }
  }

  parseIntentResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        intent: parsed.intent || 'other',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch {
      return { intent: 'other', confidence: 0, reasoning: 'Parse failed' };
    }
  }

  parseRecommendationResponse(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        action: parsed.action || 'allow',
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggestedAction: parsed.suggestedAction || null
      };
    } catch {
      return {
        action: 'allow',
        confidence: 0,
        reasoning: 'Parse failed - allowing by default',
        suggestedAction: null
      };
    }
  }

  isEducationalDomain(url) {
    const educationalDomains = [
      'edu', 'ac.', 'coursera', 'edx', 'khanacademy', 'udemy', 'skillshare',
      'stackoverflow', 'github', 'developer.mozilla', 'w3schools', 'tutorial'
    ];
    return educationalDomains.some(domain => url.includes(domain));
  }

  isProductivityDomain(url) {
    const productivityDomains = [
      'notion', 'trello', 'asana', 'slack', 'teams', 'office', 'google',
      'calendar', 'gmail', 'outlook', 'drive', 'dropbox'
    ];
    return productivityDomains.some(domain => url.includes(domain));
  }

  isDistractionDomain(url) {
    const distractionDomains = [
      'youtube', 'facebook', 'instagram', 'tiktok', 'twitter', 'reddit',
      'netflix', 'hulu', 'disney', 'hbo', 'primevideo'
    ];
    return distractionDomains.some(domain => url.includes(domain));
  }

  isEducationalEntity(entity) {
    const educationalKeywords = [
      'university', 'college', 'school', 'institute', 'academy',
      'research', 'study', 'course', 'class', 'professor', 'student'
    ];
    return educationalKeywords.some(keyword => 
      entity.toLowerCase().includes(keyword)
    );
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getEntityExtractionPrompt() {
    return `You are a named entity recognition expert. Extract entities from the given content.

Categorize entities into:
1. Persons (people names, authors, experts)
2. Places (locations, cities, countries)
3. Organizations (companies, institutions, schools)
4. Concepts (technical terms, ideas, methodologies)
5. Keywords (important terms, topics)

Respond in JSON format:
{
  "persons": ["person1", "person2"],
  "places": ["place1", "place2"],
  "organizations": ["org1", "org2"],
  "concepts": ["concept1", "concept2"],
  "keywords": ["keyword1", "keyword2"]
}`;
  }

  getSimilarityPrompt() {
    return `You are a semantic similarity expert. Calculate how similar the content is to the target topics.

Consider:
1. Direct topic matches
2. Related concepts and entities
3. Educational value
4. Relevance to learning objectives

Provide:
- similarity: 0.0-1.0 (how similar)
- confidence: 0.0-1.0 (how confident)
- matches: array of matching topics/concepts
- reasoning: explanation of the score

Respond in JSON format:
{
  "similarity": 0.8,
  "confidence": 0.9,
  "matches": ["topic1", "concept1"],
  "reasoning": "Detailed explanation"
}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedAIAnalyzer;
} else if (typeof window !== 'undefined') {
  window.AdvancedAIAnalyzer = AdvancedAIAnalyzer;
}
