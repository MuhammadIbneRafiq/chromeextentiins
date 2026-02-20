class PopupManager {
  constructor() {
    this.settings = {
      isEnabled: true,
      blockedSites: ['sflix.to', 'netflix.com', 'youtube.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
      allowedSites: ['stackoverflow.com', 'github.com', 'developer.mozilla.org', 'coursera.org', 'khan-academy.org', 'tue.video.yuja.com'],
      focusMode: false,
      focusLock: false,
      focusLockEndTime: null,
      allowedMetadata: {
        titleIncludes: [],
        descriptionIncludes: [],
        keywordsIncludes: []
      },
      presets: [
        // Default preset for quick testing
        {
          id: 'default_algebra',
          name: 'Algebra for Security',
          allowedDomains: ['canvas.tue.nl', 'stackoverflow.com', 'github.com', 'developer.mozilla.org'],
          topics: ['algebra', 'security', 'data mining', 'cryptography', 'algorithms', 'mathematics', 'computer science'],
          maxExtra: 3,
          durationMin: 50
        }
      ],

    };
    this.init();
  }

  async init() {
    console.log('🚀 Popup Manager Initializing...');
    await this.loadSettings();
    this.setupEventListeners();
    await this.updateUI();
    this.loadStats();
    this.loadRecentActivity();
    this.loadDebugLogs();
    
    // Auto-start default preset if no session is active
    this.autoStartDefaultPreset();
    
    console.log('✅ Popup Manager Ready');
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
        presets: result.presets || []
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
    // Enable/disable toggle
    document.getElementById('enabledToggle').addEventListener('change', async (e) => {
      this.settings.isEnabled = e.target.checked;
      this.saveSettings();
      await this.updateStatusIndicator();
    });

    // Focus toggle
    document.getElementById('focusToggle').addEventListener('change', (e) => {
      if (this.settings.focusLock) { e.preventDefault(); this.showNotification('Focus is locked', 'info'); return; }
      this.settings.focusMode = e.target.checked;
      this.saveSettings();
      this.showNotification(this.settings.focusMode ? 'Focus Session enabled' : 'Focus Session disabled', 'success');
    });

    // Save focus settings
    document.getElementById('saveFocusSettings').addEventListener('click', () => {
      if (this.settings.focusLock) { this.showNotification('Focus is locked', 'info'); return; }
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

    // Focus lock toggle - now just shows/hides the timer input
    document.getElementById('focusLockToggle').addEventListener('change', (e) => {
      if (e.target.checked) {
        // Show timer input but DON'T activate lock yet
        this.showTimerInput();
      } else {
        // Hide timer input and deactivate lock if it was active
        this.hideTimerInput();
        if (this.settings.focusLock) {
          // If lock is active, prevent manual unlock and show warning
          e.preventDefault();
          e.target.checked = true; // Keep it checked
          this.showNotification('Focus lock is active and cannot be disabled until timer expires', 'error');
          return;
        }
        this.deactivateFocusLock();
      }
    });

    // Note: Yuja platform (tue.video.yuja.com) is completely exempt from all extension functionality
    // including focus locks, focus sessions, and content analysis

    // Activate focus lock button with confirmation
    document.getElementById('activateFocusLock')?.addEventListener('click', () => {
      this.activateFocusLockWithConfirmation();
    });

    // Debug console controls
    document.getElementById('clearDebugLogs').addEventListener('click', () => this.clearDebugLogs());
    document.getElementById('refreshDebugLogs').addEventListener('click', () => this.loadDebugLogs());
    document.getElementById('openConsole').addEventListener('click', () => this.openBrowserConsole());

    // Add blocked site
    document.getElementById('addBlockedSite').addEventListener('click', () => {
      const site = document.getElementById('newBlockedSite').value.trim();
      if (site && !this.settings.blockedSites.includes(site)) {
        this.settings.blockedSites.push(site);
        this.saveSettings();
        this.updateBlockedSitesList();
        document.getElementById('newBlockedSite').value = '';
      }
    });

    // Add allowed site
    document.getElementById('addAllowedSite').addEventListener('click', () => {
      const site = document.getElementById('newAllowedSite').value.trim();
      if (site && !this.settings.allowedSites.includes(site)) {
        this.settings.allowedSites.push(site);
        this.saveSettings();
        this.updateAllowedSitesList();
        document.getElementById('newAllowedSite').value = '';
      }
    });

    // Enter key support for inputs
    document.getElementById('newBlockedSite').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('addBlockedSite').click();
      }
    });

    document.getElementById('newAllowedSite').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('addAllowedSite').click();
      }
    });

    // Removed groqApiKey event listener - element no longer exists

    // Clear data
    document.getElementById('clearData').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all blocked activity data?')) {
        chrome.storage.local.clear();
        this.loadStats();
        this.loadRecentActivity();
        this.showNotification('Data cleared successfully!', 'success');
      }
    });

    // Export settings
    document.getElementById('exportSettings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('openDashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });

    // Debug session
    document.getElementById('debugSession')?.addEventListener('click', () => {
      this.debugSession();
    });

    // Extension protection controls
    document.getElementById('checkExtensionStatus')?.addEventListener('click', () => {
      this.checkExtensionStatus();
    });

    document.getElementById('forceReEnable')?.addEventListener('click', () => {
      this.forceReEnable();
    });

    document.getElementById('openExtensionsPage')?.addEventListener('click', () => {
      this.openExtensionsPage();
    });

    // Preset save
    document.getElementById('savePreset').addEventListener('click', () => {
      if (this.settings.focusLock) { this.showNotification('Focus is locked', 'info'); return; }
      const name = document.getElementById('presetName').value.trim();
      const domains = document.getElementById('presetDomains').value.split(',').map(s=>s.trim()).filter(Boolean);
      const topics = document.getElementById('presetTopics').value.split(',').map(s=>s.trim()).filter(Boolean);
      const durationMin = Math.max(5, Number(document.getElementById('presetDuration').value || 50));
      const maxExtra = Math.max(0, Number(document.getElementById('presetMaxExtraDomains').value || 0));
      if (!name || domains.length===0) { this.showNotification('Preset requires name and domains', 'info'); return; }
      const preset = { id: `pre_${Date.now()}`, name, allowedDomains: domains, topics, durationMin, maxExtraDomains: maxExtra };
      this.settings.presets.push(preset);
      this.saveSettings();
      this.renderPresets();
      this.showNotification('Preset saved', 'success');
    });

    // Focus Long mode handlers
    document.getElementById('focusLongToggle').addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      document.getElementById('focusLongStatus').textContent = enabled ? 'ON' : 'OFF';
      
      await chrome.runtime.sendMessage({
        action: 'setFocusLongMode',
        enabled: enabled,
        topics: focusLongTopics,
        threshold: parseFloat(document.getElementById('semanticThreshold').value)
      });
      
      if (enabled) {
        this.showNotification('Focus Long mode enabled - only study-related content will be allowed', 'success');
      } else {
        this.showNotification('Focus Long mode disabled', 'info');
      }
    });
    
    // Add topic
    document.getElementById('addFocusLongTopic').addEventListener('click', () => {
      const input = document.getElementById('focusLongTopic');
      const topic = input.value.trim();
      
      if (topic && !focusLongTopics.includes(topic)) {
        focusLongTopics.push(topic);
        updateFocusLongTopicsList();
        input.value = '';
      }
    });
    
    // Save Focus Long settings
    document.getElementById('saveFocusLongSettings').addEventListener('click', async () => {
      const enabled = document.getElementById('focusLongToggle').checked;
      const threshold = parseFloat(document.getElementById('semanticThreshold').value);
      
      await chrome.runtime.sendMessage({
        action: 'setFocusLongMode',
        enabled: enabled,
        topics: focusLongTopics,
        threshold: threshold
      });
      
      this.showNotification('Focus Long settings saved!', 'success');
    });
    
    // Clear topics
    document.getElementById('clearFocusLongTopics').addEventListener('click', () => {
      focusLongTopics = [];
      updateFocusLongTopicsList();
      this.showNotification('All topics cleared', 'info');
    });
    
    // Threshold slider
    document.getElementById('semanticThreshold').addEventListener('input', (e) => {
      document.getElementById('thresholdValue').textContent = e.target.value;
    });

    // Add event delegation for dynamically created elements
    this.addDynamicEventListeners();
  }

  async updateUI() {
    console.log('🔄 Updating UI with settings:', this.settings);
    
    // Update toggle state
    document.getElementById('enabledToggle').checked = this.settings.isEnabled;
    
    // Update status
    await this.updateStatusIndicator();
    
    // Update lists
    this.updateBlockedSitesList();
    this.updateAllowedSitesList();
    
    // Focus controls
    document.getElementById('focusToggle').checked = !!this.settings.focusMode;
    const lockEl = document.getElementById('focusLockToggle');
    if (lockEl) { lockEl.checked = !!this.settings.focusLock; }
    this.updateLockState();
    
    // Update metadata fields with saved values
    document.getElementById('allowedTitleContains').value = (this.settings.allowedMetadata.titleIncludes || []).join(', ');
    document.getElementById('allowedDescContains').value = (this.settings.allowedMetadata.descriptionIncludes || []).join(', ');
    document.getElementById('allowedKeywordsContains').value = (this.settings.allowedMetadata.keywordsIncludes || []).join(', ');

    // Presets
    this.renderPresets();
    this.renderHistory();
    
    // Check for active session and update UI accordingly
    this.checkActiveSession();
    
    // Start timer update interval
    this.startTimerUpdate();
    
    console.log('✅ UI Updated');
  }

  startTimerUpdate() {
    // Update focus lock timer every minute
    setInterval(() => {
      this.updateFocusLockTimer();
    }, 60000); // Every minute
    
    // Initial update
    this.updateFocusLockTimer();
  }

  updateLockState() {
    const disabled = !!this.settings.focusLock;
    const lockToggle = document.getElementById('focusLockToggle');
    const timerGroup = document.getElementById('focusLockTimerGroup');
    
    // Disable controls when locked
    ['enabledToggle','focusToggle','saveFocusSettings','allowedTitleContains','allowedDescContains','allowedKeywordsContains'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    
    // IMPORTANT: When lock is active, disable the toggle itself and show it's locked
    if (lockToggle) {
      if (disabled) {
        lockToggle.disabled = true;
        lockToggle.style.opacity = '0.6';
        lockToggle.style.cursor = 'not-allowed';
        // Add visual indicator that it's locked
        lockToggle.title = 'Focus lock is active - cannot be manually disabled until timer expires';
      } else {
        lockToggle.disabled = false;
        lockToggle.style.opacity = '1';
        lockToggle.style.cursor = 'pointer';
        lockToggle.title = 'Lock Focus & Protection (prevents turning off during sessions)';
      }
    }
    
    // Show/hide lock status indicator
    const lockStatusIndicator = document.getElementById('lockStatusIndicator');
    if (lockStatusIndicator) {
      if (disabled) {
        lockStatusIndicator.style.display = 'block';
        // Update status message with remaining time
        const lockStatusMessage = document.getElementById('lockStatusMessage');
        if (lockStatusMessage && this.settings.focusLockEndTime) {
          const timeRemaining = this.settings.focusLockEndTime - Date.now();
          if (timeRemaining > 0) {
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
            lockStatusMessage.textContent = `Cannot be manually disabled - ${hours}h ${minutes}m remaining`;
          } else {
            lockStatusMessage.textContent = 'Cannot be manually disabled until timer expires';
          }
        }
      } else {
        lockStatusIndicator.style.display = 'none';
      }
    }
    
    // Show timer input when lock toggle is checked (even if not active yet)
    if (timerGroup) {
      timerGroup.style.display = lockToggle && lockToggle.checked ? 'block' : 'none';
    }
    
    // Update timer input values if lock is active
    if (disabled && this.settings.focusLockEndTime) {
      const hoursInput = document.getElementById('focusLockHours');
      const minutesInput = document.getElementById('focusLockMinutes');
      if (hoursInput && minutesInput) {
        const timeRemaining = this.settings.focusLockEndTime - Date.now();
        const remainingHours = Math.floor(timeRemaining / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        hoursInput.value = Math.max(0, remainingHours);
        minutesInput.value = Math.max(1, remainingMinutes);
      }
    }
    
    // Check if lock should auto-expire
    if (disabled && this.settings.focusLockEndTime && Date.now() >= this.settings.focusLockEndTime) {
      this.autoUnlockFocus();
    }
    
    // Update timer display
    this.updateFocusLockTimer();
  }

  autoUnlockFocus() {
    console.log('🔓 Auto-unlocking focus lock - timer expired');
    this.settings.focusLock = false;
    this.settings.focusLockEndTime = null;
    this.saveSettings();
    
    // Update UI
    const lockToggle = document.getElementById('focusLockToggle');
    if (lockToggle) {
      lockToggle.checked = false;
    }
    
    // Reset page title
    document.title = 'AI Guardian';
    
    this.updateLockState();
    this.showNotification('Focus lock automatically expired', 'success');
  }

  updateFocusLockTimer() {
    if (!this.settings.focusLock || !this.settings.focusLockEndTime) {
      const timerDisplay = document.getElementById('focusLockTimerDisplay');
      if (timerDisplay) {
        timerDisplay.style.display = 'none';
      }
      return;
    }

    const now = Date.now();
    const timeRemaining = this.settings.focusLockEndTime - now;
    
    if (timeRemaining <= 0) {
      this.autoUnlockFocus();
      return;
    }

    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
    
    const timeRemainingEl = document.getElementById('focusLockTimeRemaining');
    const timerDisplay = document.getElementById('focusLockTimerDisplay');
    
    if (timeRemainingEl && timerDisplay) {
      timeRemainingEl.textContent = `${hours}h ${minutes}m`;
      timerDisplay.style.display = 'block';
      
      // Make timer display more prominent when locked
      timerDisplay.style.background = 'rgba(220, 38, 38, 0.1)';
      timerDisplay.style.border = '2px solid #dc2626';
      timerDisplay.style.color = '#dc2626';
      timerDisplay.style.fontWeight = 'bold';
      
      // Also update the page title to show remaining time
      if (hours > 0 || minutes > 0) {
        document.title = `🔒 Focus Lock: ${hours}h ${minutes}m remaining - AI Guardian`;
      }
    }
  }

  showTimerInput() {
    const timerGroup = document.getElementById('focusLockTimerGroup');
    if (timerGroup) {
      timerGroup.style.display = 'block';
    }
  }

  hideTimerInput() {
    const timerGroup = document.getElementById('focusLockTimerGroup');
    if (timerGroup) {
      timerGroup.style.display = 'none';
    }
  }

  activateFocusLockWithConfirmation() {
    const hours = parseInt(document.getElementById('focusLockHours').value) || 0;
    const minutes = parseInt(document.getElementById('focusLockMinutes').value) || 30;
    
    if (hours === 0 && minutes === 0) {
      this.showNotification('Please set a duration greater than 0', 'error');
      return;
    }

    const totalMinutes = (hours * 60) + minutes;
    const confirmMessage = `Are you sure you want to lock focus for ${hours}h ${minutes}m?\n\nThis will:\n• Disable all protection toggles\n• Prevent changing settings\n• Auto-unlock after ${totalMinutes} minutes\n\nYou CANNOT manually unlock until the timer expires!`;
    
    if (confirm(confirmMessage)) {
      this.activateFocusLock(hours, minutes);
    }
  }

  activateFocusLock(hours, minutes) {
    const totalMs = ((hours * 60) + minutes) * 60 * 1000;
    this.settings.focusLockEndTime = Date.now() + totalMs;
    this.settings.focusLock = true;
    this.saveSettings();
    
    // Update UI
    const lockToggle = document.getElementById('focusLockToggle');
    if (lockToggle) {
      lockToggle.checked = true;
    }
    
    this.updateLockState();
    this.showNotification(`Focus locked for ${hours}h ${minutes}m`, 'success');
    
    // Set timer to automatically unlock
    setTimeout(() => {
      this.autoUnlockFocus();
    }, totalMs);
  }

  deactivateFocusLock() {
    this.settings.focusLock = false;
    this.settings.focusLockEndTime = null;
    this.saveSettings();
    
    // Update UI
    const lockToggle = document.getElementById('focusLockToggle');
    if (lockToggle) {
      lockToggle.checked = false;
    }
    
    this.updateLockState();
    this.showNotification('Focus unlocked', 'success');
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
      div.className = 'site-item';
      div.innerHTML = `
        <div>
          <div><strong>${p.name}</strong> • ${p.durationMin} min</div>
          <div style="font-size:12px;color:#64748b;">${(p.allowedDomains||[]).join(', ')}</div>
          <div style="font-size:11px;color:#94a3b8;">Topics: ${(p.topics||[]).join(', ') || 'None'}</div>
          <div style="font-size:11px;color:#94a3b8;">Extra domains: ${p.maxExtraDomains || 0}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-secondary preset-start-btn" data-preset-id="${p.id}">Start</button>
          <button class="remove-site preset-delete-btn" data-preset-id="${p.id}">×</button>
        </div>
      `;
      list.appendChild(div);
    });
    
    // Add event listeners to the newly created buttons
    this.addPresetEventListeners();
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
    }}, async (res)=>{
      this.showNotification(`Session started: ${p.name}`, 'success');
      await this.updateUI(); // Refresh the UI to show the new settings
    });
  }

  deletePreset(id) {
    if (this.settings.focusLock) { this.showNotification('Focus is locked', 'info'); return; }
    this.settings.presets = (this.settings.presets||[]).filter(x=>x.id!==id);
    this.saveSettings();
    this.renderPresets();
  }

  renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML='';
    chrome.storage.local.get(['sessionHistory'], (res)=>{
      const hist = res.sessionHistory || [];
      hist.slice(-10).reverse().forEach(h=>{
        const div = document.createElement('div');
        div.className = 'activity-item';
        const when = new Date(h.timestamp).toLocaleString();
        div.innerHTML = `<div class="activity-site">${h.event.toUpperCase()} • ${h.name || ''}</div>
                         <div class="activity-reason">${when}</div>`;
        list.appendChild(div);
      });
    });
  }

  async getAmsterdamHour() {
    // Cache in memory to avoid UI lag
    if (this._amsCache && Date.now() - this._amsCache.ts < 5 * 60 * 1000) {
      return this._amsCache.hour;
    }

    const fetchJSON = async (url, timeoutMs = 3500) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        return await res.json();
      } finally {
        clearTimeout(t);
      }
    };

    const providers = [
      async () => {
        const j = await fetchJSON('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Amsterdam');
        if (j && typeof j.hour === 'number') return j.hour;
        if (j && j.dateTime) return new Date(j.dateTime).getHours();
        throw new Error('timeapi.io invalid');
      },
      async () => {
        const j = await fetchJSON('https://worldtimeapi.org/api/timezone/Europe/Amsterdam');
        if (j && j.datetime) return new Date(j.datetime).getHours();
        if (typeof j.unixtime === 'number') return new Date(j.unixtime * 1000).getUTCHours();
        throw new Error('worldtimeapi invalid');
      },
      async () => {
        const j = await fetchJSON('https://api.aladhan.com/v1/timingsByCity?city=Amsterdam&country=Netherlands');
        const ts = j && j.data && j.data.date && (j.data.date.timestamp || j.data.date.gregorian?.timestamp);
        if (ts) {
          const d = new Date(parseInt(ts, 10) * 1000);
          const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
          return parseInt(fmt.format(d), 10);
        }
        throw new Error('aladhan invalid');
      }
    ];

    for (const p of providers) {
      try {
        const hour = await p();
        this._amsCache = { hour, ts: Date.now() };
        return hour;
      } catch (e) {
        console.log('⏭️ Time provider failed, trying next...', String(e));
      }
    }

    try {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false });
      return parseInt(fmt.format(new Date(utc)), 10);
    } catch {
      return new Date().getHours();
    }
  }

  async updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    // Check if current Amsterdam time is between 3 AM and 6 AM
    const currentHour = await this.getAmsterdamHour();
    const isTimeBasedBypass = currentHour >= 3 && currentHour < 6;
    
    if (isTimeBasedBypass) {
      indicator.classList.remove('disabled');
      indicator.classList.add('time-bypass');
      statusText.textContent = 'Time-Based Bypass (3-6 AM)';
      console.log('🕒 Time-based bypass active (3-6 AM)');
    } else if (this.settings.isEnabled) {
      indicator.classList.remove('disabled');
      indicator.classList.remove('time-bypass');
      statusText.textContent = 'Protection Active';
    } else {
      indicator.classList.add('disabled');
      indicator.classList.remove('time-bypass');
      statusText.textContent = 'Protection Disabled';
    }
    
    console.log('📊 Status Updated:', isTimeBasedBypass ? 'Time-Based Bypass' : (this.settings.isEnabled ? 'Active' : 'Disabled'));
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

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : '#667eea'};
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

  // Auto-start default preset for quick testing
  async autoStartDefaultPreset() {
    try {
      // Check if there's already an active session
      const { currentSession } = await chrome.storage.sync.get(['currentSession']);
      if (currentSession) {
        console.log('⏭️ Session already active, skipping auto-start');
        return;
      }

      // Find the default preset
      const defaultPreset = this.settings.presets.find(p => p.id === 'default_algebra');
      if (defaultPreset) {
        console.log('🚀 Auto-starting default preset:', defaultPreset.name);
        await this.startPreset(defaultPreset.id);
        this.showNotification(`Auto-started: ${defaultPreset.name}`, 'success');
      }
    } catch (error) {
      console.error('Error auto-starting preset:', error);
    }
  }

  // Add event listeners to preset buttons using event delegation
  addPresetEventListeners() {
    const list = document.getElementById('presetsList');
    if (!list) return;
    
    // Handle preset start buttons
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-start-btn')) {
        const presetId = e.target.getAttribute('data-preset-id');
        this.startPreset(presetId);
      }
    });
    
    // Handle preset delete buttons
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-delete-btn')) {
        const presetId = e.target.getAttribute('data-preset-id');
        this.deletePreset(presetId);
      }
    });
  }

  // Add event delegation for all dynamically created elements
  addDynamicEventListeners() {
    // Handle site removal buttons (blocked/allowed sites)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('site-remove-btn')) {
        const site = e.target.getAttribute('data-site');
        const type = e.target.getAttribute('data-type');
        this.removeSite(site, type);
      }
    });
  }

  // Check for active session and update UI
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
        
        // Show session info
        this.showNotification(`Active: ${currentSession.name} (${timeLeft}m left)`, 'success');
      } else {
        // No active session
        const focusToggle = document.getElementById('focusToggle');
        if (focusToggle) {
          focusToggle.disabled = false;
        }
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  }

  // Debug method to show current session state
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

  // Debug Console Methods
  async loadDebugLogs() {
    try {
      const result = await chrome.storage.local.get(['debugLogs']);
      const debugLogs = result.debugLogs || [];
      
      const debugConsole = document.getElementById('debugConsole');
      if (!debugConsole) return;
      
      if (debugLogs.length === 0) {
        debugConsole.innerHTML = '<p class="no-activity">No debug logs yet. Navigate to a website to see activity.</p>';
        return;
      }
      
      // Show last 20 logs
      const recentLogs = debugLogs.slice(-20).reverse();
      let html = '';
      
      recentLogs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const dataStr = log.metadata ? JSON.stringify(log.metadata, null, 2) : '';
        
        html += `
          <div class="debug-log-entry">
            <div class="debug-log-time">${time}</div>
            <div class="debug-log-message">${log.reason}</div>
            ${dataStr ? `<div class="debug-log-data">${dataStr}</div>` : ''}
          </div>
        `;
      });
      
      debugConsole.innerHTML = html;
    } catch (error) {
      console.error('Error loading debug logs:', error);
    }
  }

  async clearDebugLogs() {
    try {
      await chrome.storage.local.set({ debugLogs: [] });
      this.loadDebugLogs();
      this.showNotification('Debug logs cleared', 'success');
    } catch (error) {
      console.error('Error clearing debug logs:', error);
    }
  }

  openBrowserConsole() {
    // Open browser console (F12 or right-click -> Inspect -> Console)
    this.showNotification('Press F12 or right-click → Inspect → Console to open browser console', 'info');
    
    // Try to focus on console if possible
    if (window.chrome && window.chrome.devtools) {
      // This is a best effort - devtools API is limited
      console.log('🔍 AI Guardian Debug Info - Check the Console tab for detailed logs');
    }
  }

  // EXTENSION PROTECTION METHODS
  async checkExtensionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkExtensionStatus' });
      
      if (response.enabled) {
        this.showNotification('✅ Extension is enabled and running', 'success');
      } else {
        this.showNotification('⚠️ Extension is disabled - attempting to re-enable', 'error');
        await this.forceReEnable();
      }
    } catch (error) {
      console.error('Error checking extension status:', error);
      this.showNotification('❌ Error checking extension status', 'error');
    }
  }

  async forceReEnable() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'forceReEnable' });
      
      if (response.success) {
        this.showNotification('✅ Extension re-enable attempted', 'success');
        // Check status again after a moment
        setTimeout(() => this.checkExtensionStatus(), 2000);
      } else {
        this.showNotification('❌ Failed to re-enable extension', 'error');
      }
    } catch (error) {
      console.error('Error forcing re-enable:', error);
      this.showNotification('❌ Error attempting to re-enable extension', 'error');
    }
  }

  openExtensionsPage() {
    // Open the browser's extensions management page
    chrome.tabs.create({ url: 'chrome://extensions/' });
    this.showNotification('Opened extensions page - extension should auto-re-enable if disabled', 'info');
  }
}

