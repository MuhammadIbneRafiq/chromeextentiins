// Extension Guardian - External Monitor
// This script runs outside the extension to monitor and protect it
// Run this script in the browser console or as a bookmarklet

(function() {
  'use strict';
  
  const EXTENSION_ID = 'ihgblohlcibknaohodhpmonfbegkoafd'; // Your extension ID
  const EXTENSION_NAME = 'AI Productivity Guardian';
  const CHECK_INTERVAL = 5000; // Check every 5 seconds
  const RECOVERY_URL = 'chrome://extensions/';
  
  let isMonitoring = false;
  let checkInterval = null;
  
  console.log('🛡️ Extension Guardian started');
  
  // Function to check if extension is enabled
  async function checkExtensionStatus() {
    try {
      // Try to access the extension's management API
      if (chrome && chrome.management) {
        const extension = await chrome.management.get(EXTENSION_ID);
        return extension.enabled;
      }
      
      // Fallback: Try to detect if extension is working
      try {
        // Try to access extension's runtime
        if (chrome && chrome.runtime && chrome.runtime.id === EXTENSION_ID) {
          return true;
        }
      } catch (e) {
        return false;
      }
      
      return false;
    } catch (error) {
      console.log('❌ Error checking extension status:', error);
      return false;
    }
  }
  
  // Function to attempt re-enabling the extension
  async function attemptReEnable() {
    try {
      console.log('🔄 Attempting to re-enable extension...');
      
      if (chrome && chrome.management) {
        await chrome.management.setEnabled(EXTENSION_ID, true);
        console.log('✅ Extension re-enabled successfully');
        return true;
      }
      
      // If we can't use the API, try to open extensions page
      window.open(RECOVERY_URL, '_blank');
      console.log('📄 Opened extensions page for manual re-enabling');
      
      return false;
    } catch (error) {
      console.log('❌ Failed to re-enable extension:', error);
      return false;
    }
  }
  
  // Function to show notification
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : '#667eea'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${type === 'error' ? '🚨' : type === 'success' ? '✅' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
  
  // Main monitoring function
  async function monitorExtension() {
    const isEnabled = await checkExtensionStatus();
    
    if (!isEnabled && isMonitoring) {
      console.log('🚨 Extension is disabled! Attempting recovery...');
      showNotification('Extension was disabled! Attempting to re-enable...', 'error');
      
      const reEnabled = await attemptReEnable();
      
      if (reEnabled) {
        showNotification('Extension re-enabled successfully!', 'success');
      } else {
        showNotification('Please manually re-enable the extension', 'error');
      }
    }
  }
  
  // Start monitoring
  function startMonitoring() {
    if (isMonitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }
    
    isMonitoring = true;
    console.log('🛡️ Starting extension monitoring...');
    showNotification('Extension Guardian is now protecting your extension', 'success');
    
    // Initial check
    monitorExtension();
    
    // Set up interval
    checkInterval = setInterval(monitorExtension, CHECK_INTERVAL);
  }
  
  // Stop monitoring
  function stopMonitoring() {
    if (!isMonitoring) {
      console.log('⚠️ Monitoring not active');
      return;
    }
    
    isMonitoring = false;
    console.log('🛡️ Stopping extension monitoring...');
    
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    
    showNotification('Extension Guardian stopped', 'info');
  }
  
  // Expose functions globally
  window.ExtensionGuardian = {
    start: startMonitoring,
    stop: stopMonitoring,
    check: monitorExtension,
    reEnable: attemptReEnable,
    isMonitoring: () => isMonitoring
  };
  
  // Auto-start monitoring
  startMonitoring();
  
  console.log('🛡️ Extension Guardian loaded. Use ExtensionGuardian.start() or ExtensionGuardian.stop() to control.');
  
})();

