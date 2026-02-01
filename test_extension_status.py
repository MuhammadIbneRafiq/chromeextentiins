import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import importlib.util

spec = importlib.util.spec_from_file_location("extension_guardian_desktop", "extension-guardian-desktop.py")
extension_guardian_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extension_guardian_module)
ExtensionGuardian = extension_guardian_module.ExtensionGuardian

extension_id = 'dhmlefmojipiigjhjifnohilekhmbbag'

app = ExtensionGuardian.__new__(ExtensionGuardian)
app.config = {
    'extension_id': extension_id,
    'browsers': ['chrome.exe', 'msedge.exe',
                 'brave.exe', 'comet.exe']
}

import logging
app.logger = logging.getLogger(__name__)
app.logger.setLevel(logging.INFO)
app.logger.addHandler(logging.StreamHandler())

enabled_count = 0
base_paths = {
    'chrome.exe': [
        r"%LOCALAPPDATA%\Google\Chrome\User Data",
        r"%LOCALAPPDATA%\Google\Chrome Beta\User Data",
        r"%LOCALAPPDATA%\Google\Chrome SxS\User Data",
    ],
    'msedge.exe': [
        r"%LOCALAPPDATA%\Microsoft\Edge\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge Beta\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge Dev\User Data",
        r"%LOCALAPPDATA%\Microsoft\Edge SxS\User Data",
    ],
    'brave.exe': [
        r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data",
        r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser-Beta\User Data",
        r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser-Dev\User Data",
    ],
    'comet.exe': [
        r"%LOCALAPPDATA%\Perplexity\Comet\User Data",
    ],
}

def iter_prefs_paths(base_path):
    if not os.path.isdir(base_path):
        return
    for name in os.listdir(base_path):
        if name.lower() == 'snapshots':
            snapshots_root = os.path.join(base_path, name)
            for ver in os.listdir(snapshots_root):
                ver_dir = os.path.join(snapshots_root, ver)
                if not os.path.isdir(ver_dir):
                    continue
                for prof in os.listdir(ver_dir):
                    profile_dir = os.path.join(ver_dir, prof)
                    prefs = os.path.join(profile_dir, 'Preferences')
                    if os.path.isfile(prefs):
                        yield prefs
            continue
        profile_dir = os.path.join(base_path, name)
        prefs = os.path.join(profile_dir, 'Preferences')
        if os.path.isfile(prefs):
            yield prefs

def read_ext_data_from_bases(browser_name, ext_id):
    paths = base_paths.get(browser_name, [])
    for raw_base in paths:
        base = os.path.expandvars(raw_base)
        for prefs_path in iter_prefs_paths(base):
            try:
                with open(prefs_path, 'r', encoding='utf-8') as f:
                    prefs = json.load(f)
                ext_data = prefs.get('extensions', {}).get('settings', {}).get(ext_id)
                if ext_data:
                    return ext_data
            except Exception:
                continue
    return None

enabled_count = 0
mismatches = 0
for browser_name in app.config['browsers']:

    status = app.check_extension_status(browser_name)
    print('here is teh status', status)
    ext_data = read_ext_data_from_bases(browser_name, extension_id)

    incog = extension_guardian_module._is_incognito_allowed(ext_data)
    status_text = 'ENABLED' if status else 'DISABLED'
    incog_text = 'Unknown' if incog is None else ('Allowed' if incog else 'Not allowed')
    print(f"{browser_name}: {status_text} (Incognito: {incog_text})")

    if status:
        enabled_count += 1

    if incog is False and status is True:
        mismatches += 1
        print(f"Mismatch: {browser_name} should be DISABLED when incognito/private is off.")

print(f"Enabled in {enabled_count}/{len(app.config['browsers'])} browsers")

if mismatches:
    print(f"Incognito-off test: {mismatches} mismatch(es) detected")