// AI Productivity Guardian - Dashboard Script
class DashboardManager {
  constructor() {
    this.settings = {
      isEnabled: true,
      blockedSites: ['sflix.to', 'netflix.com', 'youtube.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
      allowedSites: ['stackoverflow.com', 'github.com', 'github.com', 'developer.mozilla.org', 'coursera.org', 'khan-academy.org', 'tue.video.yuja.com'],
      focusMode: false,
      focusLock: false,
      focusLockEndTime: null,
      allowedMetadata: {
        titleIncludes: [],
        descriptionIncludes: [],
        keywordsIncludes: []
      },
      presets: [],

    };
    this.init();
  }

  async init() {
    console.log('🚀 Dashboard Manager Initializing...');
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.loadStats();
    this.loadRecentActivity();
    this.checkActiveSession();
    console.log('✅ Dashboard Manager Ready');
  }

  async loadSettings() {
    try {
      console.log('📥 Loading settings from storage...');
      const result = await chrome.storage.sync.get(['isEnabled', 'blockedSites', 'allowedSites', 'focusMode', 'focusLock', 'focusLockEndTime', 'allowedMetadata', 'presets']);
      console.log('📥 Retrieved settings:', result);
      
      // Merge with defaults, ensuring all fields exist
      this.settings = { 
        ...this.settings, 
        ...result,
        // Ensure arrays exist even if empty
        blockedSites: result.blockedSites || this.settings.blockedSites,
        allowedSites: result.allowedSites || this.settings.allowedSites,
        allowedMetadata: {
          titleIncludes: result.allowedMetadata?.titleIncludes || [],
          descriptionIncludes: result.allowedMetadata?.descriptionIncludes || [],
          keywordsIncludes: result.allowedMetadata?.keywordsIncludes || [],
          topics: result.allowedMetadata?.topics || []
        },
        presets: result.presets || [],
        focusLockEndTime: result.focusLockEndTime || null
      };
      
      console.log('✅ Settings loaded:', this.settings);
    } catch (error) {
      console.error('❌ Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  setupEventListeners() {
    // Protection controls
    document.getElementById('enabledToggle').addEventListener('change', (e) => {
      this.settings.isEnabled = e.target.checked;
      this.saveSettings();
      this.updateStatusIndicator();
    });

    document.getElementById('focusToggle').addEventListener('change', (e) => {
      if (this.settings.focusLock) { 
        e.preventDefault(); 
        this.showNotification('Focus is locked', 'info'); 
        return; 
      }
      this.settings.focusMode = e.target.checked;
      this.saveSettings();
      this.showNotification(this.settings.focusMode ? 'Focus Session enabled' : 'Focus Session disabled', 'success');
    });

    document.getElementById('focusLockToggle').addEventListener('change', (e) => {
      this.settings.focusLock = e.target.checked;
      this.saveSettings();
      this.updateLockState();
      this.showNotification(this.settings.focusLock ? 'Focus locked' : 'Focus unlocked', 'success');
    });

    // Focus metadata
    document.getElementById('saveFocusSettings').addEventListener('click', () => {
      if (this.settings.focusLock) { 
        this.showNotification('Focus is locked', 'info'); 
        return; 
      }
      const parseCSV = (val) => (val || '').split(',').map(s => s.trim()).filter(Boolean);
      const title = document.getElementById('allowedTitleContains').value;
      const desc = document.getElementById('allowedDescContains').value;
      const keys = document.getElementById('allowedKeywordsContains').value;

      this.settings.allowedMetadata = {
        titleIncludes: parseCSV(title),
        descriptionIncludes: parseCSV(desc),
        keywordsIncludes: parseCSV(keys)
      };
      this.saveSettings();
      this.showNotification('Focus metadata saved', 'success');
    });

    // Preset management
    document.getElementById('savePreset').addEventListener('click', () => {
      if (this.settings.focusLock) { 
        this.showNotification('Focus is locked', 'info'); 
        return; 
      }
      const name = document.getElementById('presetName').value.trim();
      const domains = document.getElementById('presetDomains').value.split(',').map(s=>s.trim()).filter(Boolean);
      const topics = document.getElementById('presetTopics').value.split(',').map(s=>s.trim()).filter(Boolean);
      const durationMin = Math.max(5, Number(document.getElementById('presetDuration').value || 50));
      const maxExtra = Math.max(0, Number(document.getElementById('presetMaxExtraDomains').value || 0));
      
      if (!name || domains.length===0) { 
        this.showNotification('Preset requires name and domains', 'info'); 
        return; 
      }
      
      const preset = { 
        id: `pre_${Date.now()}`, 
        name, 
        allowedDomains: domains, 
        topics, 
        durationMin, 
        maxExtraDomains: maxExtra 
      };
      
      this.settings.presets.push(preset);
      this.saveSettings();
      this.renderPresets();
      this.showNotification('Preset saved', 'success');
      
      // Clear form
      document.getElementById('presetName').value = '';
      document.getElementById('presetDomains').value = '';
      document.getElementById('presetTopics').value = '';
      document.getElementById('presetDuration').value = '50';
      document.getElementById('presetMaxExtraDomains').value = '3';
    });

    // Site management
    document.getElementById('addBlockedSite').addEventListener('click', () => {
      const site = document.getElementById('newBlockedSite').value.trim();
      if (site && !this.settings.blockedSites.includes(site)) {
        this.settings.blockedSites.push(site);
        this.saveSettings();
        this.updateBlockedSitesList();
        document.getElementById('newBlockedSite').value = '';
      }
    });

    document.getElementById('addAllowedSite').addEventListener('click', () => {
      const site = document.getElementById('newAllowedSite').value.trim();
      if (site && !this.settings.allowedSites.includes(site)) {
        this.settings.allowedSites.push(site);
        this.saveSettings();
        this.updateAllowedSitesList();
        document.getElementById('newAllowedSite').value = '';
      }
    });

    // Quick actions
    document.getElementById('clearData').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all blocked activity data?')) {
        chrome.storage.local.clear();
        this.loadStats();
        this.loadRecentActivity();
        this.showNotification('Data cleared successfully!', 'success');
      }
    });

    document.getElementById('exportSettings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('debugSession').addEventListener('click', () => {
      this.debugSession();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshDashboard();
    });

