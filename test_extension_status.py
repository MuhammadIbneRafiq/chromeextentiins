import sys
import os
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
for browser_name in ['chrome.exe', 'brave.exe', 'comet.exe', 'msedge.exe']:
    status = app.check_extension_status(browser_name)
    print(f"{browser_name}: {'ENABLED' if status else 'DISABLED'}")
    if status:
        enabled_count += 1
print(f"Enabled in {enabled_count}/4 browsers")