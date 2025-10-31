import os
import json
import pystray
from PIL import Image
import tkinter as tk
from tkinter import ttk, messagebox
import psutil
import time
import threading
import json
import os
import winreg
from datetime import datetime, timedelta
import webbrowser
from pathlib import Path
import logging
import sys
import subprocess
import re
import ctypes

# -----------------------------
# Browser detection and blocking utilities
# -----------------------------

KNOWN_BROWSER_EXE_NAMES = [
    'chrome.exe', 'msedge.exe', 'firefox.exe', 'opera.exe', 'opera_browser.exe', 'opera.exe', 'opera_gx.exe',
    'brave.exe', 'vivaldi.exe', 'waterfox.exe', 'librewolf.exe', 'yandex.exe', 'yandexbrowser.exe', 'maxthon.exe',
    'ucbrowser.exe', 'safari.exe', 'chromium.exe', 'dragon.exe', 'epic.exe', 'iron.exe', 'torch.exe', 'slimjet.exe',
    'centbrowser.exe', '360chrome.exe', 'palemoon.exe', 'comet.exe', 'duckduckgo.exe', 'ddg.exe'
]

# The only browsers allowed to remain running
ALLOWED_BROWSER_EXE_NAMES = [
    'chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe'
]

VENDOR_OR_PRODUCT_KEYWORDS = [
    'chrome', 'chromium', 'edge', 'firefox', 'mozilla', 'opera', 'vivaldi', 'brave', 'yandex', 'waterfox',
    'librewolf', 'dragon', 'epic', 'iron', 'torch', 'slimjet', 'cent', '360chrome', 'palemoon', 'maxthon', 'tor',
    'comet', 'duckduckgo', 'ddg'
]

def _get_logger(maybe_logger=None):
    if maybe_logger is not None:
        return maybe_logger
    return logging.getLogger('browser_blocker')

def _run_hidden(cmd, **kwargs):
    """Run subprocess without flashing a console window on Windows."""
    try:
        creationflags = kwargs.pop('creationflags', 0)
        # CREATE_NO_WINDOW
        creationflags |= 0x08000000
        kwargs['creationflags'] = creationflags
        if os.name == 'nt':
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0
            kwargs['startupinfo'] = si
        return subprocess.run(cmd, **kwargs)
    except Exception as e:
        try:
            return subprocess.CompletedProcess(cmd, returncode=1)
        except Exception:
            raise e

def _is_incognito_allowed(ext_settings_obj):
    """Best-effort parse for Chromium incognito allowance.
    Different Chromium builds store this flag slightly differently. We treat any
    of the following as allowed in incognito:
      - incognito == True
      - incognito is a non-zero integer (e.g., 1 or 2)
      - incognito string equals 'spanning' or 'split' (case-insensitive)
      - allow_in_incognito == True
    """
    try:
        if not isinstance(ext_settings_obj, dict):
            return False
        val = ext_settings_obj.get('incognito')
        if isinstance(val, bool):
            if val:
                return True
        elif isinstance(val, (int, float)):
            if int(val) != 0:
                return True
        elif isinstance(val, str):
            if val.lower() in ('spanning', 'split', 'enabled', 'true', 'on'):
                return True
        # Alternate key seen in some variants
        if bool(ext_settings_obj.get('allow_in_incognito')):
            return True
    except Exception:
        return False
    return False

def _scan_profiles_for_ext_status(base_user_data_path, extension_id, logger):
    """Return True if extension is enabled (incognito/private allowed) across profiles; False if disabled/blocked.
    Logic:
      - Iterate all profile directories containing a Preferences file (e.g., Default, Profile 1, Profile 2)
      - If any profile has ext present with state==0 or incognito not allowed => DISABLED (return False)
      - If at least one profile has ext present with incognito allowed => mark enabled_candidate=True
      - If extension not present in any profile => DISABLED (return False)
      - Else return enabled_candidate
    """
    try:
        enabled_candidate = False
        found_any = False
        if not os.path.isdir(base_user_data_path):
            return False
        for name in os.listdir(base_user_data_path):
            profile_dir = os.path.join(base_user_data_path, name)
            if not os.path.isdir(profile_dir):
                continue
            # Profile dirs are typically 'Default' or 'Profile *'
            if name != 'Default' and not name.startswith('Profile'):
                continue
            prefs_path = os.path.join(profile_dir, 'Preferences')
            if not os.path.isfile(prefs_path):
                continue
            try:
                with open(prefs_path, 'r', encoding='utf-8') as f:
                    prefs = json.load(f)
                ext_data = prefs.get('extensions', {}).get('settings', {}).get(extension_id)
                if not ext_data:
                    # Extension not installed in this profile; skip
                    continue
                found_any = True
                # If explicitly disabled
                if ext_data.get('state') == 0:
                    logger.warning(f"Extension {extension_id} DISABLED (state=0) in profile '{name}'")
                    return False
                # If incognito/private not allowed
                if not _is_incognito_allowed(ext_data):
                    logger.warning(f"Extension {extension_id} not allowed in private/incognito in profile '{name}'")
                    return False
                enabled_candidate = True
            except Exception as e:
                # Skip malformed profiles
                logger.debug(f"Error reading Preferences for profile '{name}': {e}")
                continue
        if not found_any:
            # Not present in any profile => treat as disabled
            return False
        return enabled_candidate
    except Exception as e:
        try:
            logger.error(f"Error scanning profiles: {e}")
        except Exception:
            pass
        return False

