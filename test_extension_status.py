import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import importlib.util

spec = importlib.util.spec_from_file_location("extension_guardian_desktop", "extension-guardian-desktop.py")
extension_guardian_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extension_guardian_module)
ExtensionGuardian = extension_guardian_module.ExtensionGuardian

extension_id = 'ljfmjogahnigohdjkknaangiicalhlag'

app = ExtensionGuardian.__new__(ExtensionGuardian)
app.config = {
    'extension_id': extension_id,
    'browsers': ['chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe']
}

import logging
app.logger = logging.getLogger(__name__)
app.logger.setLevel(logging.INFO)
app.logger.addHandler(logging.StreamHandler())

enabled_count = 0
paths = {
    'chrome.exe': os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default\Preferences"),
    'brave.exe': os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Preferences"),
    'comet.exe': os.path.expandvars(r"%LOCALAPPDATA%\Perplexity\Comet\User Data\Default\Preferences"),
    'msedge.exe': os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Preferences"),
}

def read_ext_data(pref_path, ext_id):
    try:
        if not os.path.exists(pref_path):
            return None
        with open(pref_path, 'r', encoding='utf-8') as f:
            prefs = json.load(f)
        return prefs.get('extensions', {}).get('settings', {}).get(ext_id)
    except Exception:
        return None

enabled_count = 0
mismatches = 0
for browser_name in ['chrome.exe', 'brave.exe', 'comet.exe', 'msedge.exe']:
    status = app.check_extension_status(browser_name)
    ext_data = read_ext_data(paths[browser_name], extension_id)
    incog = None
    try:
        if ext_data is not None:
            incog = extension_guardian_module._is_incognito_allowed(ext_data)
    except Exception:
        incog = None

    status_text = 'ENABLED' if status else 'DISABLED'
    incog_text = 'Unknown' if incog is None else ('Allowed' if incog else 'Not allowed')
    print(f"{browser_name}: {status_text} (Incognito: {incog_text})")

    if status:
        enabled_count += 1

    if incog is False and status is True:
        mismatches += 1
        print(f"Mismatch: {browser_name} should be DISABLED when incognito/private is off.")

print(f"Enabled in {enabled_count}/4 browsers")
if mismatches:
    print(f"Incognito-off test: {mismatches} mismatch(es) detected")