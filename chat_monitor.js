/**
 * AI Chat Platform Monitor
 * Monitors and analyzes queries on ChatGPT, Claude, and Perplexity
 * Ensures all conversations are study-related based on Focus Long topics
 */

class ChatMonitor {
    constructor() {
        this.platform = this.detectPlatform();
        this.focusLongTopics = [];
        this.enabled = false;
        this.threshold = 0.7;
        this.queryHistory = [];
        this.warningCount = 0;
        this.blockAfterWarnings = 3;
        
        this.init();
    }
    
    // Detect which AI platform we're on
    detectPlatform() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('chat.openai.com')) return 'chatgpt';
        if (hostname.includes('claude.ai')) return 'claude';
        if (hostname.includes('perplexity.ai')) return 'perplexity';
        if (hostname.includes('poe.com')) return 'poe';
        if (hostname.includes('bard.google.com')) return 'bard';
        
        return 'unknown';
    }
    
    async init() {
        if (this.platform === 'unknown') {
            this.log('❌ Unknown AI platform, monitoring disabled');
            return;
        }
        
        this.log(`🤖 Chat Monitor initialized for ${this.platform}`);
        
        // Load Focus Long settings
        await this.loadSettings();
        
        if (!this.enabled || this.focusLongTopics.length === 0) {
            this.log('⏸️ Chat monitoring disabled or no topics set');
            return;
        }
        
        // Set up monitoring
        this.setupInputMonitoring();
        this.setupSubmitInterception();
        this.injectUI();
        
        // Start periodic checks
        this.startPeriodicCheck();
    }
    
    async loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ 
                action: 'getFocusLongStatus' 
            });
            
            if (response) {
                this.enabled = response.enabled;
                this.focusLongTopics = response.topics || [];
                this.threshold = response.threshold || 0.7;
                
                this.log('✅ Settings loaded:', {
                    enabled: this.enabled,
                    topics: this.focusLongTopics,
                    threshold: this.threshold
                });
            }
        } catch (error) {
            this.log('⚠️ Error loading settings:', error);
        }
    }
    
    setupInputMonitoring() {
        // Platform-specific selectors for input fields
        const inputSelectors = {
            chatgpt: 'textarea[data-id], textarea#prompt-textarea, textarea[placeholder*="Message"]',
            claude: 'div[contenteditable="true"], textarea',
            perplexity: 'textarea, input[type="text"][placeholder*="Ask"]',
            poe: 'textarea[placeholder*="Talk"], textarea',
            bard: 'textarea[placeholder*="Enter"], div[contenteditable="true"]'
        };
        
        const selector = inputSelectors[this.platform] || 'textarea, input[type="text"]';
        
        // Monitor all matching inputs
        this.observeInputs(selector);
    }
    
    observeInputs(selector) {
        // Function to attach listeners to an input
        const attachToInput = (input) => {
            if (input.dataset.monitorAttached) return;
            input.dataset.monitorAttached = 'true';
            
            // Monitor Enter key
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    this.handleSubmitAttempt(input, e);
                }
            });
            
            // Monitor paste events
            input.addEventListener('paste', (e) => {
                setTimeout(() => {
                    this.checkInputContent(input);
                }, 100);
            });
            
            // Add visual indicator
            this.addInputIndicator(input);
        };
        
        // Attach to existing inputs
        document.querySelectorAll(selector).forEach(attachToInput);
        
        // Watch for new inputs (SPA navigation)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches && node.matches(selector)) {
                            attachToInput(node);
                        }
                        node.querySelectorAll && node.querySelectorAll(selector).forEach(attachToInput);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    setupSubmitInterception() {
        // Intercept button clicks
        document.addEventListener('click', (e) => {
            // Check if it's a submit button
            const button = e.target.closest('button');
            if (!button) return;
            
            const buttonText = button.textContent.toLowerCase();
            const isSubmit = buttonText.includes('send') || 
                           buttonText.includes('submit') || 
                           buttonText.includes('ask') ||
                           button.querySelector('svg'); // Many use icons
            
            if (isSubmit) {
                // Find the associated input
                const input = this.findNearestInput(button);
                if (input) {
                    this.handleSubmitAttempt(input, e);
                }
            }
        }, true);
    }
    
    findNearestInput(element) {
        // Platform-specific input finding
        const inputSelectors = {
            chatgpt: 'textarea[data-id], textarea#prompt-textarea',
            claude: 'div[contenteditable="true"]',
            perplexity: 'textarea',
            poe: 'textarea',
            bard: 'textarea, div[contenteditable="true"]'
        };
        
        const selector = inputSelectors[this.platform] || 'textarea';
        
        // Look for input in the same form or container
        const container = element.closest('form, div[class*="input"], div[class*="prompt"]');
        if (container) {
            return container.querySelector(selector);
        }
        
        // Fallback to the last focused input
        return document.querySelector(selector + ':focus') || 
               document.querySelector(selector);
    }
    
    async handleSubmitAttempt(input, event) {
        if (!this.enabled) return;
        
        const query = this.getInputValue(input);
        if (!query || query.trim().length < 3) return;
        
        this.log('📝 Analyzing query:', query);
        
        // Analyze the query
        const analysis = await this.analyzeQuery(query);
        
        // Store in history
        this.queryHistory.push({
            query: query,
            timestamp: Date.now(),
            platform: this.platform,
            analysis: analysis
        });
        
        // Store history for dashboard review
        this.storeQueryHistory();
        
        if (!analysis.relevant) {
            // Prevent submission
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            // Show warning or block
            this.handleOffTopicQuery(input, query, analysis);
            
            return false;
        } else {
            // Query is on-topic, allow it
            this.showSuccessIndicator(input);
            this.resetWarnings();
        }
    }
    
    getInputValue(input) {
        if (input.value !== undefined) {
            return input.value;
        } else if (input.contentEditable === 'true') {
            return input.textContent || input.innerText;
        }
        return '';
    }
    
    async analyzeQuery(query) {
        try {
            // Send to background script for semantic analysis
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeChatQuery',
                query: query,
                topics: this.focusLongTopics,
                threshold: this.threshold
            });
            
            return response || { relevant: false, score: 0, reason: 'Analysis failed' };
        } catch (error) {
            this.log('❌ Error analyzing query:', error);
            // Default to allowing if analysis fails
            return { relevant: true, score: 1, reason: 'Analysis error - allowing' };
        }
    }
    
    handleOffTopicQuery(input, query, analysis) {
        this.warningCount++;
        
        if (this.warningCount >= this.blockAfterWarnings) {
            // Block the page after too many warnings
            this.blockChat(analysis.reason);
        } else {
            // Show warning
            this.showWarning(input, query, analysis);
        }
    }
    
    showWarning(input, query, analysis) {
        // Create warning overlay
        const warning = document.createElement('div');
        warning.className = 'focus-long-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <h3>⚠️ Off-Topic Query Detected!</h3>
                <p><strong>Your query:</strong> "${query.substring(0, 100)}..."</p>
                <p><strong>Reason:</strong> ${analysis.reason}</p>
                <p><strong>Relevance Score:</strong> ${(analysis.score * 100).toFixed(0)}% (needed: ${(this.threshold * 100).toFixed(0)}%)</p>
                <p><strong>Study Topics:</strong> ${this.focusLongTopics.join(', ')}</p>
                <div class="warning-count">Warning ${this.warningCount} of ${this.blockAfterWarnings}</div>
                <div class="warning-actions">
                    <button class="warning-btn-continue">I'll Stay Focused</button>
                    <button class="warning-btn-override">Override Once (Study-Related)</button>
                </div>
            </div>
        `;
        
        // Add styles
        this.injectWarningStyles();
        
        document.body.appendChild(warning);
        
        // Clear input
        if (input.value !== undefined) {
            input.value = '';
        } else if (input.contentEditable === 'true') {
            input.textContent = '';
        }
        
        // Handle buttons
        warning.querySelector('.warning-btn-continue').addEventListener('click', () => {
            warning.remove();
            input.focus();
        });
        
        warning.querySelector('.warning-btn-override').addEventListener('click', () => {
            // Request justification
            const justification = prompt('Please explain how this query is related to your study topics:');
            if (justification && justification.length > 20) {
                // Log the override
                this.logOverride(query, justification);
                // Restore the query
                if (input.value !== undefined) {
                    input.value = query;
                } else {
                    input.textContent = query;
                }
                warning.remove();
                // Reset warning count for this override
                this.warningCount = Math.max(0, this.warningCount - 1);
            } else {
                alert('Please provide a valid justification to override.');
            }
        });
    }
    
    blockChat(reason) {
        // Create full-page block
        const blockOverlay = document.createElement('div');
        blockOverlay.className = 'focus-long-block-overlay';
        blockOverlay.innerHTML = `
            <div class="block-content">
                <h1>🚫 Chat Access Blocked</h1>
                <p class="block-reason">Too many off-topic queries detected</p>
                <p class="block-detail">${reason}</p>
                <div class="block-info">
                    <p>You've been warned ${this.warningCount} times about off-topic queries.</p>
                    <p>To maintain focus, this chat has been temporarily blocked.</p>
                    <p><strong>Your study topics:</strong> ${this.focusLongTopics.join(', ')}</p>
                </div>
                <div class="block-actions">
                    <button id="requestUnblock">Request Unblock (Justify)</button>
                    <button id="viewHistory">View Query History</button>
                    <button id="closeTab">Close This Tab</button>
                </div>
            </div>
        `;
        
        this.injectBlockStyles();
        document.body.appendChild(blockOverlay);
        
        // Handle actions
        document.getElementById('requestUnblock').addEventListener('click', () => {
            this.requestUnblock();
        });
        
        document.getElementById('viewHistory').addEventListener('click', () => {
            this.showQueryHistory();
        });
        
        document.getElementById('closeTab').addEventListener('click', () => {
            window.close();
        });
    }
    
    async requestUnblock() {
        const justification = prompt(
            'Please provide a detailed explanation of why you need to use this chat for studying.\n\n' +
            'Your justification should:\n' +
            '1. Relate to your study topics\n' +
            '2. Explain the specific help you need\n' +
            '3. Be at least 50 characters long'
        );
        
        if (justification && justification.length >= 50) {
            // Send to background for evaluation
            const response = await chrome.runtime.sendMessage({
                action: 'evaluateUnblockRequest',
                justification: justification,
                platform: this.platform
            });
            
            if (response && response.approved) {
                // Reset and reload
                this.warningCount = 0;
                location.reload();
            } else {
                alert('Your justification was not approved. Please stay focused on your study topics.');
            }
        }
    }
    
    showQueryHistory() {
        const historyModal = document.createElement('div');
        historyModal.className = 'query-history-modal';
        
        const recent = this.queryHistory.slice(-10).reverse();
        
        historyModal.innerHTML = `
            <div class="history-content">
                <h2>📜 Recent Query History</h2>
                <div class="history-list">
                    ${recent.map(item => `
                        <div class="history-item ${item.analysis.relevant ? 'relevant' : 'off-topic'}">
                            <div class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
                            <div class="history-query">${item.query.substring(0, 100)}...</div>
                            <div class="history-score">Score: ${(item.analysis.score * 100).toFixed(0)}%</div>
                        </div>
                    `).join('')}
                </div>
                <button class="close-history">Close</button>
            </div>
        `;
        
        document.body.appendChild(historyModal);
        
        historyModal.querySelector('.close-history').addEventListener('click', () => {
            historyModal.remove();
        });
    }
    
    storeQueryHistory() {
        // Store in chrome.storage for dashboard access
        chrome.storage.local.get(['chatQueryHistory'], (result) => {
            const history = result.chatQueryHistory || [];
            history.push(...this.queryHistory.slice(-1));
            
            // Keep only last 100 queries
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
            
            chrome.storage.local.set({ chatQueryHistory: history });
        });
    }
    
    logOverride(query, justification) {
        chrome.runtime.sendMessage({
            action: 'logQueryOverride',
            query: query,
            justification: justification,
            platform: this.platform
        });
    }
    
    resetWarnings() {
        this.warningCount = 0;
    }
    
    showSuccessIndicator(input) {
        // Show brief success animation
        const indicator = document.createElement('div');
        indicator.className = 'query-success-indicator';
        indicator.textContent = '✅ On-topic!';
        
        const rect = input.getBoundingClientRect();
        indicator.style.position = 'fixed';
        indicator.style.left = rect.left + 'px';
        indicator.style.top = (rect.top - 30) + 'px';
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }
    
    addInputIndicator(input) {
        // Add a small indicator showing monitoring is active
        const indicator = document.createElement('div');
        indicator.className = 'monitor-indicator';
        indicator.title = `Focus Long Active: ${this.focusLongTopics.join(', ')}`;
        indicator.innerHTML = '🎯';
        
        // Position near the input
        if (input.parentElement) {
            input.parentElement.style.position = 'relative';
            input.parentElement.appendChild(indicator);
        }
    }
    
    injectUI() {
        // Inject status bar
        const statusBar = document.createElement('div');
        statusBar.className = 'focus-long-status-bar';
        statusBar.innerHTML = `
            <div class="status-content">
                <span class="status-icon">🎯</span>
                <span class="status-text">Focus Long: ${this.focusLongTopics.join(', ')}</span>
                <span class="status-stats">Queries: <span id="queryCount">0</span> | Warnings: ${this.warningCount}</span>
            </div>
        `;
        
        document.body.appendChild(statusBar);
        
        // Update query count periodically
        setInterval(() => {
            const count = document.getElementById('queryCount');
            if (count) count.textContent = this.queryHistory.length;
        }, 1000);
    }
    
    checkInputContent(input) {
        const content = this.getInputValue(input);
        if (content.length > 50) {
            // Pre-check long pastes
            this.analyzeQuery(content).then(analysis => {
                if (!analysis.relevant) {
                    this.highlightOffTopicInput(input);
                }
            });
        }
    }
    
    highlightOffTopicInput(input) {
        input.style.border = '2px solid #ef4444';
        input.style.backgroundColor = '#fef2f2';
        
        setTimeout(() => {
            input.style.border = '';
            input.style.backgroundColor = '';
        }, 3000);
    }
    
    startPeriodicCheck() {
        // Reload settings every 5 minutes
        setInterval(() => {
            this.loadSettings();
        }, 5 * 60 * 1000);
    }
    
    injectWarningStyles() {
        if (document.getElementById('focus-long-warning-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'focus-long-warning-styles';
        styles.textContent = `
            .focus-long-warning {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s;
            }
            
            .warning-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .warning-content h3 {
                color: #f59e0b;
                margin: 0 0 20px 0;
                font-size: 24px;
            }
            
            .warning-content p {
                margin: 10px 0;
                color: #333;
                line-height: 1.5;
            }
            
            .warning-count {
                background: #fee2e2;
                color: #dc2626;
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                font-weight: bold;
                margin: 20px 0;
            }
            
            .warning-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .warning-actions button {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .warning-btn-continue {
                background: #10b981;
                color: white;
            }
            
            .warning-btn-continue:hover {
                background: #059669;
            }
            
            .warning-btn-override {
                background: #f59e0b;
                color: white;
            }
            
            .warning-btn-override:hover {
                background: #d97706;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    injectBlockStyles() {
        if (document.getElementById('focus-long-block-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'focus-long-block-styles';
        styles.textContent = `
            .focus-long-block-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .block-content {
                background: white;
                padding: 40px;
                border-radius: 20px;
                max-width: 600px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            
            .block-content h1 {
                color: #dc2626;
                margin: 0 0 20px 0;
                font-size: 32px;
            }
            
            .block-reason {
                font-size: 20px;
                color: #333;
                margin: 20px 0;
            }
            
            .block-detail {
                color: #666;
                margin: 10px 0;
            }
            
            .block-info {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 10px;
                margin: 30px 0;
                text-align: left;
            }
            
            .block-info p {
                margin: 10px 0;
                color: #4b5563;
            }
            
            .block-actions {
                display: flex;
                gap: 15px;
                margin-top: 30px;
            }
            
            .block-actions button {
                flex: 1;
                padding: 15px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            #requestUnblock {
                background: #10b981;
                color: white;
            }
            
            #viewHistory {
                background: #3b82f6;
                color: white;
            }
            
            #closeTab {
                background: #ef4444;
                color: white;
            }
            
            .query-history-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .history-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 600px;
                max-height: 70vh;
                overflow-y: auto;
            }
            
            .history-item {
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                border-left: 4px solid;
            }
            
            .history-item.relevant {
                background: #f0fdf4;
                border-color: #10b981;
            }
            
            .history-item.off-topic {
                background: #fef2f2;
                border-color: #ef4444;
            }
            
            .monitor-indicator {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 20px;
                cursor: help;
                z-index: 1000;
            }
            
            .focus-long-status-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 30px;
                background: linear-gradient(90deg, #667eea, #764ba2);
                color: white;
                z-index: 99999;
                display: flex;
                align-items: center;
                padding: 0 20px;
                font-size: 14px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            
            .status-content {
                display: flex;
                align-items: center;
                gap: 20px;
                width: 100%;
            }
            
            .status-icon {
                font-size: 18px;
            }
            
            .status-text {
                flex: 1;
                font-weight: bold;
            }
            
            .status-stats {
                font-size: 12px;
                opacity: 0.9;
            }
            
            .query-success-indicator {
                position: fixed;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
                z-index: 10000;
                animation: slideUp 2s;
                pointer-events: none;
            }
            
            @keyframes slideUp {
                0% { opacity: 0; transform: translateY(10px); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[Chat Monitor ${timestamp}] ${message}`, data || '');
        
        // Also send to background script for central logging
        chrome.runtime.sendMessage({
            action: 'chatMonitorLog',
            message: message,
            data: data,
            platform: this.platform
        }).catch(() => {});
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatMonitor = new ChatMonitor();
    });
} else {
    window.chatMonitor = new ChatMonitor();
}