    document.getElementById('openPopupBtn').addEventListener('click', () => {
      // Open the popup in a new tab for quick access
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    });

    // Debug panel controls
    document.getElementById('toggleDebugPanel').addEventListener('click', () => {
      const panel = document.getElementById('debugPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        this.refreshDebugPanel();
      }
    });

    document.getElementById('closeDebugPanel').addEventListener('click', () => {
      document.getElementById('debugPanel').style.display = 'none';
    });

    document.getElementById('clearLogs').addEventListener('click', () => {
      this.clearDebugLogs();
    });

    document.getElementById('exportLogs').addEventListener('click', () => {
      this.exportDebugLogs();
    });

    document.getElementById('analyzeCurrentPage').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    document.getElementById('refreshAnalysis').addEventListener('click', () => {
      this.refreshDebugPanel();
    });

    document.getElementById('inspectStorage').addEventListener('click', () => {
      this.inspectStorage();
    });

    document.getElementById('refreshStorage').addEventListener('click', () => {
      this.inspectStorage();
    });

    // Add event delegation for dynamically created elements
    this.addDynamicEventListeners();
  }

  addDynamicEventListeners() {
    // Handle preset buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-start-btn')) {
        const presetId = e.target.getAttribute('data-preset-id');
        this.startPreset(presetId);
      } else if (e.target.classList.contains('preset-delete-btn')) {
        const presetId = e.target.getAttribute('data-preset-id');
        this.deletePreset(presetId);
      }
    });

    // Handle site removal buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('site-remove-btn')) {
        const site = e.target.getAttribute('data-site');
        const type = e.target.getAttribute('data-type');
        this.removeSite(site, type);
      }
    });
  }

  updateUI() {
    console.log('🔄 Updating Dashboard UI with settings:', this.settings);
    
    // Update toggle states
    document.getElementById('enabledToggle').checked = this.settings.isEnabled;
    document.getElementById('focusToggle').checked = !!this.settings.focusMode;
    document.getElementById('focusLockToggle').checked = !!this.settings.focusLock;
    
    // Update status
    this.updateStatusIndicator();
    
    // Update metadata fields
    document.getElementById('allowedTitleContains').value = (this.settings.allowedMetadata.titleIncludes || []).join(', ');
    document.getElementById('allowedDescContains').value = (this.settings.allowedMetadata.descriptionIncludes || []).join(', ');
    document.getElementById('allowedKeywordsContains').value = (this.settings.allowedMetadata.keywordsIncludes || []).join(', ');
    
    // Update lists
    this.updateBlockedSitesList();
    this.updateAllowedSitesList();
    this.renderPresets();
    
    // Update lock state
    this.updateLockState();
    
    console.log('✅ Dashboard UI Updated');
  }

  updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (this.settings.isEnabled) {
      indicator.classList.remove('disabled');
      statusText.textContent = 'Protection Active';
    } else {
      indicator.classList.add('disabled');
      statusText.textContent = 'Protection Disabled';
    }
    
    console.log('📊 Status Updated:', this.settings.isEnabled ? 'Active' : 'Disabled');
  }

  updateLockState() {
    const disabled = !!this.settings.focusLock;
    ['enabledToggle', 'focusToggle', 'saveFocusSettings', 'allowedTitleContains', 'allowedDescContains', 'allowedKeywordsContains'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
  }

  renderPresets() {
    const list = document.getElementById('presetsList');
    list.innerHTML = '';
    
    console.log('🎯 Rendering presets:', this.settings.presets);
    
    if (!this.settings.presets || this.settings.presets.length === 0) {
      list.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No presets saved yet. Create one above!</p>';
      return;
    }
    
    this.settings.presets.forEach(p => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `
        <div class="preset-info">
          <h4>${p.name}</h4>
          <p>${p.durationMin} min • ${(p.allowedDomains||[]).join(', ')}</p>
          <p style="font-size: 12px; color: #94a3b8;">Topics: ${(p.topics||[]).join(', ') || 'None'} • Extra domains: ${p.maxExtraDomains || 0}</p>
        </div>
        <div class="preset-actions">
          <button class="btn-secondary preset-start-btn" data-preset-id="${p.id}">Start</button>
          <button class="btn-danger preset-delete-btn" data-preset-id="${p.id}">×</button>
        </div>
      `;
      list.appendChild(div);
    });
  }

  startPreset(id) {
    const p = (this.settings.presets||[]).find(x=>x.id===id);
    if (!p) return;
    
    console.log('🚀 Starting preset:', p);
    
    // Override the main focus session settings with preset values
    this.settings.focusMode = true;
    this.settings.allowedMetadata = {
      titleIncludes: p.topics || [],
      descriptionIncludes: p.topics || [],
      keywordsIncludes: p.topics || [],
      topics: p.topics || []
    };
    
    // Save the updated settings first
    this.saveSettings();
    
    // Then start the session
    chrome.runtime.sendMessage({ action: 'startSession', session: {
      name: p.name,
      allowedDomains: p.allowedDomains,
      allowedMetadata: { 
        titleIncludes: p.topics || [],
        descriptionIncludes: p.topics || [],
        keywordsIncludes: p.topics || [],
        topics: p.topics || []
      },
      maxExtraDomains: p.maxExtraDomains || 0,
      durationMin: p.durationMin
    }}, (res)=>{
      this.showNotification(`Session started: ${p.name}`, 'success');
      this.updateUI(); // Refresh the UI to show the new settings
      this.checkActiveSession(); // Update session display
    });
  }

  deletePreset(id) {
    if (this.settings.focusLock) { 
      this.showNotification('Focus is locked', 'info'); 
      return; 
    }
    this.settings.presets = (this.settings.presets||[]).filter(x=>x.id!==id);
    this.saveSettings();
    this.renderPresets();
  }

  updateBlockedSitesList() {
    const container = document.getElementById('blockedSitesList');
    container.innerHTML = '';
    
    this.settings.blockedSites.forEach(site => {
      const siteElement = this.createSiteListItem(site, 'blocked');
      container.appendChild(siteElement);
    });
  }

  updateAllowedSitesList() {
    const container = document.getElementById('allowedSitesList');
    container.innerHTML = '';
    
    this.settings.allowedSites.forEach(site => {
      const siteElement = this.createSiteListItem(site, 'allowed');
      container.appendChild(siteElement);
    });
  }

  createSiteListItem(site, type) {
    const div = document.createElement('div');
    div.className = 'site-item';
    
    div.innerHTML = `
      <span>${site}</span>
      <button class="remove-site site-remove-btn" data-site="${site}" data-type="${type}">×</button>
    `;
    
    return div;
  }

  removeSite(site, type) {
    if (type === 'blocked') {
      this.settings.blockedSites = this.settings.blockedSites.filter(s => s !== site);
      this.updateBlockedSitesList();
    } else {
      this.settings.allowedSites = this.settings.allowedSites.filter(s => s !== site);
      this.updateAllowedSitesList();
    }
    this.saveSettings();
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['blockedEvents']);
      const events = result.blockedEvents || [];
      
      // Count today's blocks
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEvents = events.filter(event => event.timestamp >= today.getTime());
      
      document.getElementById('blockedCount').textContent = todayEvents.length;
      
      // Estimate time saved (5 minutes per block)
      const timesSaved = todayEvents.length * 5;
      document.getElementById('timesSaved').textContent = timesSaved;
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadRecentActivity() {
    try {
      const result = await chrome.storage.local.get(['blockedEvents']);
      const events = result.blockedEvents || [];
      const container = document.getElementById('recentActivity');
      
      if (events.length === 0) {
        container.innerHTML = '<p class="no-activity">No recent blocks</p>';
        return;
      }
      
      // Show last 5 events
      const recentEvents = events.slice(-5).reverse();
      container.innerHTML = '';
      
      recentEvents.forEach(event => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const timeAgo = this.formatTimeAgo(event.timestamp);
        
        activityItem.innerHTML = `
          <div class="activity-site">${event.hostname}</div>
          <div class="activity-reason">${event.reason}</div>
          <div class="activity-time">${timeAgo}</div>
        `;
        
        container.appendChild(activityItem);
      });
      
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  async checkActiveSession() {
    try {
      const { currentSession } = await chrome.storage.sync.get(['currentSession']);
      
      if (currentSession && currentSession.endTime > Date.now()) {
        // Active session found
        const timeLeft = Math.ceil((currentSession.endTime - Date.now()) / 60000);
        console.log('🎯 Active session found:', currentSession.name, 'Time left:', timeLeft, 'minutes');
        
        // Update the focus session toggle to show it's active
        const focusToggle = document.getElementById('focusToggle');
        if (focusToggle) {
          focusToggle.checked = true;
          focusToggle.disabled = true; // Prevent changing during session
        }
        
        // Update session display
        const sessionDisplay = document.getElementById('currentSessionDisplay');
        const stopBtn = document.getElementById('stopSessionBtn');
        
        sessionDisplay.innerHTML = `
          <h4>${currentSession.name}</h4>
          <p>Time remaining: ${timeLeft} minutes</p>
          <p>Allowed domains: ${(currentSession.allowedDomains || []).join(', ')}</p>
          <p>Topics: ${(currentSession.allowedMetadata?.topics || []).join(', ')}</p>
        `;
        stopBtn.style.display = 'inline-block';
        
        // Show session info
        this.showNotification(`Active: ${currentSession.name} (${timeLeft}m left)`, 'success');
      } else {
        // No active session
        const focusToggle = document.getElementById('focusToggle');
        if (focusToggle) {
          focusToggle.disabled = false;
        }
        
        // Update session display
        const sessionDisplay = document.getElementById('currentSessionDisplay');
        const stopBtn = document.getElementById('stopSessionBtn');
        
        sessionDisplay.innerHTML = '<p class="no-session">No active session</p>';
        stopBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  }

  async debugSession() {
    try {
      const { currentSession, focusMode, allowedMetadata } = await chrome.storage.sync.get(['currentSession', 'focusMode', 'allowedMetadata']);
      
      console.log('🔍 DEBUG SESSION STATE:');
      console.log('📋 Current Session:', currentSession);
      console.log('🎯 Focus Mode:', focusMode);
      console.log('📝 Allowed Metadata:', allowedMetadata);
      
      if (currentSession && currentSession.endTime > Date.now()) {
        const timeLeft = Math.ceil((currentSession.endTime - Date.now()) / 60000);
        this.showNotification(`Session: ${currentSession.name} (${timeLeft}m left)`, 'info');
      } else {
        this.showNotification('No active session', 'info');
      }
    } catch (error) {
      console.error('Error debugging session:', error);
    }
  }

  exportSettings() {
    const exportData = {
      ...this.settings,
      groqApiKey: '***hidden***', // Don't export API key for security
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productivity-guardian-settings.json';
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Settings exported successfully!', 'success');
  }

  refreshDashboard() {
    this.loadSettings();
    this.updateUI();
    this.loadStats();
    this.loadRecentActivity();
    this.checkActiveSession();
    this.showNotification('Dashboard refreshed', 'success');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Add slide in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }

  // Debug Panel Methods
  refreshDebugPanel() {
    this.loadDebugLogs();
    this.updateSessionState();
    this.inspectStorage();
  }

  async loadDebugLogs() {
    try {
      const result = await chrome.storage.local.get(['blockedEvents', 'debugLogs']);
      const events = result.blockedEvents || [];
      const debugLogs = result.debugLogs || [];
      const container = document.getElementById('blockingLogs');
      
      if (events.length === 0 && debugLogs.length === 0) {
        container.innerHTML = '<p class="no-logs">No blocking activity yet. Try visiting a distracting site!</p>';
        return;
      }
      
      // Combine and sort all logs
      const allLogs = [...events, ...debugLogs].sort((a, b) => (b.timestamp || b.time) - (a.timestamp || a.time));
      
      container.innerHTML = '';
      
      allLogs.slice(0, 50).forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.blocked ? 'log-blocked' : 'log-allowed'}`;
        
        const time = new Date(log.timestamp || log.time || Date.now()).toLocaleTimeString();
        const url = log.url || log.hostname || 'Unknown';
        const reason = log.reason || log.message || 'No reason provided';
        const metadata = log.metadata || log.contentData || '';
        
        logEntry.innerHTML = `
          <div class="log-time">${time}</div>
          <div class="log-url">${url}</div>
          <div class="log-reason">${reason}</div>
          ${metadata ? `<div class="log-metadata">${JSON.stringify(metadata, null, 2)}</div>` : ''}
        `;
        
        container.appendChild(logEntry);
      });
      
      // Auto-scroll if enabled
      if (document.getElementById('autoScrollLogs').checked) {
        container.scrollTop = container.scrollHeight;
      }
      
    } catch (error) {
      console.error('Error loading debug logs:', error);
    }
  }

  updateSessionState() {
    const container = document.getElementById('sessionState');
    
    if (!this.settings.focusMode) {
      container.innerHTML = '<p class="no-state">No active session</p>';
      return;
    }
    
    const stateItems = [
      { label: 'Focus Mode', value: this.settings.focusMode ? 'Enabled' : 'Disabled' },
      { label: 'Focus Lock', value: this.settings.focusLock ? 'Locked' : 'Unlocked' },
      { label: 'Allowed Topics', value: (this.settings.allowedMetadata.topics || []).join(', ') || 'None' },
      { label: 'Blocked Sites', value: (this.settings.blockedSites || []).join(', ') || 'None' },
      { label: 'Allowed Sites', value: (this.settings.allowedSites || []).join(', ') || 'None' }
    ];
    
    container.innerHTML = '';
    stateItems.forEach(item => {
      const stateItem = document.createElement('div');
      stateItem.className = 'state-item';
      stateItem.innerHTML = `
        <div class="state-label">${item.label}:</div>
        <div class="state-value">${item.value}</div>
      `;
      container.appendChild(stateItem);
    });
  }

  async analyzeCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.showNotification('No active tab found', 'error');
        return;
      }
      
      // Send message to content script to analyze current page
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyzeCurrentPage' });
      
      if (response && response.contentData) {
        this.displayPageAnalysis(response.contentData);
      } else {
        this.showNotification('Could not analyze current page. Make sure you\'re on a regular webpage.', 'info');
      }
      
    } catch (error) {
      console.error('Error analyzing current page:', error);
      this.showNotification('Error analyzing page. Check console for details.', 'error');
    }
  }

  displayPageAnalysis(contentData) {
    const container = document.getElementById('currentPageAnalysis');
    
    if (!contentData) {
      container.innerHTML = '<p class="no-analysis">No analysis data available</p>';
      return;
    }
    
    const analysisItems = [
      { label: 'URL', value: contentData.url || 'Unknown' },
      { label: 'Title', value: contentData.title || 'No title' },
      { label: 'Description', value: contentData.description || 'No description' },
      { label: 'Keywords', value: (contentData.keywords || []).join(', ') || 'No keywords' },
      { label: 'Text Content Preview', value: (contentData.textContent || '').substring(0, 200) + '...' },
      { label: 'Chat Query', value: contentData.chatQuery || 'Not a chat site' },
      { label: 'Is Video Site', value: contentData.isVideoSite ? 'Yes' : 'No' },
      { label: 'Is Social Media', value: contentData.isSocialMedia ? 'Yes' : 'No' },
      { label: 'Is Entertainment', value: contentData.isEntertainment ? 'Yes' : 'No' },
      { label: 'Is Chat Site', value: contentData.isChatSite ? 'Yes' : 'No' }
    ];
    
    container.innerHTML = '';
    analysisItems.forEach(item => {
      const analysisItem = document.createElement('div');
      analysisItem.className = 'analysis-item';
      analysisItem.innerHTML = `
        <div class="analysis-label">${item.label}:</div>
        <div class="analysis-value">${item.value}</div>
      `;
      container.appendChild(analysisItem);
    });
  }

  async inspectStorage() {
    try {
      const [syncResult, localResult] = await Promise.all([
        chrome.storage.sync.get(null),
        chrome.storage.local.get(null)
      ]);
      
      const container = document.getElementById('storageInspection');
      container.innerHTML = '';
      
      // Sync storage
      const syncItem = document.createElement('div');
      syncItem.className = 'storage-item';
      syncItem.innerHTML = `
        <div class="storage-key">Sync Storage:</div>
        <div class="storage-value">${JSON.stringify(syncResult, null, 2)}</div>
      `;
      container.appendChild(syncItem);
      
      // Local storage
      const localItem = document.createElement('div');
      localItem.className = 'storage-item';
      localItem.innerHTML = `
        <div class="storage-key">Local Storage:</div>
        <div class="storage-value">${JSON.stringify(localResult, null, 2)}</div>
      `;
      container.appendChild(localItem);
      
    } catch (error) {
      console.error('Error inspecting storage:', error);
      document.getElementById('storageInspection').innerHTML = '<p class="no-storage">Error loading storage data</p>';
    }
  }

  clearDebugLogs() {
    chrome.storage.local.remove(['debugLogs']);
    document.getElementById('blockingLogs').innerHTML = '<p class="no-logs">Logs cleared</p>';
    this.showNotification('Debug logs cleared', 'success');
  }

  exportDebugLogs() {
    chrome.storage.local.get(['blockedEvents', 'debugLogs'], (result) => {
      const exportData = {
        blockedEvents: result.blockedEvents || [],
        debugLogs: result.debugLogs || [],
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'productivity-guardian-debug-logs.json';
      a.click();
      
      URL.revokeObjectURL(url);
      this.showNotification('Debug logs exported successfully!', 'success');
    });
  }
}

// Initialize dashboard manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardManager = new DashboardManager();
});

// Refresh stats every 30 seconds
setInterval(() => {
  if (window.dashboardManager) {
    window.dashboardManager.loadStats();
    window.dashboardManager.loadRecentActivity();
  }
}, 30000);
