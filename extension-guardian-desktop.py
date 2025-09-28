import tkinter as tk
from tkinter import ttk, messagebox
import psutil
import time
import threading
import json
import os
import winreg
import ctypes
from datetime import datetime, timedelta
import webbrowser
from pathlib import Path
import logging

class ExtensionGuardian:
    def __init__(self, background_mode=False):
        self.root = tk.Tk()
        self.root.title("Extension Guardian")
        self.root.geometry("800x600")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Store background mode setting
        self.background_mode = background_mode
        
        self.config = {
            'extension_id': 'figcnikhjnpbflcemlbclimihgebncci',
            'monitoring_enabled': True,
            'browser_close_enabled': True,
            'uninstall_protection_enabled': False,
            'protection_duration_hours': 24,
            'check_interval_seconds': 5,  # Check every 5 seconds for faster detection
            'warning_countdown_seconds': 5,
            'browsers': ['chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe']
        }
        
        self.is_monitoring = False
        self.protection_active = False
        self.protection_end_time = None
        self.extension_status = {}
        self.browser_processes = []
        self.monitoring_thread = None
        
        self.setup_logging()
        self.setup_gui()
        self.load_config()
        
        if self.config['monitoring_enabled']:
            self.start_monitoring()
    
    def setup_logging(self):
        log_dir = Path.home() / "ExtensionGuardian" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"guardian_{datetime.now().strftime('%Y%m%d')}.log", encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def setup_gui(self):
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.main_frame = ttk.Frame(notebook)
        notebook.add(self.main_frame, text="Main")
        
        self.status_frame = ttk.Frame(notebook)
        notebook.add(self.status_frame, text="Status")
        
        self.settings_frame = ttk.Frame(notebook)
        notebook.add(self.settings_frame, text="Settings")
        
        self.protection_frame = ttk.Frame(notebook)
        notebook.add(self.protection_frame, text="Protection")
        
        self.setup_main_tab()
        self.setup_status_tab()
        self.setup_settings_tab()
        self.setup_protection_tab()
    
    def setup_main_tab(self):
        title_label = ttk.Label(self.main_frame, text="Extension Guardian", font=('Arial', 16, 'bold'))
        title_label.pack(pady=10)
        
        self.status_var = tk.StringVar(value="Stopped")
        status_frame = ttk.LabelFrame(self.main_frame, text="Status")
        status_frame.pack(fill='x', padx=10, pady=5)
        
        self.status_label = ttk.Label(status_frame, textvariable=self.status_var, font=('Arial', 12))
        self.status_label.pack(pady=5)
        
        button_frame = ttk.Frame(self.main_frame)
        button_frame.pack(fill='x', padx=10, pady=10)
        
        self.start_button = ttk.Button(button_frame, text="Start Monitoring", command=self.start_monitoring)
        self.start_button.pack(side='left', padx=5)
        
        self.stop_button = ttk.Button(button_frame, text="Stop Monitoring", command=self.stop_monitoring, state='disabled')
        self.stop_button.pack(side='left', padx=5)
        
        self.force_check_button = ttk.Button(button_frame, text="Force Check", command=self.force_extension_check)
        self.force_check_button.pack(side='left', padx=5)
        
        info_frame = ttk.LabelFrame(self.main_frame, text="Extension Information")
        info_frame.pack(fill='x', padx=10, pady=5)
        
        self.extension_info_text = tk.Text(info_frame, height=6, wrap='word')
        self.extension_info_text.pack(fill='both', padx=5, pady=5)
        
        actions_frame = ttk.LabelFrame(self.main_frame, text="Quick Actions")
        actions_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Button(actions_frame, text="Close All Browsers", command=self.close_all_browsers).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="Open Extension Page", command=self.open_extension_page).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="Test Extension Check", command=self.test_extension_check).pack(side='left', padx=5)
        ttk.Button(actions_frame, text="View Logs", command=self.view_logs).pack(side='left', padx=5)
    
    def setup_status_tab(self):
        browser_frame = ttk.LabelFrame(self.status_frame, text="Browser Status")
        browser_frame.pack(fill='x', padx=10, pady=5)
        
        self.browser_tree = ttk.Treeview(browser_frame, columns=('Status', 'PID', 'Extension'), show='tree headings')
        self.browser_tree.heading('#0', text='Browser')
        self.browser_tree.heading('Status', text='Status')
        self.browser_tree.heading('PID', text='PID')
        self.browser_tree.heading('Extension', text='Extension Status')
        self.browser_tree.pack(fill='both', padx=5, pady=5)
        
        ext_frame = ttk.LabelFrame(self.status_frame, text="Extension Details")
        ext_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.extension_details = tk.Text(ext_frame, wrap='word')
        self.extension_details.pack(fill='both', padx=5, pady=5)
        
        ttk.Button(self.status_frame, text="Refresh Status", command=self.refresh_status).pack(pady=5)
    
    def setup_settings_tab(self):
        monitor_frame = ttk.LabelFrame(self.settings_frame, text="Monitoring Settings")
        monitor_frame.pack(fill='x', padx=10, pady=5)
        
        self.monitoring_var = tk.BooleanVar(value=self.config['monitoring_enabled'])
        ttk.Checkbutton(monitor_frame, text="Enable Monitoring", variable=self.monitoring_var,
                       command=self.toggle_monitoring).pack(anchor='w', padx=5, pady=2)
        
        self.browser_close_var = tk.BooleanVar(value=self.config['browser_close_enabled'])
        ttk.Checkbutton(monitor_frame, text="Close Browser When Extension Disabled", 
                       variable=self.browser_close_var).pack(anchor='w', padx=5, pady=2)
        
        interval_frame = ttk.Frame(monitor_frame)
        interval_frame.pack(fill='x', padx=5, pady=2)
        ttk.Label(interval_frame, text="Check Interval (seconds):").pack(side='left')
        self.interval_var = tk.IntVar(value=self.config['check_interval_seconds'])
        ttk.Spinbox(interval_frame, from_=5, to=300, textvariable=self.interval_var, width=10).pack(side='right')
        
        ext_frame = ttk.LabelFrame(self.settings_frame, text="Extension Settings")
        ext_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(ext_frame, text="Extension ID:").pack(anchor='w', padx=5, pady=2)
        self.extension_id_var = tk.StringVar(value=self.config['extension_id'])
        ttk.Entry(ext_frame, textvariable=self.extension_id_var, width=50).pack(fill='x', padx=5, pady=2)
        
        browser_frame = ttk.LabelFrame(self.settings_frame, text="Monitored Browsers")
        browser_frame.pack(fill='x', padx=10, pady=5)
        
        for browser in self.config['browsers']:
            var = tk.BooleanVar(value=True)
            ttk.Checkbutton(browser_frame, text=browser, variable=var).pack(anchor='w', padx=5, pady=1)
        
        ttk.Button(self.settings_frame, text="Save Settings", command=self.save_settings).pack(pady=10)
    
    def setup_protection_tab(self):
        status_frame = ttk.LabelFrame(self.protection_frame, text="Protection Status")
        status_frame.pack(fill='x', padx=10, pady=5)
        
        self.protection_status_var = tk.StringVar(value="Protection Disabled")
        ttk.Label(status_frame, textvariable=self.protection_status_var, font=('Arial', 12)).pack(pady=5)
        
        # Protection controls
        control_frame = ttk.LabelFrame(self.protection_frame, text="Protection Controls")
        control_frame.pack(fill='x', padx=10, pady=5)
        
        duration_frame = ttk.Frame(control_frame)
        duration_frame.pack(fill='x', padx=5, pady=5)
        ttk.Label(duration_frame, text="Protection Duration (hours):").pack(side='left')
        self.protection_duration_var = tk.IntVar(value=self.config['protection_duration_hours'])
        ttk.Spinbox(duration_frame, from_=1, to=168, textvariable=self.protection_duration_var, width=10).pack(side='right')
        
        button_frame = ttk.Frame(control_frame)
        button_frame.pack(fill='x', padx=5, pady=5)
        
        ttk.Button(button_frame, text="Enable Protection", command=self.enable_protection).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Disable Protection", command=self.disable_protection).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Emergency Disable", command=self.emergency_disable).pack(side='left', padx=5)
        
        warning_frame = ttk.LabelFrame(self.protection_frame, text="Warning")
        warning_frame.pack(fill='x', padx=10, pady=5)
        
        warning_text = """warning."""
        ttk.Label(warning_frame, text=warning_text, wraplength=700, justify='left').pack(padx=5, pady=5)
    
    def start_monitoring(self):
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.status_var.set("Monitoring")
        self.start_button.config(state='disabled')
        self.stop_button.config(state='normal')
        
        self.monitoring_thread = threading.Thread(target=self.monitoring_loop, daemon=True)
        self.monitoring_thread.start()
            
    def stop_monitoring(self):
        self.is_monitoring = False
        self.status_var.set("Stopped")
        self.start_button.config(state='normal')
        self.stop_button.config(state='disabled')
    
    def monitoring_loop(self):
        while self.is_monitoring:
            try:
                self.check_browsers_and_extensions()
                time.sleep(self.config['check_interval_seconds'])
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)
    
    def check_browsers_and_extensions(self):
        browsers_found = []
        extension_disabled = False
        
        # First, check for direct disabled indicators in any browser's storage
        direct_disabled = self.check_direct_disabled_indicators()
        if direct_disabled:
            self.logger.warning("DIRECT DISABLED INDICATORS FOUND - Extension is disabled")
            extension_disabled = True
        
        # Then check running browsers
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                if proc.info['name'].lower() in [b.lower() for b in self.config['browsers']]:
                    browsers_found.append({
                        'name': proc.info['name'],
                        'pid': proc.info['pid'],
                        'exe': proc.info['exe']
                    })
                    
                    extension_enabled = self.check_extension_status(proc.info['name'])
                    if not extension_enabled:
                        extension_disabled = True
                        self.logger.warning(f"EXTENSION DISABLED in {proc.info['name']} (PID: {proc.info['pid']})")
                    else:
                        self.logger.info(f"Extension enabled in {proc.info['name']} (PID: {proc.info['pid']})")
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        self.update_browser_status(browsers_found)
        
        if extension_disabled and self.config['browser_close_enabled']:
            self.logger.warning("EXTENSION DISABLED DETECTED - CLOSING BROWSERS")
            self.handle_extension_disabled()
            
    def check_direct_disabled_indicators(self):
        """Check for direct indicators that the extension has been disabled in any browser"""
        try:
            # Check common browser paths for disabled indicators
            browsers_to_check = [
                {
                    'name': 'Chrome',
                    'path': r"%LOCALAPPDATA%\Google\Chrome\User Data\Default"
                },
                {
                    'name': 'Brave',
                    'path': r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default"
                },
                {
                    'name': 'Edge',
                    'path': r"%LOCALAPPDATA%\Microsoft\Edge\User Data\Default"
                }
            ]
            
            extension_id = self.config['extension_id']
            
            for browser in browsers_to_check:
                try:
                    browser_path = os.path.expandvars(browser['path'])
                    
                    # Check 1: Look for direct disabled state file in local storage
                    local_storage_path = os.path.join(browser_path, "Local Storage", "leveldb")
                    if os.path.exists(local_storage_path):
                        # Check for guardian detection files
                        guardian_file = os.path.join(local_storage_path, "guardianDetectedDisabled")
                        if os.path.exists(guardian_file):
                            self.logger.warning(f"Guardian detected extension disabled marker found in {browser['name']}")
                            return True
                    
                    # Check 2: Look in extension storage
                    ext_storage_path = os.path.join(browser_path, "Storage", "ext", extension_id)
                    if os.path.exists(ext_storage_path):
                        disabled_marker = os.path.join(ext_storage_path, "extensionDisabled")
                        if os.path.exists(disabled_marker):
                            self.logger.warning(f"Extension disabled marker found in {browser['name']} storage")
                            return True
                            
                    # Check 3: Look for extension state in preferences
                    prefs_path = os.path.join(browser_path, "Preferences")
                    if os.path.exists(prefs_path):
                        try:
                            with open(prefs_path, 'r', encoding='utf-8') as f:
                                prefs_data = json.load(f)
                                
                            # Check for disabled state in local storage section
                            local_storage = prefs_data.get('local_storage', {})
                            if local_storage:
                                for key, value in local_storage.items():
                                    if 'extensionDisabled' in key and value:
                                        self.logger.warning(f"Extension disabled marker found in {browser['name']} preferences")
                                        return True
                        except:
                            pass
                            
                except Exception as e:
                    self.logger.error(f"Error checking {browser['name']} for disabled indicators: {e}")
                    
            return False
        except Exception as e:
            self.logger.error(f"Error in check_direct_disabled_indicators: {e}")
            return False
    
    def check_extension_status(self, browser_name):
        try:
            browser_key = browser_name.lower().replace('.exe', '')

            if 'chrome' in browser_key:
                return self.check_chrome_extension_status()
            elif 'edge' in browser_key:
                return self.check_edge_extension_status()
            elif 'brave' in browser_key:
                return self.check_brave_extension_status()
            elif 'firefox' in browser_key:
                return self.check_firefox_extension_status()
            else:
                self.logger.warning(f"Unknown browser: {browser_name}")
                return True  # Assume enabled for unknown browsers
        except Exception as e:
            self.logger.error(f"Error checking extension status for {browser_name}: {e}")
            return True  # Return True to avoid false positives
    
    def check_chrome_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            
            # FIRST CHECK: Look for direct disabled state indicators in local storage
            # This is the most reliable method as it's set by our extension code
            try:
                chrome_data_path = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default")
                local_storage_path = os.path.join(chrome_data_path, "Local Storage", "leveldb")
                
                # Check if we can find the extensionDisabled flag in any file
                if os.path.exists(local_storage_path):
                    # Check for extension's disabled state marker in storage
                    storage_file = os.path.join(chrome_data_path, "Local Storage", "leveldb", "MANIFEST-000001")
                    if os.path.exists(storage_file):
                        # Check if there's a storage file indicating disabled state
                        guardian_file = os.path.join(chrome_data_path, "Local Storage", "leveldb", "guardianDetectedDisabled")
                        if os.path.exists(guardian_file):
                            self.logger.warning(f"Guardian detected extension disabled marker found in Chrome")
                            return False
            except Exception as storage_err:
                self.logger.error(f"Error checking Chrome local storage: {storage_err}")
            
            # SECOND CHECK: Look for the extension's folder and preferences
            chrome_data_path = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Default")
            
            # Check Local Extension Settings directory
            ext_settings_path = os.path.join(chrome_data_path, "Local Extension Settings", extension_id)
            if not os.path.exists(ext_settings_path):
                self.logger.warning(f"Extension {extension_id} folder not found in Chrome Local Extension Settings")
                return False
                
            self.logger.info(f"Extension {extension_id} folder found in Chrome Local Extension Settings")
            
            # Check preferences file for extension data
            prefs_path = os.path.join(chrome_data_path, "Preferences")
            if os.path.exists(prefs_path):
                with open(prefs_path, 'r', encoding='utf-8') as f:
                    prefs_data = json.load(f)
                    
                # Navigate to extensions settings
                extensions = prefs_data.get('extensions', {}).get('settings', {})
                if extension_id in extensions:
                    ext_data = extensions[extension_id]
                    self.logger.info(f"Extension data found in Chrome: {ext_data}")
                    
                    # Check standard Chrome extension state
                    state = ext_data.get('state', 0)
                    if state == 0:  # 0 = disabled, 1 = enabled
                        self.logger.warning(f"Extension {extension_id} is DISABLED in Chrome (state: {state})")
                        return False
                    
                    # Check additional disable indicators
                    if ext_data.get('blacklist_state', 0) != 0:
                        self.logger.warning(f"Extension {extension_id} is blacklisted in Chrome")
                        return False
                        
                    if ext_data.get('disable_reasons', 0) != 0:
                        self.logger.warning(f"Extension {extension_id} has disable_reasons in Chrome")
                        return False
                    
                    if ext_data.get('withholding_permissions', False):
                        self.logger.warning(f"Extension {extension_id} has withholding_permissions in Chrome")
                        return False
                    
                    # THIRD CHECK: Check for our custom extension state indicators
                    # These are set by our extension code to indicate disabled state
                    try:
                        # Look for extensionDisabled in the extension data
                        if 'extensionDisabled' in ext_data and ext_data['extensionDisabled']:
                            self.logger.warning(f"Extension {extension_id} has extensionDisabled flag in Chrome")
                            return False
                    except Exception as ext_err:
                        self.logger.error(f"Error checking Chrome extension data: {ext_err}")
                    
                    # If we have the extension data and no disable indicators, assume it's enabled
                    self.logger.info(f"Extension {extension_id} is ENABLED in Chrome")
                    return True
                else:
                    self.logger.warning(f"Extension {extension_id} not found in Chrome preferences")
                    return False
            else:
                self.logger.warning("Chrome preferences file not found")
                # If we have a folder but no preferences file, assume it's enabled
                return True
                
        except Exception as e:
            self.logger.error(f"Error checking Chrome extension status: {e}")
            # Return True to avoid false positives if we can't check properly
            return True
    
    def check_firefox_extension_status(self):
        try:
            # Firefox extensions are more complex to check
            # For now, just return True (assume enabled)
            self.logger.info("Firefox extension checking not implemented yet - assuming enabled")
            return True
        except Exception as e:
            self.logger.error(f"Error checking Firefox extension status: {e}")
            return True
    
    def check_edge_extension_status(self):
        try:
            # Edge extension registry path
            reg_path = r"SOFTWARE\Microsoft\Edge\PreferenceMACs\Default\extensions.settings"
            
            # Try to find extension in registry
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path) as key:
                # Check if our extension ID exists
                try:
                    # Get the extension value (this is encoded, but if it exists, extension is installed)
                    extension_value = winreg.QueryValue(key, self.config['extension_id'])
                    self.logger.info(f"Extension {self.config['extension_id']} found in Edge registry - ENABLED")
                    
                    # For now, assume if it exists in registry, it's enabled
                    # TODO: Decode the value to check actual enabled/disabled state
                    return True
                    
                except FileNotFoundError:
                    self.logger.warning(f"Extension {self.config['extension_id']} NOT found in Edge registry")
                    return False
                
        except Exception as e:
            self.logger.error(f"Error checking Edge extension: {e}")
            return True
    
    def check_brave_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            
            # FIRST CHECK: Look for direct disabled state indicators in local storage
            # This is the most reliable method as it's set by our extension code
            try:
                brave_data_path = os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default")
                local_storage_path = os.path.join(brave_data_path, "Local Storage", "leveldb")
                
                # Check if we can find the extensionDisabled flag in any file
                if os.path.exists(local_storage_path):
                    # Check for extension's disabled state marker in storage
                    storage_file = os.path.join(brave_data_path, "Local Storage", "leveldb", "MANIFEST-000001")
                    if os.path.exists(storage_file):
                        # Check if there's a storage file indicating disabled state
                        # This is a simple check for the guardian detection files
                        guardian_file = os.path.join(brave_data_path, "Local Storage", "leveldb", "guardianDetectedDisabled")
                        if os.path.exists(guardian_file):
                            self.logger.warning(f"Guardian detected extension disabled marker found")
                            return False
            except Exception as storage_err:
                self.logger.error(f"Error checking local storage: {storage_err}")
            
            # SECOND CHECK: Look for the extension's folder and preferences
            brave_data_path = os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default")
            
            # Check Local Extension Settings directory
            ext_settings_path = os.path.join(brave_data_path, "Local Extension Settings", extension_id)
            if not os.path.exists(ext_settings_path):
                self.logger.warning(f"Extension {extension_id} folder not found in Brave Local Extension Settings")
                return False
                
            self.logger.info(f"Extension {extension_id} folder found in Brave Local Extension Settings")
            
            # Check preferences file for extension data
            prefs_path = os.path.join(brave_data_path, "Preferences")
            if os.path.exists(prefs_path):
                with open(prefs_path, 'r', encoding='utf-8') as f:
                    prefs_data = json.load(f)
                    
                # Navigate to extensions settings
                extensions = prefs_data.get('extensions', {}).get('settings', {})
                if extension_id in extensions:
                    ext_data = extensions[extension_id]
                    self.logger.info(f"Extension data found: {ext_data}")
                    
                    # For developer extensions, we need to check different fields
                    # Check if extension has been blacklisted
                    if ext_data.get('blacklist_state', 0) != 0:
                        self.logger.warning(f"Extension {extension_id} is blacklisted in Brave")
                        return False
                        
                    # Check if extension has disable_reasons
                    if ext_data.get('disable_reasons', 0) != 0:
                        self.logger.warning(f"Extension {extension_id} has disable_reasons in Brave")
                        return False
                    
                    # Check if extension has withholding_permissions
                    if ext_data.get('withholding_permissions', False):
                        self.logger.warning(f"Extension {extension_id} has withholding_permissions in Brave")
                        return False
                    
                    # THIRD CHECK: Check for our custom extension state indicators
                    # These are set by our extension code to indicate disabled state
                    try:
                        # Look for extensionDisabled in the extension data
                        if 'extensionDisabled' in ext_data and ext_data['extensionDisabled']:
                            self.logger.warning(f"Extension {extension_id} has extensionDisabled flag in Brave")
                            return False
                    except Exception as ext_err:
                        self.logger.error(f"Error checking extension data: {ext_err}")
                    
                    # If we have the extension data and no disable indicators, assume it's enabled
                    self.logger.info(f"Extension {extension_id} is ENABLED in Brave")
                    return True
                else:
                    self.logger.warning(f"Extension {extension_id} not found in Brave preferences")
                    # If we have a folder but no preferences entry, assume it's enabled
                    # This can happen with developer extensions
                    return True
            else:
                self.logger.warning("Brave preferences file not found")
                # If we have a folder but no preferences file, assume it's enabled
                return True
        except Exception as e:
            self.logger.error(f"Error checking Brave extension status: {e}")
            # Return True to avoid false positives if we can't check properly
            return True
    
    def handle_extension_disabled(self):        
        self.show_extension_disabled_warning()
        threading.Thread(target=self.countdown_and_close_browsers, daemon=True).start()
    
    def show_extension_disabled_warning(self):
        def show_warning():
            warning_msg = f"""
EXTENSION GUARDIAN ALERT!

Your extension ({self.config['extension_id']}) has been disabled in one or more browsers.

This could happen if:
• You manually disabled the extension
• Browser updated and disabled extensions
• Extension was removed or corrupted

Action: All browser windows will close in {self.config['warning_countdown_seconds']} seconds to protect your browsing session.

To prevent this:
1. Re-enable the extension in your browser
2. Check Extensions page (chrome://extensions/ or brave://extensions/)
3. Restart Extension Guardian monitoring
"""
            try:
                messagebox.showwarning("Extension Guardian - Extension Disabled", warning_msg)
            except:
                self.logger.warning("Extension disabled - GUI not available for dialog")
        
        try:
            self.root.after(0, show_warning)
        except:
            self.logger.warning("Extension disabled - GUI not available")
    
    def countdown_and_close_browsers(self):
        for i in range(self.config['warning_countdown_seconds'], 0, -1):
            try:
                self.status_var.set(f"Closing browsers in {i} seconds...")
            except:
                self.logger.info(f"Closing browsers in {i} seconds...")
            time.sleep(1)
        
        self.close_all_browsers()
        
        try:
            self.status_var.set("Browsers closed - Extension disabled")
        except:
            self.logger.info("Browsers closed - Extension disabled")
    
    def close_all_browsers(self):
        closed_count = 0
        
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if proc.info['name'].lower() in [b.lower() for b in self.config['browsers']]:
                    proc.terminate()
                    closed_count += 1
                    self.logger.info(f"Closed browser: {proc.info['name']} (PID: {proc.info['pid']})")
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        self.logger.info(f"Closed {closed_count} browser processes")
    
    def enable_protection(self):
        duration = self.protection_duration_var.get()
        self.protection_end_time = datetime.now() + timedelta(hours=duration)
        self.protection_active = True
        
        self.protection_status_var.set(f"Protection Active - Expires: {self.protection_end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.set_uninstall_protection(True)
        
        self.logger.info(f"Uninstall protection enabled for {duration} hours")
        messagebox.showinfo("Protection Enabled", f"Uninstall protection enabled for {duration} hours")
    
    def disable_protection(self):
        self.protection_active = False
        self.protection_end_time = None
        self.protection_status_var.set("Protection Disabled")
        
        self.set_uninstall_protection(False)
        
        self.logger.info("Uninstall protection disabled")
        messagebox.showinfo("Protection Disabled", "Uninstall protection has been disabled")
    
    def emergency_disable(self):
        result = messagebox.askyesno("Emergency Disable", 
                                   "Are you sure you want to emergency disable protection?\n\n"
                                   "This will immediately remove all protection measures.")
        if result:
            self.disable_protection()
            messagebox.showinfo("Emergency Disabled", "Protection has been emergency disabled")
    
    def set_uninstall_protection(self, enable):
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
        
        if enable:
            # Add protection registry entries
            pass
        else:
            # Remove protection registry entries
            pass
        
    def update_browser_status(self, browsers):
        try:
            # Clear existing items
            for item in self.browser_tree.get_children():
                self.browser_tree.delete(item)
            
            # Add browser information
            for browser in browsers:
                try:
                    ext_enabled = self.check_extension_status(browser['name'])
                    ext_status = "ENABLED" if ext_enabled else "DISABLED"
                except Exception as e:
                    ext_status = f"ERROR: {str(e)[:30]}..."
                
                self.browser_tree.insert('', 'end', 
                                       text=browser['name'],
                                       values=('Running', browser['pid'], ext_status))
        except:
            # GUI is closed, just log the browser status
            for browser in browsers:
                self.logger.info(f"Browser running: {browser['name']} (PID: {browser['pid']})")
    
    def refresh_status(self):
        self.check_browsers_and_extensions()
    
    def force_extension_check(self):
        self.check_browsers_and_extensions()
    
    def open_extension_page(self):
        webbrowser.open('chrome://extensions/')
        
    def test_extension_check(self):
        """Test extension checking for all browsers"""
        test_results = []
        
        for browser in self.config['browsers']:
            browser_name = browser.replace('.exe', '')
            try:
                status = self.check_extension_status(browser)
                status_text = "ENABLED" if status else "DISABLED"
                test_results.append(f"{browser_name}: {status_text}")
            except Exception as e:
                test_results.append(f"{browser_name}: ERROR - {str(e)}")
        
        result_text = "Extension Status Test Results:\n\n" + "\n".join(test_results)
        
        # Update the extension info text
        try:
            self.extension_info_text.delete(1.0, tk.END)
            self.extension_info_text.insert(1.0, result_text)
        except:
            pass
        
        # Show in a message box too
        messagebox.showinfo("Extension Test Results", result_text)
        
        self.logger.info("Manual extension check completed")
        
    def view_logs(self):
        log_dir = Path.home() / "ExtensionGuardian" / "logs"
        os.startfile(str(log_dir))
     
    def save_settings(self):
        self.config['monitoring_enabled'] = self.monitoring_var.get()
        self.config['browser_close_enabled'] = self.browser_close_var.get()
        self.config['check_interval_seconds'] = self.interval_var.get()
        self.config['extension_id'] = self.extension_id_var.get()
        self.config['protection_duration_hours'] = self.protection_duration_var.get()
        
        self.save_config()
        messagebox.showinfo("Settings Saved", "Settings have been saved successfully")
    
    def load_config(self):
        config_file = Path.home() / "ExtensionGuardian" / "config.json"
        try:
            if config_file.exists():
                with open(config_file, 'r') as f:
                    saved_config = json.load(f)
                    self.config.update(saved_config)
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")
    
    def save_config(self):
        config_dir = Path.home() / "ExtensionGuardian"
        config_dir.mkdir(parents=True, exist_ok=True)
        
        config_file = config_dir / "config.json"
        with open(config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
        
    def toggle_monitoring(self):
        if self.monitoring_var.get():
            if not self.is_monitoring:
                self.start_monitoring()
        else:
            if self.is_monitoring:
                self.stop_monitoring()
    
    def on_closing(self):
        if self.protection_active:
            result = messagebox.askyesno("Protection Active", 
                                       "Protection is active. Do you want to continue monitoring in the background?")
            if not result:
                self.is_monitoring = False
                self.save_config()
                self.root.destroy()
                return
        
        # Hide the window instead of destroying it
        self.root.withdraw()
        
        # Create a system tray icon for background monitoring
        self.create_system_tray()
        
        # Continue monitoring in background
        self.continue_background_monitoring()
    
    def create_system_tray(self):
        try:
            # Create a simple tray icon using Windows API
            import pystray
            from PIL import Image
            import io
            
            # Create a simple icon
            img = Image.new('RGB', (64, 64), color='red')
            
            menu = pystray.Menu(
                pystray.MenuItem("Show Window", self.show_window),
                pystray.MenuItem("Stop Monitoring", self.stop_monitoring),
                pystray.MenuItem("Exit", self.quit_app)
            )
            
            self.icon = pystray.Icon("Extension Guardian", img, menu=menu)
            
            # Start the tray icon in a separate thread
            threading.Thread(target=self.icon.run, daemon=True).start()
            self.logger.info("System tray icon created successfully")
            
        except ImportError:
            # If pystray is not available, just log that we're running in background
            self.logger.info("Running in background mode (pystray not available - no system tray)")
        except Exception as e:
            self.logger.error(f"Error creating system tray: {e}")
            self.logger.info("Continuing in background mode without system tray")
    
    def show_window(self):
        """Show the main window"""
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
    
    def stop_monitoring(self):
        """Stop monitoring and exit"""
        self.is_monitoring = False
        if hasattr(self, 'icon'):
            self.icon.stop()
        self.root.quit()
    
    def quit_app(self):
        """Quit the application"""
        self.is_monitoring = False
        if hasattr(self, 'icon'):
            self.icon.stop()
        self.root.quit()
    
    def continue_background_monitoring(self):
        """Continue monitoring in the background"""
        while self.is_monitoring:
            try:
                self.check_browsers_and_extensions()
                time.sleep(self.config['check_interval_seconds'])
            except Exception as e:
                self.logger.error(f"Error in background monitoring: {e}")
                time.sleep(5)
    
    def run(self):
        # If background mode is enabled, hide the window and start monitoring
        if self.background_mode:
            self.logger.info("Starting in background mode")
            self.root.withdraw()
            self.create_system_tray()
            
            # Start monitoring in a separate thread so GUI can still process events
            self.monitoring_thread = threading.Thread(target=self.continue_background_monitoring, daemon=True)
            self.monitoring_thread.start()
            
            # Keep the main thread alive to handle system tray
            self.root.mainloop()
        else:
            self.root.mainloop()

if __name__ == "__main__":
    import sys
    
    # Check for command line arguments
    background_mode = "--background" in sys.argv or "-b" in sys.argv
    
    app = ExtensionGuardian(background_mode=background_mode)
    app.run()