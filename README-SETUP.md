# Extension Guardian - Setup Instructions

## Quick Setup (Recommended)

1. **Build the executables:**
   ```
   .\build_all.bat
   ```
   Wait for all 5 executables to be created in the `dist` folder.

2. **Set up auto-start:**
   ```
   .\setup-extension-guardian.bat
   ```
   This will:
   - Add Extension Guardian to Windows startup
   - Create desktop and start menu shortcuts
   - Start the guardian in background mode immediately

## What You Get

✅ **Auto-start with Windows** - Extension Guardian automatically starts when you boot your computer
✅ **Background monitoring** - Runs silently in the background with no visible window
✅ **Continuous protection** - Monitors your browser extensions 24/7
✅ **Instant browser closure** - Closes all browsers when extension is disabled
✅ **Easy configuration** - GUI available via desktop shortcut

## How It Works

The Extension Guardian now works **EXACTLY** like running:
```
python .\extension-guardian-desktop.py --background
```

But as a compiled executable that:
- Starts automatically with Windows
- Runs without needing Python installed
- Has no visible window (background mode)
- Cannot be accidentally closed

## Configuration

1. Double-click the "Extension Guardian" desktop shortcut
2. Go to the "Settings" tab
3. Enter your extension ID (default: `figcnikhjnpbflcemlbclimihgebncci`)
4. Configure other settings as needed
5. Click "Save Settings"
6. The background process will use your new settings

## Verification

To check if it's working:
1. Open Task Manager
2. Look for `extension-guardian-desktop.exe` in the process list
3. Check logs at: `%USERPROFILE%\ExtensionGuardian\logs\`

## File Structure

- `extension-guardian-desktop.exe` - Main application (GUI + background mode)
- `extension_guardian_service.exe` - Windows service (advanced users)
- `install_guardian.exe` - Service installer (requires admin)
- `uninstall_guardian.exe` - Service uninstaller
- `guardian_watchdog.exe` - Watchdog process (keeps guardian running)

## Troubleshooting

**Not starting automatically?**
- Check Windows startup settings: `Win + R` → `msconfig` → Startup tab
- Look for "ExtensionGuardian" entry

**Not working?**
- Check the logs in `%USERPROFILE%\ExtensionGuardian\logs\`
- Make sure your extension ID is correct in settings
- Verify the extension is actually installed in your browser

**Want to stop it?**
- Open Task Manager and end the `extension-guardian-desktop.exe` process
- Or use the system tray icon (if available)

## Advanced Setup (Admin Rights)

If you want the full service installation with maximum protection:
1. Right-click `install-autostart-guardian.bat`
2. Select "Run as Administrator"
3. Follow the prompts

This provides additional protection by installing as a Windows service.
