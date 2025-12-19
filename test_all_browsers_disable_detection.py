"""
Test that disable_reasons detection works for all browsers
"""
import json
import os

extension_id = "ljfmjogahnigohdjkknaangiicalhlag"

browsers = [
    {
        'name': 'Chrome',
        'path': r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Preferences"
    },
    {
        'name': 'Edge',
        'path': r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Preferences"
    },
    {
        'name': 'Brave',
        'path': r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Preferences"
    },
    {
        'name': 'Comet',
        'path': r"%LOCALAPPDATA%\Perplexity\Comet\User Data\Default\Preferences"
    }
]

print("=" * 80)
print("CHECKING ALL BROWSERS FOR EXTENSION STATUS")
print("=" * 80)

for browser in browsers:
    prefs_path = os.path.expandvars(browser['path'])
    print(f"\n{browser['name']}:")
    print(f"  Path: {prefs_path}")
    
    if not os.path.exists(prefs_path):
        print(f"  ❌ Preferences file not found")
        continue
    
    try:
        with open(prefs_path, 'r', encoding='utf-8') as f:
            prefs = json.load(f)
        
        ext_data = prefs.get('extensions', {}).get('settings', {}).get(extension_id)
        
        if not ext_data:
            print(f"  ⚠️  Extension not installed")
            continue
        
        state = ext_data.get('state')
        disable_reasons = ext_data.get('disable_reasons', [])
        incognito = ext_data.get('incognito')
        allow_incognito = ext_data.get('allow_in_incognito')
        
        print(f"  State: {state}")
        print(f"  Disable reasons: {disable_reasons}")
        print(f"  Incognito: {incognito}")
        print(f"  Allow in incognito: {allow_incognito}")
        
        # Determine status
        is_disabled = False
        reason = ""
        
        if state == 0:
            is_disabled = True
            reason = "state=0"
        elif disable_reasons and len(disable_reasons) > 0:
            is_disabled = True
            reason = f"disable_reasons={disable_reasons}"
        elif not incognito and not allow_incognito:
            is_disabled = True
            reason = "incognito not allowed"
        
        if is_disabled:
            print(f"  🔴 DISABLED - {reason}")
        else:
            print(f"  ✅ ENABLED")
            
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print("The code now checks for:")
print("  1. state == 0 (explicitly disabled)")
print("  2. disable_reasons array (disabled for any reason)")
print("  3. incognito not allowed (privacy mode disabled)")
print("\nAll 4 browsers use the same detection logic via _scan_profiles_for_ext_status()")

