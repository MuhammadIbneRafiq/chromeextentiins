# Comet Browser Force-Install Setup

## Step-by-Step Instructions

### Step 1: Make Sure HTTP Server is Running
1. Open PowerShell or Command Prompt
2. Run this command:
   ```
   cd "C:\ProgramData\MyProductivityExtension"
   python -m http.server 8888
   ```
3. **Keep this window open** - don't close it
4. You should see: `Serving HTTP on :: port 8888`

---

### Step 2: Remove Manually Installed Extension from Comet
1. Go to `comet://extensions`
2. Find "AI Productivity Guardian"
3. Click **"Remove"** button
4. Confirm removal
5. **Close ALL Comet windows**

---

### Step 3: Apply Force-Install Policy
1. Go to your extension folder:
   ```
   c:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins
   ```
2. **Right-click** on `COMET_FORCE_INSTALL.bat`
3. Select **"Run as administrator"**
4. Wait for it to complete
5. Press any key when done

---

### Step 4: Restart Comet and Verify
1. **Close ALL Comet windows** (make sure all processes are closed)
2. Wait **5 seconds**
3. **Open Comet browser**
4. Go to `comet://extensions`

---

### What You Should See:
✅ "AI Productivity Guardian" extension appears automatically
✅ "Managed by your organization" message
✅ **NO toggle switch** to disable
✅ **NO remove button**
✅ Extension ID: `cefohabdfmncmcilofdoodaoibcaakbc`

---

### If It Doesn't Work:

#### Check Policy Status:
1. Go to `comet://policy`
2. Look for `ExtensionInstallForcelist`
3. Should show your extension ID

#### Check HTTP Server:
- Make sure the Python HTTP server is still running
- Should show logs when Comet downloads files

#### Try Alternative:
- Run `COMET_FORCE_INSTALL.bat` again as admin
- Fully restart Comet (close all windows)

---

### Files Created:
- Registry policies for Comet at: `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Chromium`
- Extension served from: `http://localhost:8888/extension.crx`
- Extension ID: `cefohabdfmncmcilofdoodaoibcaakbc`
