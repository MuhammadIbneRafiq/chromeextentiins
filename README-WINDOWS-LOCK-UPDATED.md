# 🛡️ Windows Extension Lock - Multi-Browser Support

This tool prevents you from disabling the AI Productivity Guardian extension in **Chrome**, **Brave**, and **Microsoft Edge** browsers by using Windows system-level restrictions.

## ⚠️ IMPORTANT WARNING

**This modifies Windows registry and Group Policy settings!**
- Make sure to backup your system before running
- Run as Administrator
- This will prevent you from disabling the extension through the browser UI
- You can still disable it by running the unlock script

## 📁 Files Included

1. **`lock-extension.bat`** - Main script (RECOMMENDED)
2. **`lock-extension-windows.ps1`** - PowerShell script
3. **`registry-lock.reg`** - Direct registry file for Chrome/Brave
4. **`edge-extension-lock.reg`** - Direct registry file for Microsoft Edge
5. **`README-WINDOWS-LOCK-UPDATED.md`** - This file

## 🚀 How to Use

### Method 1: Batch File (Recommended)
1. **Right-click** `lock-extension.bat`
2. Select **"Run as Administrator"**
3. Choose from the following options:
   - **Option 1**: Enable Extension Lock for ALL browsers (Chrome, Brave, Edge)
   - **Option 2**: Enable Extension Lock for Chrome only
   - **Option 3**: Enable Extension Lock for Brave only
   - **Option 4**: Enable Extension Lock for Microsoft Edge only
   - **Option 5**: Disable Extension Lock (Allow disabling)
   - **Option 6**: Check Status
4. Restart your browsers

### Method 2: PowerShell Script
1. Open **PowerShell as Administrator**
2. Navigate to the extension folder
3. Run one of the following commands:
   ```bash
   # Enable for all browsers
   .\lock-extension-windows.ps1 -Enable
   
   # Enable for specific browser
   .\lock-extension-windows.ps1 -EnableChrome
   .\lock-extension-windows.ps1 -EnableBrave
   .\lock-extension-windows.ps1 -EnableEdge
   
   # Disable
   .\lock-extension-windows.ps1 -Disable
   
   # Check status
   .\lock-extension-windows.ps1 -Status
   ```
4. Restart your browsers

### Method 3: Registry Files
1. **For Chrome/Brave**: Right-click `registry-lock.reg` → Select **"Merge"**
2. **For Microsoft Edge**: Right-click `edge-extension-lock.reg` → Select **"Merge"**
3. Click **"Yes"** to confirm
4. Restart your browsers

## 🔧 Commands

### Enable Extension Lock for All Browsers
```bash
# Batch file
lock-extension.bat

# PowerShell
.\lock-extension-windows.ps1 -Enable
```

### Enable for Specific Browser
```bash
# PowerShell
.\lock-extension-windows.ps1 -EnableChrome    # Chrome only
.\lock-extension-windows.ps1 -EnableBrave     # Brave only
.\lock-extension-windows.ps1 -EnableEdge      # Microsoft Edge only
```

### Disable Extension Lock
```bash
# Batch file
lock-extension.bat

# PowerShell
.\lock-extension-windows.ps1 -Disable
```

### Check Status
```bash
# PowerShell
.\lock-extension-windows.ps1 -Status
```

## 🔍 What This Does

1. **Force Installs** the extension at system level for each browser
2. **Blocks** the management permission that allows disabling
3. **Disables** extension management UI in each browser
4. **Prevents** disabling through browser settings
5. **Locks** the extension to always be enabled
6. **Uses Windows Group Policy** for system-level control

## 🛠️ How It Works

### Registry Modifications
- **Chrome**: `HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionSettings`
- **Brave**: `HKLM\SOFTWARE\Policies\BraveSoftware\Brave\ExtensionSettings`
- **Microsoft Edge**: `HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionSettings`

### Policy Settings
- Sets `installation_mode` to `force_installed`
- Blocks `management` permission
- Whitelists only your extension
- Disables extension management interface

### Group Policy
- Creates system-level policies for each browser
- Prevents extension management
- Forces extension to stay enabled
- Blocks access to extension settings

## 🔓 How to Unlock

If you need to disable the extension:

1. **Run the unlock script**:
   ```bash
   .\lock-extension-windows.ps1 -Disable
   ```

2. **Or use the batch file**:
   - Run `lock-extension.bat`
   - Choose option **5** (Disable Extension Lock)

3. **Restart your browsers**

## 🚨 Troubleshooting

### Extension Still Can Be Disabled
1. Make sure you ran as Administrator
2. Check if the registry entries were created
3. Restart the browsers completely
4. Check Windows Group Policy

### Can't Access Extension Settings
This is normal! The lock prevents access to extension management.

### Browser Won't Start
1. Run the unlock script
2. Restart the browser
3. Check Windows Event Viewer for errors

## 🔒 Security Notes

- This uses Windows Group Policy and registry
- Only affects extension management
- Doesn't affect other browser functions
- Can be reversed at any time
- Requires Administrator privileges

## 📋 System Requirements

- Windows 10/11
- Administrator privileges
- Chrome, Brave, and/or Microsoft Edge installed
- Extension already installed

## 🌐 Supported Browsers

- ✅ **Google Chrome**
- ✅ **Brave Browser**
- ✅ **Microsoft Edge**
- ❌ Firefox (not supported - uses different extension system)

## 🆘 Emergency Recovery

If something goes wrong:

1. **Open Command Prompt as Administrator**
2. **Run the unlock script**:
   ```bash
   powershell.exe -ExecutionPolicy Bypass -File "lock-extension-windows.ps1" -Disable
   ```
3. **Restart the browsers**

## 📞 Support

If you encounter issues:
1. Check Windows Event Viewer
2. Verify registry entries
3. Run the status check
4. Contact support with error details

---

**Remember: This is a powerful tool that modifies system settings. Use responsibly!**

## 🎯 Quick Start

1. **Right-click** `lock-extension.bat`
2. **Run as Administrator**
3. **Choose option 1** (Enable for all browsers)
4. **Restart Chrome, Brave, and Edge**

Your extension is now protected across all three browsers! 🛡️
