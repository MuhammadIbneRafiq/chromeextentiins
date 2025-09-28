# Extension Guardian Desktop Application

A powerful Windows desktop application that monitors your browser extension status and enforces restrictions when the extension is disabled, similar to Cold Turkey's approach.

## 🚀 Features

- **Real-time Extension Monitoring**: Continuously monitors browser extension status
- **Automatic Browser Closure**: Closes browsers when extension is disabled
- **Uninstall Protection**: Timer-based protection against application uninstallation
- **Multi-browser Support**: Works with Chrome, Edge, Brave, and Firefox
- **Native Messaging**: Secure communication between extension and desktop app
- **Warning System**: User-friendly notifications and countdown timers
- **Auto-start Option**: Can start automatically with Windows

## 📋 Prerequisites

- Windows 10/11
- Python 3.8 or higher
- Administrator privileges (for full functionality)
- Your browser extension already installed

## 🛠️ Installation

### Step 1: Install Python Dependencies

1. Run `install-guardian.bat` as Administrator
2. This will install required Python packages and create shortcuts

### Step 2: Setup Native Messaging

1. Run `setup-native-messaging.bat` as Administrator
2. This registers the native messaging host with your browsers

### Step 3: Configure Extension ID

1. Open Chrome and go to `chrome://extensions/`
2. Find your extension ID (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
3. Edit `com.extensionguardian.native_messaging_manifest.json`
4. Replace `your-extension-id-here` with your actual extension ID
5. Restart your browser

## 🎯 How It Works

### Extension Monitoring
The desktop application continuously monitors:
- Browser processes (Chrome, Edge, Brave, Firefox)
- Extension status in each browser
- Registry entries for extension state
- Native messaging communication

### When Extension is Disabled
1. **Detection**: App detects extension has been disabled
2. **Warning**: Shows a 5-second warning dialog
3. **Action**: Automatically closes all browser instances
4. **Logging**: Records the event in logs

### Uninstall Protection
- Set a timer (1-168 hours)
- Prevents application uninstallation during the timer
- Registry modifications block uninstall attempts
- Emergency disable option available

## 🖥️ Using the Application

### Main Interface

**Start/Stop Monitoring**
- Click "Start Monitoring" to begin watching for disabled extensions
- Click "Stop Monitoring" to pause monitoring

**Status Display**
- Shows current monitoring status
- Displays running browser processes
- Shows extension status for each browser

**Quick Actions**
- "Close All Browsers": Manually close all browser instances
- "Open Extension Page": Opens `chrome://extensions/`
- "View Logs": Opens the logs directory

### Settings Tab

**Monitoring Settings**
- Enable/disable monitoring
- Enable/disable automatic browser closure
- Set check interval (5-300 seconds)

**Extension Settings**
- Configure your extension ID
- Select which browsers to monitor

### Protection Tab

**Uninstall Protection**
- Set protection duration (1-168 hours)
- Enable/disable protection
- Emergency disable option

⚠️ **Warning**: Uninstall protection prevents you from uninstalling the application for the specified duration. Only enable if you're certain you want this protection.

## 📡 Native Messaging

The system uses Chrome's native messaging API for secure communication:

1. **Extension → Desktop App**: Heartbeat messages every 30 seconds
2. **Status Updates**: Extension status changes are reported
3. **Auto-start**: Desktop app can be started automatically

### Troubleshooting Native Messaging

If native messaging isn't working:

1. Check that the extension ID is correct in the manifest
2. Verify registry entries were created successfully
3. Restart your browser after setup
4. Check logs for error messages

## 📁 File Structure

```
extension-guardian/
├── extension-guardian-desktop.py      # Main desktop application
├── native-messaging-host.py           # Native messaging bridge
├── com.extensionguardian.native_messaging_manifest.json  # Chrome manifest
├── requirements.txt                   # Python dependencies
├── install-guardian.bat              # Installation script
├── setup-native-messaging.bat        # Native messaging setup
└── EXTENSION_GUARDIAN_README.md      # This file
```

## 🔧 Configuration

Configuration is stored in `%USERPROFILE%\ExtensionGuardian\config.json`:

```json
{
  "extension_id": "your-extension-id-here",
  "monitoring_enabled": true,
  "browser_close_enabled": true,
  "check_interval_seconds": 10,
  "browsers": ["chrome.exe", "msedge.exe", "brave.exe", "firefox.exe"]
}
```

## 📊 Logs

Logs are stored in `%USERPROFILE%\ExtensionGuardian\logs\`:
- Daily log files with timestamp
- Extension status changes
- Browser closure events
- Error messages and debugging info

## 🚨 Security Considerations

### Registry Access
- The application modifies Windows registry for uninstall protection
- Requires administrator privileges for full functionality
- All changes are logged and reversible

### Process Monitoring
- Monitors running browser processes
- Terminates browsers when extension is disabled
- Uses standard Windows APIs

### Native Messaging
- Secure communication channel between extension and desktop app
- Validates extension identity
- Encrypted message passing

## 🔄 Updates and Maintenance

### Updating the Extension
1. Update your browser extension as normal
2. The desktop app will automatically detect the new version
3. No additional configuration needed

### Updating the Desktop App
1. Stop the current application
2. Replace the Python files
3. Run `install-guardian.bat` again if needed
4. Restart the application

## 🆘 Troubleshooting

### Common Issues

**"Extension ID not found"**
- Verify your extension ID in settings
- Check that the extension is installed and enabled

**"Native messaging failed"**
- Re-run `setup-native-messaging.bat` as Administrator
- Verify registry entries exist
- Restart your browser

**"Browsers not closing"**
- Check if you have administrator privileges
- Verify browser processes are running
- Check logs for error messages

**"Protection not working"**
- Ensure you're running as Administrator
- Check registry permissions
- Use emergency disable if needed

### Getting Help

1. Check the logs directory for error messages
2. Verify all prerequisites are met
3. Try running as Administrator
4. Check Windows Event Viewer for system errors

## ⚖️ Legal Notice

This application is designed for personal productivity use. Users are responsible for:
- Ensuring they have permission to monitor their own systems
- Understanding the implications of uninstall protection
- Using the application in compliance with local laws and regulations

The application modifies system settings and terminates processes. Use responsibly and only on systems you own or have explicit permission to modify.

## 🔮 Future Enhancements

Planned features:
- Multi-user support
- Cloud configuration sync
- Advanced extension detection methods
- Integration with other productivity tools
- Mobile companion app

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: Windows 10/11, Python 3.8+
