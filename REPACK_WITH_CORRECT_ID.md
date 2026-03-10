# REPACK EXTENSION WITH CORRECT ID

## YOU MUST DO THIS NOW:

### Step 1: Pack Extension with the EXISTING .pem file
1. Go to `brave://extensions`
2. Enable "Developer mode"
3. Click **"Pack extension"**
4. **Extension root directory:** `C:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins\src`
5. **Private key file:** `C:\ProgramData\MyProductivityExtension\extension.pem` ← CRITICAL!
6. Click "Pack Extension"

This will create:
- `src.crx` in the chromeextentiins folder

### Step 2: Move the NEW .crx file
The new .crx will be created at:
`C:\Users\wifi stuff\OneDrive - TU Eindhoven\chromeextentiins\src.crx`

It needs to REPLACE the old one at:
`C:\ProgramData\MyProductivityExtension\extension.crx`

### Why This Works:
- Using the SAME .pem file = SAME extension ID (cefohabdfmncmcilofdoodoaibcaakbc)
- The registry is now configured for THIS ID
- The update.xml is now configured for THIS ID
- The .crx file will match everything

### After Packing:
1. Let me know when you've packed it
2. I'll move the .crx file automatically
3. Run the cleanup bat file
4. Restart Brave
5. Extension will install and be locked
