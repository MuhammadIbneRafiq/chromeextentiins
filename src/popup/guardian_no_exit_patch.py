#!/usr/bin/env python3
"""
Guardian No-Exit Patch
This script modifies the extension-guardian-desktop.py file to remove exit functionality
"""

import os
import sys
import shutil
import re

def patch_guardian_file():
    """Patch the guardian file to remove exit functionality"""
    guardian_file = "extension-guardian-desktop.py"
    
    # Check if file exists
    if not os.path.exists(guardian_file):
        print(f"Error: {guardian_file} not found!")
        return False
    
    # Create backup
    backup_file = f"{guardian_file}.bak"
    shutil.copy2(guardian_file, backup_file)
    print(f"Created backup: {backup_file}")
    
    # Read the file
    with open(guardian_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Patch 1: Remove exit functionality from system tray
    tray_menu_pattern = r"(pystray\.Menu\(\s*pystray\.MenuItem\(\"Show Window\", self\.show_window\),\s*pystray\.MenuItem\(\"Stop Monitoring\", self\.stop_monitoring\),\s*pystray\.MenuItem\(\"Exit\", self\.quit_app\)\s*\))"
    tray_menu_replacement = r"pystray.Menu(\n                pystray.MenuItem(\"Show Window\", self.show_window)\n                # Exit functionality removed for security\n            )"
    
    content = re.sub(tray_menu_pattern, tray_menu_replacement, content)
    
    # Patch 2: Modify the quit_app and stop_monitoring methods
    quit_app_pattern = r"def quit_app\(self\):\s*\"\"\"Quit the application\"\"\"\s*self\.is_monitoring = False\s*if hasattr\(self, 'icon'\):\s*self\.icon\.stop\(\)\s*self\.root\.quit\(\)"
    quit_app_replacement = r"def quit_app(self):\n        \"\"\"Quit functionality disabled\"\"\"\n        # Exit disabled for security\n        self.logger.info(\"Exit attempt blocked - app is in permanent mode\")\n        # Show a message instead\n        try:\n            import tkinter.messagebox as messagebox\n            messagebox.showinfo(\"Exit Disabled\", \"This app cannot be closed for security reasons.\")\n        except:\n            pass"
    
    content = re.sub(quit_app_pattern, quit_app_replacement, content)
    
    # Patch 3: Modify stop_monitoring method
    stop_monitoring_pattern = r"def stop_monitoring\(self\):\s*\"\"\"Stop monitoring and exit\"\"\"\s*self\.is_monitoring = False\s*if hasattr\(self, 'icon'\):\s*self\.icon\.stop\(\)\s*self\.root\.quit\(\)"
    stop_monitoring_replacement = r"def stop_monitoring(self):\n        \"\"\"Stop monitoring disabled\"\"\"\n        # Stop monitoring disabled for security\n        self.logger.info(\"Stop monitoring attempt blocked - app is in permanent mode\")\n        # Show a message instead\n        try:\n            import tkinter.messagebox as messagebox\n            messagebox.showinfo(\"Monitoring Protection\", \"Monitoring cannot be stopped for security reasons.\")\n        except:\n            pass"
    
    content = re.sub(stop_monitoring_pattern, stop_monitoring_replacement, content)
    
    # Patch 4: Modify on_closing method to prevent window close
    on_closing_pattern = r"def on_closing\(self\):\s*if self\.protection_active:(.*?)self\.root\.destroy\(\)\s*return(.*?)# Hide the window instead of destroying it\s*self\.root\.withdraw\(\)"
    on_closing_replacement = r"def on_closing(self):\n        # Prevent closing the window\n        self.logger.info(\"Window close attempt blocked - hiding window instead\")\n        # Hide the window instead of destroying it\n        self.root.withdraw()"
    
    content = re.sub(on_closing_pattern, on_closing_replacement, content, flags=re.DOTALL)
    
    # Patch 5: Add command line argument check for --no-exit
    main_pattern = r"if __name__ == \"__main__\":\s*import sys\s*\s*# Check for command line arguments\s*background_mode = \"--background\" in sys\.argv or \"-b\" in sys\.argv\s*\s*app = ExtensionGuardian\(background_mode=background_mode\)\s*app\.run\(\)"
    main_replacement = r"if __name__ == \"__main__\":\n    import sys\n    import os\n    \n    # Check for command line arguments\n    background_mode = \"--background\" in sys.argv or \"-b\" in sys.argv\n    no_exit_mode = \"--no-exit\" in sys.argv or os.environ.get(\"GUARDIAN_NO_EXIT\") == \"1\"\n    \n    # If in no-exit mode, apply additional protections\n    if no_exit_mode:\n        print(\"Starting in NO-EXIT mode - application cannot be closed\")\n    \n    app = ExtensionGuardian(background_mode=background_mode)\n    app.run()"
    
    content = re.sub(main_pattern, main_replacement, content)
    
    # Write the modified content back
    with open(guardian_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Successfully patched {guardian_file} to remove exit functionality")
    print("Now rebuild the app with build_all.bat")
    return True

if __name__ == "__main__":
    print("Guardian No-Exit Patch")
    print("======================")
    print("This will modify the guardian app to prevent it from being closed")
    
    if patch_guardian_file():
        print("\nPatch applied successfully!")
        print("\nNext steps:")
        print("1. Run build_all.bat to rebuild the executable")
        print("2. Run run-guardian-no-exit.bat to start in protected mode")
    else:
        print("\nPatch failed!")