// Initialize popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  let focusLongTopics = [];
  window.popupManager = new PopupManager();
  
  async function initializeFocusLongMode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getFocusLongStatus' });
      if (response) {
        document.getElementById('focusLongToggle').checked = response.enabled;
        document.getElementById('focusLongStatus').textContent = response.enabled ? 'ON' : 'OFF';
        focusLongTopics = response.topics || [];
        document.getElementById('semanticThreshold').value = response.threshold || 0.7;
        document.getElementById('thresholdValue').textContent = response.threshold || 0.7;
        updateFocusLongTopicsList();
      }
    } catch (error) {
      console.error('Error loading Focus Long settings:', error);
    }
  }

  function updateFocusLongTopicsList() {
    const listElement = document.getElementById('focusLongTopicsList');
    listElement.innerHTML = '';
    
    if (focusLongTopics.length === 0) {
      listElement.innerHTML = '<p class="no-activity">No topics added yet</p>';
      return;
    }
    
    focusLongTopics.forEach((topic, index) => {
      const item = document.createElement('div');
      item.className = 'site-item';
      item.innerHTML = `
        <span>🎯 ${topic}</span>
        <button class="remove-btn" data-index="${index}">×</button>
      `;
      listElement.appendChild(item);
      
      item.querySelector('.remove-btn').addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        focusLongTopics.splice(idx, 1);
        updateFocusLongTopicsList();
      });
    });
  }
  
  initializeFocusLongMode();
  
  // Advanced Analysis functionality
  async function initializeAdvancedAnalysis() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAdvancedAnalysisStatus' });
      if (response) {
        document.getElementById('advancedAnalysisToggle').checked = response.enabled;
        document.getElementById('advancedAnalysisStatus').textContent = response.enabled ? 'ON' : 'OFF';
        document.getElementById('advancedFeatures').style.display = response.enabled ? 'block' : 'none';
        
        // Disable toggle if no API key or API not working
        if (!response.hasApiKey || !response.apiWorking) {
          document.getElementById('advancedAnalysisToggle').disabled = true;
          const helpText = document.querySelector('label[for="advancedAnalysisToggle"]').nextElementSibling;
          if (!response.hasApiKey) {
            helpText.textContent = 'Requires Groq API key in settings';
          } else {
            helpText.textContent = 'API connection not working';
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize advanced analysis:', error);
    }
  }
  
  // Advanced analysis toggle
  document.getElementById('advancedAnalysisToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    document.getElementById('advancedAnalysisStatus').textContent = enabled ? 'ON' : 'OFF';
    document.getElementById('advancedFeatures').style.display = enabled ? 'block' : 'none';
    
    await chrome.runtime.sendMessage({
      action: 'setAdvancedAnalysis',
      enabled: enabled
    });
  });
  
  // Save advanced settings
  document.getElementById('saveAdvancedSettings').addEventListener('click', async () => {
    const enabled = document.getElementById('advancedAnalysisToggle').checked;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'setAdvancedAnalysis',
        enabled: enabled
      });
      
      if (response.success) {
        showNotification('Advanced analysis settings saved successfully!', 'success');
      } else {
        showNotification('Failed to save advanced analysis settings', 'error');
      }
    } catch (error) {
      showNotification('Error saving settings: ' + error.message, 'error');
    }
  });
  
  // Test advanced analysis
  document.getElementById('testAdvancedAnalysis').addEventListener('click', async () => {
    try {
      // Get current tab info for testing
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showNotification('No active tab found for testing', 'error');
        return;
      }
      
      showNotification('Testing advanced analysis on current page...', 'info');
      
      // Send test request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'testAdvancedAnalysis',
        url: tab.url,
        title: tab.title
      });
      
      if (response && response.success) {
        showNotification(`Analysis complete! Score: ${response.score?.toFixed(2) || 'N/A'}, Category: ${response.category || 'Unknown'}`, 'success');
      } else {
        showNotification('Analysis failed: ' + (response?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      showNotification('Test failed: ' + error.message, 'error');
    }
  });
  
  initializeAdvancedAnalysis();
  
  // Focus Analytics functionality
  let analyticsUpdateInterval = null;
  
  async function initializeFocusAnalytics() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getFocusAnalyticsStatus' });
      if (response) {
        updateAnalyticsUI(response);
        
        if (response.active) {
          startAnalyticsUpdates();
        }
      }
    } catch (error) {
      console.error('Failed to initialize focus analytics:', error);
    }
  }
  
  function updateAnalyticsUI(status) {
    const dot = document.getElementById('analyticsDot');
    const statusText = document.getElementById('analyticsStatusText');
    const startBtn = document.getElementById('startAnalytics');
    const stopBtn = document.getElementById('stopAnalytics');
    const summary = document.getElementById('analyticsSummary');
    const features = document.getElementById('analyticsFeatures');
    
    if (status.active) {
      dot.className = 'status-dot active';
      statusText.textContent = 'Tracking';
      startBtn.disabled = true;
      stopBtn.disabled = false;
      summary.style.display = 'block';
      features.style.display = 'block';
      
      // Update session metrics
      if (status.status) {
        updateSessionMetrics(status.status);
      }
    } else {
      dot.className = 'status-dot';
      statusText.textContent = 'Not Tracking';
      startBtn.disabled = false;
      stopBtn.disabled = true;
      summary.style.display = 'none';
      features.style.display = 'none';
      
      stopAnalyticsUpdates();
    }
  }
  
  function updateSessionMetrics(status) {
    if (status.sessionTime) {
      const minutes = Math.floor(status.sessionTime / 60000);
      const seconds = Math.floor((status.sessionTime % 60000) / 1000);
      document.getElementById('sessionTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (status.currentTab) {
      // Update current tab info if needed
    }
    
    // Update other metrics (these would come from the analytics module)
    document.getElementById('tabSwitches').textContent = status.tabSwitches || '0';
    document.getElementById('distractionCount').textContent = status.distractions || '0';
  }
  
  function startAnalyticsUpdates() {
    if (analyticsUpdateInterval) return;
    
    analyticsUpdateInterval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getFocusAnalyticsStatus' });
        if (response && response.active) {
          updateSessionMetrics(response.status);
        } else {
          stopAnalyticsUpdates();
        }
      } catch (error) {
        console.error('Failed to update analytics:', error);
        stopAnalyticsUpdates();
      }
    }, 5000); // Update every 5 seconds
  }
  
  function stopAnalyticsUpdates() {
    if (analyticsUpdateInterval) {
      clearInterval(analyticsUpdateInterval);
      analyticsUpdateInterval = null;
    }
  }
  
  // Start Analytics button
  document.getElementById('startAnalytics').addEventListener('click', async () => {
    try {
      showNotification('Starting focus analytics session...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        action: 'startFocusAnalytics',
        config: {
          startTime: Date.now(),
          trackingLevel: 'full' // Track cursor, tabs, etc.
        }
      });
      
      if (response.success) {
        showNotification('Focus analytics started!', 'success');
        updateAnalyticsUI({ active: true, status: { sessionTime: 0, tabSwitches: 0, distractions: 0 } });
        startAnalyticsUpdates();
      } else {
        showNotification('Failed to start analytics', 'error');
      }
    } catch (error) {
      showNotification('Error starting analytics: ' + error.message, 'error');
    }
  });
  
  // Stop Analytics button
  document.getElementById('stopAnalytics').addEventListener('click', async () => {
    try {
      showNotification('Stopping focus analytics session...', 'info');
      
      const response = await chrome.runtime.sendMessage({ action: 'stopFocusAnalytics' });
      
      if (response.success && response.report) {
        showNotification('Focus analytics stopped! Report generated.', 'success');
        updateAnalyticsUI({ active: false });
        
        // Show brief summary
        const report = response.report;
        const summary = `Session: ${Math.round(report.session.duration / 60000)}min, Productivity: ${report.productivity.score}%, Tab switches: ${report.tabSwitching.totalSwitches}`;
        showNotification(summary, 'info');
      } else {
        showNotification('Failed to stop analytics', 'error');
      }
    } catch (error) {
      showNotification('Error stopping analytics: ' + error.message, 'error');
    }
  });
  
  // View Report button
  document.getElementById('viewReport').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getFocusAnalyticsReport' });
      
      if (response && response.report) {
        showAnalyticsReport(response.report);
      } else {
        showNotification('No analytics report available', 'info');
      }
    } catch (error) {
      showNotification('Error getting report: ' + error.message, 'error');
    }
  });
  
  function showAnalyticsReport(report) {
    // Create a modal or alert to show the detailed report
    const reportText = `
Focus Session Report
==================
Duration: ${Math.round(report.session.duration / 60000)} minutes
Productivity Score: ${report.productivity.score}%
Focus Efficiency: ${report.productivity.focusEfficiency}%
Total Active Time: ${Math.round(report.productivity.totalActiveTime / 60000)} minutes
Tab Switches: ${report.tabSwitching.totalSwitches}
Unique Pages: ${report.tabSwitching.uniquePages}
Distractions: ${report.distractions.length}

Top Sites:
${report.tabs.slice(0, 5).map(tab => `- ${tab.title}: ${Math.round(tab.totalTime / 60000)}min`).join('\n')}

Summary: ${report.summary}
    `;
    
    alert(reportText);
  }
  
  initializeFocusAnalytics();
});

// Refresh stats every 30 seconds
setInterval(() => {
  if (window.popupManager) {
    window.popupManager.loadStats();
    window.popupManager.loadRecentActivity();
    window.popupManager.loadDebugLogs();
  }
}, 30000); 