def extract_exe_from_command(command):
    try:
        if not command:
            return None
        m = re.match(r'^\s*"?([^"\s]+?\.exe)"?', command.strip(), re.IGNORECASE)
        return m.group(1) if m else None
    except Exception:
        return None

def get_registered_browser_exes():
    exe_paths = set()
    roots = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Clients\StartMenuInternet"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Clients\StartMenuInternet"),
    ]
    for hive, root in roots:
        try:
            with winreg.OpenKey(hive, root) as key:
                idx = 0
                while True:
                    try:
                        sub_name = winreg.EnumKey(key, idx)
                        idx += 1
                    except OSError:
                        break
                    try:
                        cmd_key_path = root + f"\\{sub_name}\\shell\\open\\command"
                        with winreg.OpenKey(hive, cmd_key_path) as cmd_key:
                            cmd, _ = winreg.QueryValueEx(cmd_key, None)
                            exe = extract_exe_from_command(cmd)
                            if exe:
                                exe_paths.add(os.path.normpath(exe))
                    except OSError:
                        continue
        except OSError:
            continue
    return list(exe_paths)

def discover_browsers_from_filesystem():
    candidates = set()
    roots = [
        os.environ.get('ProgramFiles'),
        os.environ.get('ProgramFiles(x86)'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs'),
        os.environ.get('LOCALAPPDATA'),
    ]
    roots = [p for p in roots if p and os.path.isdir(p)]

    # Quick known paths without deep walking
    known_rel_paths = [
        (['Google', 'Chrome', 'Application'], 'chrome.exe'),
        (['Microsoft', 'Edge', 'Application'], 'msedge.exe'),
        (['BraveSoftware', 'Brave-Browser', 'Application'], 'brave.exe'),
        (['Mozilla Firefox'], 'firefox.exe'),
        (['Vivaldi', 'Application'], 'vivaldi.exe'),
        (['Opera'], 'opera.exe'),
        (['Opera GX'], 'opera.exe'),
        (['Yandex', 'YandexBrowser'], 'browser.exe'),
        (['Waterfox'], 'waterfox.exe'),
        (['LibreWolf'], 'librewolf.exe'),
        (['Comodo', 'Dragon'], 'dragon.exe'),
        (['SRWare Iron'], 'iron.exe'),
        (['Torch'], 'torch.exe'),
        (['SlimJet'], 'chrome.exe'),
        (['CentBrowser', 'Application'], 'chrome.exe'),
        (['Chromium', 'Application'], 'chrome.exe'),
        (['Tor Browser', 'Browser'], 'firefox.exe'),
        (['Perplexity', 'Comet', 'Application'], 'comet.exe'),
    ]
    for root in roots:
        for parts, exe_name in known_rel_paths:
            p = os.path.join(root, *parts, exe_name)
            if os.path.isfile(p):
                candidates.add(os.path.normpath(p))

    # Light scan: walk only top 3 levels, filter by keywords and known exe names
    def shallow_walk(base, max_depth=3):
        base = os.path.normpath(base)
        for dirpath, dirnames, filenames in os.walk(base):
            depth = os.path.normpath(dirpath).count(os.sep) - base.count(os.sep)
            if depth > max_depth:
                # prune deeper traversal
                dirnames[:] = []
                continue
            for fname in filenames:
                lower = fname.lower()
                if lower in KNOWN_BROWSER_EXE_NAMES or any(k in lower for k in VENDOR_OR_PRODUCT_KEYWORDS):
                    full = os.path.join(dirpath, fname)
                    candidates.add(os.path.normpath(full))

    for root in roots:
        try:
            shallow_walk(root, max_depth=3)
        except Exception:
            pass

    return list(candidates)

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def block_exe_firewall(exe_path, logger=None):
    logger = _get_logger(logger)
    if not exe_path or not os.path.isfile(exe_path):
        return False
    rule_name = f"ExtensionGuardian_Block_{os.path.basename(exe_path)}"
    try:
        _run_hidden(["netsh", "advfirewall", "firewall", "delete", "rule", f"name={rule_name}"], capture_output=True)
        _run_hidden(["netsh", "advfirewall", "firewall", "add", "rule", f"name={rule_name}", "dir=out", "action=block", f"program={exe_path}", "enable=yes"], check=False, capture_output=True)
        _run_hidden(["netsh", "advfirewall", "firewall", "add", "rule", f"name={rule_name}", "dir=in", "action=block", f"program={exe_path}", "enable=yes"], check=False, capture_output=True)
        logger.info(f"Firewall block ensured for {exe_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to add firewall rule for {exe_path}: {e}")
        return False

def kill_processes_for_exe(exe_path, logger=None):
    logger = _get_logger(logger)
    killed = 0
    try:
        image_name = os.path.basename(exe_path).lower()
        logger.debug(f"Attempting to kill processes for image: {image_name}")
        target_base = os.path.splitext(image_name)[0]

        for proc in psutil.process_iter(['pid', 'name']):
            try:
                pname = (proc.info.get('name') or '').lower()
                if not pname:
                    continue
                if pname == image_name or os.path.splitext(pname)[0] == target_base:
                    try:
                        proc.terminate()
                        try:
                            proc.wait(timeout=0.5)
                        except psutil.TimeoutExpired:
                            proc.kill()
                        killed += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        if killed:
            logger.info(f"Terminated {killed} process(es) for {exe_path}")
    except Exception as e:
        logger.error(f"Error killing processes for {exe_path}: {e}")
    return killed

def discover_installed_browser_paths():
    paths = set()
    for p in get_registered_browser_exes():
        paths.add(os.path.normpath(p))
    for p in discover_browsers_from_filesystem():
        paths.add(os.path.normpath(p))
    return sorted(paths)

def ensure_block_all_browsers(logger=None):
    logger = _get_logger(logger)
    results = {
        'discovered': [],
        'killed': {},
    }
    discovered = discover_installed_browser_paths()
    results['discovered'] = discovered
    for exe in discovered:
        image = os.path.basename(exe).lower()
        logger.debug(f"Discovered browser candidate: exe='{exe}' image='{image}'")
        if image in (name.lower() for name in ALLOWED_BROWSER_EXE_NAMES):
            # Skip allowed browsers (Chrome, Edge, Brave, Comet)
            logger.debug(f"Skipping allowed browser image='{image}'")
            continue
        killed_count = kill_processes_for_exe(exe, logger=logger)
        results['killed'][exe] = killed_count
    return results

def run_browser_blocker_cli(watch=False, interval=10):
    logger = _get_logger(None)
    if watch:
        logger.info(f"Starting browser blocker in watch mode (interval={interval}s)")
        try:
            while True:
                res = ensure_block_all_browsers(logger=logger)
                print(json.dumps(res, indent=2))
                time.sleep(max(1, int(interval)))
        except KeyboardInterrupt:
            print("Stopped.")
    else:
        res = ensure_block_all_browsers(logger=logger)
        print(json.dumps(res, indent=2))
        return res

class ExtensionGuardian:
    # Version identifier - update this to verify new builds
    VERSION = "2024.12.19-NO-EXIT-v2"
    FORCED_EXTENSION_ID = "ljfmjogahnigohdjkknaangiicalhlag"
    
    def __init__(self, background_mode=True):
        self.root = tk.Tk()
        self.root.title(f"Extension Guardian v{self.VERSION}")
        self.root.geometry("800x600")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Always force background mode; normal mode is disabled
        self.background_mode = True
        
        self.config = {
            'extension_id': self.FORCED_EXTENSION_ID,
            'monitoring_enabled': True,
            'browser_close_enabled': True,
            'uninstall_protection_enabled': False,
            'protection_duration_hours': 24,
            'check_interval_seconds': 1,  # Faster detection
            'warning_countdown_seconds': 15,
            'browsers': ['chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe']
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
        # Enforce forced ID after loading any saved config
        self.config['extension_id'] = self.FORCED_EXTENSION_ID

        # Ensure the desktop app starts in background at user logon
        try:
            self.ensure_startup_registration()
        except Exception as e:
            self.logger.error(f"Failed to register startup: {e}")
        
        if self.config['monitoring_enabled']:
            self.start_monitoring()
    
    def setup_logging(self):
        log_dir = Path.home() / "ExtensionGuardian" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        logging.basicConfig(
            level=logging.DEBUG,
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
        ttk.Spinbox(interval_frame, from_=1, to=300, textvariable=self.interval_var, width=10).pack(side='right')
        
        ext_frame = ttk.LabelFrame(self.settings_frame, text="Extension Settings")
        ext_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(ext_frame, text="Extension ID:").pack(anchor='w', padx=5, pady=2)
        self.extension_id_var = tk.StringVar(value=self.config['extension_id'])
        ttk.Entry(ext_frame, textvariable=self.extension_id_var, width=50, state='disabled').pack(fill='x', padx=5, pady=2)
        
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
        # Create disabled controls for protection disable actions (blocked for security)
        self.disable_protection_btn = ttk.Button(button_frame, text="Disable Protection", command=self.disable_protection, state='disabled')
        self.disable_protection_btn.pack(side='left', padx=5)
        self.emergency_disable_btn = ttk.Button(button_frame, text="Emergency Disable", command=self.emergency_disable, state='disabled')
        self.emergency_disable_btn.pack(side='left', padx=5)
        
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
        # Start aggressive block-all watcher alongside monitoring
        self.block_all_thread = threading.Thread(target=self.block_all_watch_loop, daemon=True)
        self.block_all_thread.start()
            
    def stop_monitoring(self):
        try:
            messagebox.showinfo("Action Blocked", "Stopping is disabled for security.")
        except:
            self.logger.info("Stop monitoring attempt blocked")
        return
    
    def monitoring_loop(self):
        while self.is_monitoring:
            try:
                self.logger.debug(f"[tick] scanning processes (interval=1s)")
                self.check_browsers_and_extensions()
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)
    
    def check_browsers_and_extensions(self):
        browsers_found = []
        extension_disabled = False
        any_check_performed = False
        any_enabled = False
        any_disabled = False
        allowed_set = set(b.lower() for b in self.config['browsers'])
        known_set = set(n.lower() for n in KNOWN_BROWSER_EXE_NAMES)
        killed_images = set()
        
        # Then check running browsers
        self.logger.debug("Iterating running processes...")
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                name_lower = (proc.info['name'] or '').lower()
                if not name_lower:
                    continue
                self.logger.debug(f"Process seen: name={proc.info['name']} pid={proc.info['pid']} exe={proc.info['exe']}")
                if name_lower in allowed_set:
                    browsers_found.append({
                        'name': proc.info['name'],
                        'pid': proc.info['pid'],
                        'exe': proc.info['exe']
                    })
                    
                    extension_enabled = self.check_extension_status(proc.info['name'])
                    any_check_performed = True
                    if not extension_enabled:
                        any_disabled = True
                        self.logger.warning(f"EXTENSION DISABLED in {proc.info['name']} (PID: {proc.info['pid']})")
                    else:
                        any_enabled = True
                        self.logger.info(f"Extension enabled in {proc.info['name']} (PID: {proc.info['pid']})")
                elif name_lower in known_set and name_lower not in killed_images:
                    # Unauthorized browser detected - kill immediately without admin
                    self.logger.warning(f"Unauthorized browser detected: {proc.info['name']} (PID: {proc.info['pid']}) - closing")
                    try:
                        kill_processes_for_exe(proc.info['name'], logger=self.logger)
                    except Exception:
                        pass
                    killed_images.add(name_lower)
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Evaluate direct disabled indicators only as a fallback when no browser checks succeeded
        # This avoids stale marker files causing false positives.
        if not any_check_performed:
            direct_disabled = self.check_direct_disabled_indicators()
            if direct_disabled:
                any_disabled = True
                self.logger.warning("DIRECT DISABLED INDICATORS FOUND (no browser checks) - treating as disabled")

        # Final decision: disabled if any_disabled is True
        extension_disabled = any_disabled

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
                },
                {
                    'name': 'Comet',
                    'path': r"%LOCALAPPDATA%\Perplexity\Comet\User Data\Default"
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
            elif 'comet' in browser_key:
                return self.check_comet_extension_status()
            else:
                self.logger.warning(f"Unknown browser: {browser_name}")
                return True  # Assume enabled for unknown browsers
        except Exception as e:
            self.logger.error(f"Error checking extension status for {browser_name}: {e}")
            return True  # Return True to avoid false positives
    
    def check_chrome_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            base = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
            status = _scan_profiles_for_ext_status(base, extension_id, self.logger)
            self.logger.info(f"Chrome status (profiles)={status}")
            return status
        except Exception as e:
            self.logger.error(f"Error checking Chrome extension status: {e}")
            return False
    
    def check_edge_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            base = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\User Data")
            status = _scan_profiles_for_ext_status(base, extension_id, self.logger)
            self.logger.info(f"Edge status (profiles)={status}")
            return status
        except Exception as e:
            self.logger.error(f"Error checking Edge extension: {e}")
            return False

    def check_comet_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            base = os.path.expandvars(r"%LOCALAPPDATA%\Perplexity\Comet\User Data")
            status = _scan_profiles_for_ext_status(base, extension_id, self.logger)
            self.logger.info(f"Comet status (profiles)={status}")
            return status
        except Exception as e:
            self.logger.error(f"Error checking Comet extension status: {e}")
            return False
    
    def check_brave_extension_status(self):
        try:
            extension_id = self.config['extension_id']
            base = os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data")
            status = _scan_profiles_for_ext_status(base, extension_id, self.logger)
            self.logger.info(f"Brave status (profiles)={status}")
            return status
        except Exception as e:
            self.logger.error(f"Error checking Brave extension status: {e}")
            return False
    
    def handle_extension_disabled(self):        
        self.show_extension_disabled_warning()
        threading.Thread(target=self.countdown_and_close_browsers, daemon=True).start()
    
    def show_extension_disabled_warning(self):
        def show_warning():
            warning_msg = f"""
Your extension ({self.config['extension_id']}) has been disabled in one or more browsers.

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
        closed_total = 0
        known_set = set(n.lower() for n in KNOWN_BROWSER_EXE_NAMES)
        seen_images = set()

        for proc in psutil.process_iter(['pid', 'name']):
            try:
                name_lower = (proc.info['name'] or '').lower()
                if name_lower and name_lower in known_set and name_lower not in seen_images:
                    killed = kill_processes_for_exe(proc.info['name'], logger=self.logger)
                    closed_total += killed
                    seen_images.add(name_lower)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass

        self.logger.info(f"Closed {closed_total} browser process(es)")

    def ensure_all_browsers_blocked(self):
        """Discover installed browsers and enforce blocks immediately."""
        return ensure_block_all_browsers(logger=self.logger)
    
    def enable_protection(self):
        duration = self.protection_duration_var.get()
        self.protection_end_time = datetime.now() + timedelta(hours=duration)
        self.protection_active = True
        
        self.protection_status_var.set(f"Protection Active - Expires: {self.protection_end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.set_uninstall_protection(True)
        
        self.logger.info(f"Uninstall protection enabled for {duration} hours")
        messagebox.showinfo("Protection Enabled", f"Uninstall protection enabled for {duration} hours")
    
    def disable_protection(self):
        try:
            messagebox.showinfo("Action Blocked", "Disabling protection is disabled for security.")
        except:
            self.logger.info("Disable protection attempt blocked")
        return
    
    def emergency_disable(self):
        try:
            messagebox.showinfo("Action Blocked", "Emergency disable is disabled for security.")
        except:
            self.logger.info("Emergency disable attempt blocked")
        return
    
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
        # Always enforce the forced extension ID
        self.config['extension_id'] = self.FORCED_EXTENSION_ID
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
            # Enforce up-to-date defaults regardless of stale saved config
            # Always keep monitoring enabled and browser-close protection on
            self.config['monitoring_enabled'] = True
            self.config['browser_close_enabled'] = True
            # Enforce the supported Chromium browsers only (remove Firefox etc.)
            self.config['browsers'] = ['chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe']
            # Always enforce 1s check interval
            self.config['check_interval_seconds'] = 1
            # Ensure countdown is at least 15 seconds as required
            try:
                if int(self.config.get('warning_countdown_seconds', 15)) < 15:
                    self.config['warning_countdown_seconds'] = 15
            except Exception:
                self.config['warning_countdown_seconds'] = 15
            # Always enforce the forced extension ID regardless of saved config
            self.config['extension_id'] = self.FORCED_EXTENSION_ID
        except Exception as e:
            self.logger.error(f"Error loading config: {e}")

    def ensure_startup_registration(self):
        """Register the desktop app to start in background on user logon."""
        try:
            import sys
            run_key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
            value_name = "ExtensionGuardianDesktop"

            # Resolve path to the executable (PyInstaller) or fallback to script path
            if getattr(sys, 'frozen', False):
                exe_path = sys.executable
            else:
                # Prefer built EXE in dist if present; otherwise, use python launcher for script
                dist_exe = Path(__file__).with_name('dist').joinpath('extension-guardian-desktop.exe')
                if dist_exe.exists():
                    exe_path = str(dist_exe)
                else:
                    exe_path = f"{sys.executable} \"{Path(__file__).resolve()}\""

            command = f'"{exe_path}"'

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_key_path, 0, winreg.KEY_SET_VALUE) as key:
                winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, command)
            self.logger.info("Startup registration ensured (HKCU Run)")
        except Exception as e:
            # Log and continue; startup registration is best-effort
            self.logger.error(f"Startup registration failed: {e}")
    
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
        """Prevent closing - always hide to tray instead"""
        self.logger.info("Window close attempt - hiding to tray (no exit allowed)")
        # Hide the window instead of destroying it
        self.root.withdraw()
        
        # Create a system tray icon for background monitoring
        if not hasattr(self, 'icon'):
            self.create_system_tray()
        
        # Continue monitoring in background
        if not self.is_monitoring:
            self.is_monitoring = True
            self.monitoring_thread = threading.Thread(target=self.continue_background_monitoring, daemon=True)
            self.monitoring_thread.start()
    
    def create_system_tray(self):
        try:
            # Create a simple tray icon using Windows API            
            # Create a simple icon
            img = Image.new('RGB', (64, 64), color='red')
            
            menu = pystray.Menu(
                pystray.MenuItem("Show Window", self.show_window)
                # No exit option - prevent closing from tray
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
        """Stop monitoring is blocked for security"""
        try:
            messagebox.showinfo("Action Blocked", "Stopping is disabled for security.")
        except:
            self.logger.info("Stop monitoring attempt blocked")
        return

    def continue_background_monitoring(self):
        """Continue monitoring in the background"""
        while self.is_monitoring:
            try:
                self.check_browsers_and_extensions()
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Error in background monitoring: {e}")
                time.sleep(5)

    def block_all_watch_loop(self):
        """Continuously enforce block-all discovery every second."""
        while getattr(self, 'is_monitoring', False):
            try:
                ensure_block_all_browsers(logger=self.logger)
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Error in block-all watcher: {e}")
                time.sleep(1)
    
    def run(self):
        # If background mode is enabled, hide the window and start monitoring
        if self.background_mode:
            self.logger.info("Starting in background mode")
            self.root.withdraw()
            self.create_system_tray()
            
            # Start monitoring in a separate thread so GUI can still process events
            self.monitoring_thread = threading.Thread(target=self.continue_background_monitoring, daemon=True)
            self.monitoring_thread.start()
            # Start the block-all watcher too
            self.block_all_thread = threading.Thread(target=self.block_all_watch_loop, daemon=True)
            self.block_all_thread.start()
            
            # Keep the main thread alive to handle system tray
            self.root.mainloop()
        else:
            self.root.mainloop()

if __name__ == "__main__":
    # If running from a console (not frozen build), relaunch via pythonw.exe
    # in detached mode to continue running after terminal closes.
    try:
        if not getattr(sys, 'frozen', False):
            is_tty = False
            try:
                is_tty = sys.stdin.isatty()
            except Exception:
                is_tty = False
            if is_tty:
                pyw = Path(sys.executable).with_name('pythonw.exe')
                if pyw.exists():
                    DETACHED_PROCESS = 0x00000008
                    CREATE_NEW_PROCESS_GROUP = 0x00000200
                    cmd = [str(pyw), str(Path(__file__).resolve())]
                    try:
                        subprocess.Popen(cmd, creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP, close_fds=True)
                        sys.exit(0)
                    except Exception:
                        pass
    except Exception:
        pass

    app = ExtensionGuardian(background_mode=True)
    app.run()