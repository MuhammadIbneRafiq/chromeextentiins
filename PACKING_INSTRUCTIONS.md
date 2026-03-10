# HOW TO PACK AND LOCK YOUR EXTENSION

## Step 1: Pack the Extension
1. Open Brave (or any Chromium browser)
2. Go to `brave://extensions`
3. Enable "Developer mode" (top right toggle)
4. Click **"Pack extension"** button
5. For "Extension root directory": Browse to `C:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins\src`
6. Leave "Private key file" EMPTY (first time only)
7. Click "Pack Extension"

This creates:
- `src.crx` (the packed extension)
- `src.pem` (your private key - KEEP THIS SAFE!)

## Step 2: Move Files to Permanent Location
1. Create folder: `C:\ProgramData\MyProductivityExtension\`
2. Move `src.crx` to `C:\ProgramData\MyProductivityExtension\extension.crx`
3. Move `src.pem` to `C:\ProgramData\MyProductivityExtension\extension.pem` (backup)

## Step 3: Get the Extension ID
1. After packing, the extension ID will be shown (starts with 'h')
2. Copy this ID - you'll need it for the next steps
3. The ID should be: `cefohabdfmncmcilofdoodoaibcaakbc`

## Step 4: Update the XML File
1. Edit `C:\ProgramData\MyProductivityExtension\update.xml`
2. Replace `YOUR_EXTENSION_ID_HERE` with your actual extension ID
3. Save the file

## Step 5: Run the Force Install Bat Files
1. Run `chrome_force_install_PACKED.bat` as administrator
2. Run `brave_force_install_PACKED.bat` as administrator
3. Run `edge_force_install_PACKED.bat` as administrator
4. Run `comet_force_install_PACKED.bat` as administrator

## Step 6: Restart All Browsers
Close all browser windows completely and reopen.

## Verification
- Go to `brave://extensions` - extension should show "Managed by your organization"
- The toggle switch to disable should be GONE
- The remove button should be GONE

## To Update Extension Later
1. Change your code in the `src` folder
2. Update version in `src/manifest.json` (e.g., from "1.0.0" to "1.0.1")
3. Pack extension again using the SAME .pem file
4. Replace `C:\ProgramData\MyProductivityExtension\extension.crx` with new one
5. Update version in `update.xml` to match
6. Restart browser - it will auto-update
