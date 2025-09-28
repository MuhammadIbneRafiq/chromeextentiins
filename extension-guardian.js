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
      // First check: Try to access the extension's management API
      if (chrome && chrome.management) {
        try {
          const extension = await chrome.management.get(EXTENSION_ID);
          if (!extension.enabled) {
            console.log('🚨 Extension disabled according to management API');
            
            // Store disabled state for other components to detect
            if (chrome.storage && chrome.storage.local) {
              try {
                await chrome.storage.local.set({
                  extensionDisabled: true,
                  disabledTimestamp: Date.now(),
                  disabledReason: 'Detected by external guardian'
                });
              } catch (storageErr) {
                console.log('⚠️ Could not store disabled state:', storageErr);
              }
            }
            
            return false;
          }
        } catch (managementErr) {
          console.log('⚠️ Management API error:', managementErr);
          // Continue to other checks
        }
      }
      
      // Second check: Try to detect if extension is working via storage
      if (chrome && chrome.storage && chrome.storage.local) {
        try {
          // Try to write and read a test value
          const testValue = `test_${Date.now()}`;
          await chrome.storage.local.set({ extensionGuardianTest: testValue });
          const result = await chrome.storage.local.get(['extensionGuardianTest']);
          
          if (result.extensionGuardianTest === testValue) {
            console.log('✅ Extension verified working via storage test');
            return true;
          }
        } catch (storageErr) {
          console.log('⚠️ Storage API error - extension may be disabled:', storageErr);
          return false;
        }
      }
      
      // Third check: Try to access extension's runtime
      try {
        if (chrome && chrome.runtime && chrome.runtime.id === EXTENSION_ID) {
          // Try to send a message to the extension
          const response = await chrome.runtime.sendMessage(EXTENSION_ID, { action: 'ping' });
          if (response && response.status === 'ok') {
            console.log('✅ Extension verified working via runtime message');
            return true;
          }
        }
      } catch (runtimeErr) {
        console.log('⚠️ Runtime API error - extension may be disabled:', runtimeErr);
        return false;
      }
      
      // If all checks fail, assume extension is disabled
      console.log('❌ All extension checks failed - assuming disabled');
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
      
      // Get additional information about disabled state if available
      let disabledInfo = "Unknown reason";
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get(['disabledTimestamp', 'disabledReason']);
          if (result.disabledTimestamp) {
            const disabledTime = new Date(result.disabledTimestamp).toLocaleTimeString();
            disabledInfo = `${result.disabledReason || 'Unknown reason'} at ${disabledTime}`;
          }
        }
      } catch (e) {
        console.log('Could not retrieve disabled info:', e);
      }
      
      // Show notification with more details
      showNotification(`Extension was disabled! (${disabledInfo}) Attempting to re-enable...`, 'error');
      
      // Store this detection in local storage for the desktop app to find
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({
            guardianDetectedDisabled: true,
            guardianDetectionTime: Date.now(),
            guardianInfo: disabledInfo
          });
        }
      } catch (e) {
        console.log('Could not store guardian detection:', e);
      }
      
      const reEnabled = await attemptReEnable();
      
      if (reEnabled) {
        showNotification('Extension re-enabled successfully!', 'success');
        
        // Update storage to indicate successful re-enable
        try {
          if (chrome && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({
              extensionReEnabled: true,
              reEnabledTimestamp: Date.now()
            });
          }
        } catch (e) {
          console.log('Could not store re-enable status:', e);
        }
      } else {
        showNotification('Please manually re-enable the extension', 'error');
        
        // Try to open the desktop app if available
        try {
          // Try to communicate with desktop app via native messaging
          if (chrome && chrome.runtime && chrome.runtime.sendNativeMessage) {
            chrome.runtime.sendNativeMessage(
              'com.extensionguardian.native_messaging_host',
              {
                type: 'extension_disabled',
                extensionId: EXTENSION_ID,
                timestamp: Date.now(),
                needsReEnable: true
              }
            );
          }
        } catch (e) {
          console.log('Could not communicate with desktop app:', e);
        }
      }
    } else if (isEnabled && isMonitoring) {
      // Periodically log that extension is working
      console.log('✅ Extension check passed - extension is enabled');
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

