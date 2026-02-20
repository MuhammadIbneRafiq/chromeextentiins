import os
import json
import pystray
from PIL import Image
import tkinter as tk
from tkinter import ttk, messagebox
import psutil
import time
import threading
import winreg
from datetime import datetime
from pathlib import Path
import logging
import sys
import subprocess
import re

def _get_logger(maybe_logger=None):
    if maybe_logger is not None:
        return maybe_logger
    return logging.getLogger('extension_guardian')

def _run_hidden(cmd, **kwargs):
    creationflags = kwargs.pop('creationflags', 0)
    creationflags |= 0x08000000
    kwargs['creationflags'] = creationflags
    if os.name == 'nt':
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 0
        kwargs['startupinfo'] = si
    return subprocess.run(cmd, **kwargs)

def _is_incognito_allowed(ext_settings_obj):
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
    return False

def extract_exe_from_command(command):
    m = re.match(r'^\s*"?([^"\s]+?\.exe)"?', command.strip(), re.IGNORECASE)
    return m.group(1) if m else None

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
        (['CentBrowser', 'Application'], 'chrome.exe'),
        (['Chromium', 'Application'], 'chrome.exe'),
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
                VENDOR_OR_PRODUCT_KEYWORDS = ['chrome', 'chromium', 'edge', 'comet']
                if lower in ['chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe'] or any(k in lower for k in VENDOR_OR_PRODUCT_KEYWORDS):
                    full = os.path.join(dirpath, fname)
                    candidates.add(os.path.normpath(full))

    for root in roots:
        shallow_walk(root, max_depth=3)

    return list(candidates)

def block_exe_firewall(exe_path, logger=None):
    logger = _get_logger(logger)

    rule_name = f"ExtensionGuardian_Block_{os.path.basename(exe_path)}"
    _run_hidden(["netsh", "advfirewall", "firewall", "delete", "rule", f"name={rule_name}"], capture_output=True)
    _run_hidden(["netsh", "advfirewall", "firewall", "add", "rule", f"name={rule_name}", "dir=out", "action=block", f"program={exe_path}", "enable=yes"], check=False, capture_output=True)
    _run_hidden(["netsh", "advfirewall", "firewall", "add", "rule", f"name={rule_name}", "dir=in", "action=block", f"program={exe_path}", "enable=yes"], check=False, capture_output=True)
    logger.info(f"Firewall block ensured for {exe_path}")
    return True

def kill_processes_for_exe(exe_path, logger=None):
    logger = _get_logger(logger)
    killed = 0
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
                    proc.wait(timeout=0.5)
                except psutil.TimeoutExpired:
                    proc.kill()
                killed += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    if killed:
        logger.info(f"Terminated {killed} process(es) for {exe_path}")
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
        killed_count = kill_processes_for_exe(exe, logger=logger)
        results['killed'][exe] = killed_count
    return results

def run_browser_blocker_cli(watch=False, interval=10):
    logger = _get_logger(None)
    if watch:
        logger.info(f"Starting browser blocker in watch mode (interval={interval}s)")
        while True:
            res = ensure_block_all_browsers(logger=logger)
            print(json.dumps(res, indent=2))
            time.sleep(max(1, int(interval)))
    else:
        res = ensure_block_all_browsers(logger=logger)
        print(json.dumps(res, indent=2))
        return res

class ExtensionGuardian:
    FORCED_EXTENSION_ID = "dhmlefmojipiigjhjifnohilekhmbbag"
    
    def __init__(self, background_mode=True):
        self.root = tk.Tk()
        self.root.title(f"Extension Guardian")
        self.root.geometry("800x600")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        self.background_mode = True
        
        self.config = {
            'extension_id': self.FORCED_EXTENSION_ID,
            'monitoring_enabled': True,
            'browser_close_enabled': True,
            'check_interval_seconds': 1,
            'warning_countdown_seconds': 15,
            'browsers': ['chrome.exe', 'msedge.exe', 'brave.exe', 'comet.exe']
        }
        
        self.is_monitoring = False
        self.extension_status = {}
        self.browser_processes = []
        self.monitoring_thread = None
        self.shutdown_in_progress = False
        self.last_shutdown_time = None
        self.consecutive_disabled_counts = {}  # Track consecutive "disabled" detections per browser
        self.CONSECUTIVE_CHECKS_REQUIRED = 3  # Require 3 consecutive checks before shutdown
        self.extension_disabled_warning_shown = False  # debounce warning popup per shutdown cycle
        
        self.recent_log_handler = None
        self.last_snapshot_line = 0
        self.snapshot_anchor_line = 0
        
        self.setup_logging()
        self.setup_gui()
        self.load_config()
        # Enforce forced ID after loading any saved config
        self.config['extension_id'] = self.FORCED_EXTENSION_ID

        # Ensure the desktop app starts in background at user logon
        self.ensure_startup_registration()

        if self.config['monitoring_enabled']:
            self.start_monitoring()
    
    def setup_logging(self):
        log_dir = Path.home() / "ExtensionGuardian" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"guardian_{datetime.now().strftime('%Y%m%d')}.log"
        self.log_dir = log_dir
        self.current_log_path = log_file
        
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(),
            ]
        )
        for handler in logging.getLogger().handlers:
            handler.setLevel(logging.DEBUG)
        self.logger = logging.getLogger(__name__)
    
    def setup_gui(self):
        # Minimal single-view interface
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill='both', expand=True, padx=20, pady=20)
        
        title_label = ttk.Label(main_frame, text="Extension Guardian", font=('Arial', 16, 'bold'))
        title_label.pack(pady=10)
        
        self.status_var = tk.StringVar(value="Monitoring...")
        status_frame = ttk.LabelFrame(main_frame, text="Status")
        status_frame.pack(fill='x', pady=10)
        
        self.status_label = ttk.Label(status_frame, textvariable=self.status_var, font=('Arial', 12))
        self.status_label.pack(pady=10)
        
        # Simple log viewer
        log_frame = ttk.LabelFrame(main_frame, text="Activity Log")
        log_frame.pack(fill='both', expand=True, pady=10)
        
        self.log_text = tk.Text(log_frame, height=10, wrap='word', state='disabled')
        self.log_text.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Extension status checker
        check_frame = ttk.LabelFrame(main_frame, text="Quick Check")
        check_frame.pack(fill='x', pady=10)
        
        ttk.Button(check_frame, text="Check Extension Status in All Browsers", 
                  command=self.quick_check_all_browsers).pack(pady=5)
        
        self.check_result_var = tk.StringVar(value="")
        self.check_result_label = ttk.Label(check_frame, textvariable=self.check_result_var, 
                                           font=('Arial', 10), wraplength=700)
        self.check_result_label.pack(pady=5)
        
        # Action buttons
        ttk.Button(main_frame, text="Save Log Snapshot Now", command=self.manual_save_log_snapshot).pack(pady=5)
        ttk.Button(main_frame, text="View Logs Folder", command=self.view_logs).pack(pady=5)
    
    def start_monitoring(self):
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.status_var.set("Monitoring Active")
        
        self.monitoring_thread = threading.Thread(target=self.monitoring_loop, daemon=True)
        self.monitoring_thread.start()
            
    def monitoring_loop(self):
        while self.is_monitoring:
            try:
                self.check_browsers_and_extensions()
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)
    
    def check_browsers_and_extensions(self):
        if self.shutdown_in_progress:
            self.logger.debug("Shutdown in progress; skipping check cycle")
            return

        browsers_found = []
        browsers_with_disabled_extension = []  # Track which browsers have disabled extension
        extension_disabled = False
        any_check_performed = False
        
        allowed_set = set(b.lower() for b in self.config['browsers'])
        
        if self.shutdown_in_progress is True:        
            self.logger.debug(f"[CHECK CYCLE] Starting extension check (shutdown_in_progress={self.shutdown_in_progress})")
        
        for proc in psutil.process_iter(['pid', 'name', 'exe']):
            try:
                name_lower = (proc.info.get('name') or '').lower()
                if not name_lower:
                    continue
                # self.logger.debug(f"Process seen: name={proc.info['name']} pid={proc.info['pid']} exe={proc.info['exe']}")
                if name_lower in allowed_set:
                    browsers_found.append({
                        'name': proc.info['name'],
                        'pid': proc.info['pid'],
                        'exe': proc.info['exe']
                    })
                    
                    extension_enabled = self.check_extension_status(proc.info['name'])
                    any_check_performed = True
                    browser_key = proc.info['name'].lower()
                    
                    if not extension_enabled:
                        # Increment consecutive disabled count
                        self.consecutive_disabled_counts[browser_key] = self.consecutive_disabled_counts.get(browser_key, 0) + 1
                        count = self.consecutive_disabled_counts[browser_key]
                        
                        if count >= self.CONSECUTIVE_CHECKS_REQUIRED:
                            extension_disabled = True
                            browsers_with_disabled_extension.append(proc.info['name'])
                            self.logger.warning(f"EXTENSION DISABLED in {proc.info['name']} (PID: {proc.info['pid']}) - confirmed after {count} consecutive checks")
                        else:
                            self.logger.debug(f"[CONSECUTIVE] {proc.info['name']} disabled check {count}/{self.CONSECUTIVE_CHECKS_REQUIRED} - waiting for confirmation")
                    else:
                        # Reset counter when extension is found enabled
                        if browser_key in self.consecutive_disabled_counts and self.consecutive_disabled_counts[browser_key] > 0:
                            self.logger.debug(f"[CONSECUTIVE] {proc.info['name']} now enabled - resetting counter (was {self.consecutive_disabled_counts[browser_key]})")
                        self.consecutive_disabled_counts[browser_key] = 0
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        # Evaluate direct disabled indicators only as a fallback when no browser checks succeeded
        # This avoids stale marker files causing false positives.
        if not any_check_performed:
            direct_disabled = self.check_direct_disabled_indicators()
            if direct_disabled:
                extension_disabled = True
                self.logger.warning("DIRECT DISABLED INDICATORS FOUND (no browser checks) - treating as disabled")

        # Final decision: disabled if extension_disabled is True
        if extension_disabled == True:
            self.logger.debug(f"[CHECK CYCLE] Complete - Browsers found: {len(browsers_found)}, "
                            f"Checks performed: {any_check_performed}, "
                            f"Extension disabled: {extension_disabled}")

        # self.update_browser_status(browsers_found)
        
        if extension_disabled and self.config['browser_close_enabled']:
            if self.recent_log_handler:
                self.snapshot_anchor_line = self.recent_log_handler.get_latest_line_index() + 1
            self.logger.warning("EXTENSION DISABLED DETECTED - TRIGGERING BROWSER SHUTDOWN")
            if self.last_shutdown_time:
                elapsed = (datetime.now() - self.last_shutdown_time).total_seconds()
                if elapsed < 60:
                    self.logger.debug(f"Recent shutdown {elapsed:.1f}s ago, skipping")
                    return
            self.save_log_snapshot("shutdown")
            self.shutdown_in_progress = True
            if not self.extension_disabled_warning_shown:
                self.extension_disabled_warning_shown = True
                self.logger.warning("Starting shutdown sequence for disabled extension (no popup)")
            else:
                self.logger.warning("Shutdown sequence already triggered; skipping duplicate notification")
            threading.Thread(target=lambda: self.countdown_and_close_browsers(browsers_with_disabled_extension), daemon=True).start()
        
    def check_direct_disabled_indicators(self):
        return False
    
    def show_extension_disabled_warning(self, affected_browsers):
        # Popup disabled per user request; keep function for compatibility
        return
        
    def countdown_and_close_browsers(self, affected_browsers):
        countdown = self.config['warning_countdown_seconds']
        browser_list = ', '.join(set(affected_browsers))
        try:
            for i in range(countdown, 0, -1):
                self.status_var.set(f"Closing {browser_list} in {i} seconds...")
                self.logger.info(f"Closing {browser_list} in {i} seconds...")
                time.sleep(1)
            
            self.close_specific_browsers(affected_browsers)
            self.last_shutdown_time = datetime.now()
            
            self.status_var.set(f"Browsers closed - Extension disabled in {browser_list}")
            self.logger.info(f"Browsers closed - Extension disabled in {browser_list}")
        finally:
            # Reset the flag so future detections can trigger shutdown
            self.shutdown_in_progress = False
            self.extension_disabled_warning_shown = False
            self.logger.info("Shutdown sequence completed, monitoring will continue")
    
    def close_all_browsers(self):
        closed_total = 0
        allowed_set = set(b.lower() for b in self.config['browsers'])
        seen_images = set()

        for proc in psutil.process_iter(['pid', 'name']):
            name_lower = (proc.info['name'] or '').lower()
            if name_lower and name_lower in allowed_set and name_lower not in seen_images:
                killed = kill_processes_for_exe(proc.info['name'], logger=self.logger)
                closed_total += killed
                seen_images.add(name_lower)

        self.logger.info(f"Closed {closed_total} browser process(es)")
    
    def close_specific_browsers(self, browser_names):
        """Close only the specific browsers that have the extension disabled."""
        closed_total = 0
        affected_set = set(b.lower() for b in browser_names)
        seen_images = set()
        
        self.logger.info(f"Closing only affected browsers: {', '.join(browser_names)}")

        for proc in psutil.process_iter(['pid', 'name']):
            name_lower = (proc.info['name'] or '').lower()
            if name_lower and name_lower in affected_set and name_lower not in seen_images:
                killed = kill_processes_for_exe(proc.info['name'], logger=self.logger)
                closed_total += killed
                seen_images.add(name_lower)

        self.logger.info(f"Closed {closed_total} process(es) for affected browsers only")

    def update_browser_status(self, browsers):
        for browser in browsers:
            self.logger.info(f"Browser running: {browser['name']} (PID: {browser['pid']})")
    
    def quick_check_all_browsers(self):
        """Check extension status in all 4 browsers and display results"""
        results = []
        browsers = [
            ('Chrome', 'chrome.exe'),
            ('Edge', 'msedge.exe'),
            ('Brave', 'brave.exe'),
            ('Comet', 'comet.exe')
        ]
        
        for browser_name, browser_exe in browsers:
            status = self.check_extension_status(browser_exe)
            status_text = "✓ ENABLED" if status else "✗ DISABLED"
            results.append(f"{browser_name}: {status_text}")
        
        result_msg = " | ".join(results)
        self.check_result_var.set(result_msg)
        self.logger.info(f"Quick check results: {result_msg}")
    
    def view_logs(self):
        log_dir = Path.home() / "ExtensionGuardian" / "logs"
        os.startfile(str(log_dir))

    def manual_save_log_snapshot(self):
        snapshot_path = self.save_log_snapshot("manual")
        if snapshot_path:
            messagebox.showinfo("Logs Saved", f"Snapshot saved to:\n{snapshot_path}")
        else:
            messagebox.showwarning("Logs Not Saved", "No active log file to snapshot.")
    
    def save_log_snapshot(self, reason="manual"):
        """Save recent log lines from memory buffer to a snapshot file."""
        if not self.recent_log_handler:
            self.logger.warning("No log buffer available for snapshot.")
            return None
        
        snapshots_dir = self.log_dir / "snapshots"
        snapshots_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_path = snapshots_dir / f"log_snapshot_{reason}_{timestamp}.log"
        
        if reason == "shutdown":
            log_lines = self.recent_log_handler.get_lines_since(self.snapshot_anchor_line)
            if not log_lines:
                self.logger.warning("No log lines found since anchor point for shutdown snapshot.")
                return None
        else:
            log_lines = self.recent_log_handler.get_all_lines()
            if not log_lines:
                self.logger.warning("No log lines available in buffer for manual snapshot.")
                return None
        
        try:
            with open(snapshot_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(log_lines))
            self.logger.info(f"Log snapshot saved: {snapshot_path} ({len(log_lines)} lines)")
            return snapshot_path
        except Exception as e:
            self.logger.error(f"Failed to save log snapshot: {e}")
            return None
     
    def load_config(self):
        config_file = Path.home() / "ExtensionGuardian" / "config.json"
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
        if int(self.config.get('warning_countdown_seconds', 15)) < 15:
            self.config['warning_countdown_seconds'] = 15
        # Always enforce the forced extension ID regardless of saved config
        self.config['extension_id'] = self.FORCED_EXTENSION_ID
        
    def ensure_startup_registration(self):
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

        command = f'"{exe_path}" --background'

        if hasattr(winreg, "KEY_WOW64_64KEY"):
            target_views = [winreg.KEY_WOW64_64KEY, winreg.KEY_WOW64_32KEY]
        else:
            target_views = [0]

        for view in target_views:
            access = winreg.KEY_SET_VALUE | view
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, run_key_path, 0, access) as key:
                    winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, command)
                self.logger.info(f"Startup registration ensured (HKCU Run, view={view or 'default'})")
            except FileNotFoundError:
                with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, run_key_path, 0, access) as key:
                    winreg.SetValueEx(key, value_name, 0, winreg.REG_SZ, command)
                self.logger.info(f"Startup registration created (HKCU Run, view={view or 'default'})")
            except OSError as e:
                self.logger.error(f"Failed to write Run entry (view={view or 'default'}): {e}")
            
    def on_closing(self):
        self.root.withdraw()
        if not hasattr(self, 'icon'):
            self.create_system_tray()
        
        if not self.is_monitoring:
            self.is_monitoring = True
            self.monitoring_thread = threading.Thread(target=self.continue_background_monitoring, daemon=True)
            self.monitoring_thread.start()
    
    def create_system_tray(self):
        img = Image.new('RGB', (64, 64), color='red')
        menu = pystray.Menu(
            pystray.MenuItem("Show Window", self.show_window)
        )
        self.icon = pystray.Icon("Extension Guardian", img, menu=menu)
        threading.Thread(target=self.icon.run, daemon=True).start()
        self.logger.info("System tray icon created successfully")

    def show_window(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def continue_background_monitoring(self):
        while self.is_monitoring:
            self.check_browsers_and_extensions()
            time.sleep(1)

    def check_extension_status(self, browser_name):
        browser_name_lower = browser_name.lower()
        extension_id = self.config['extension_id']

        # Support multiple channels (stable/beta/dev/canary) and any profile folder that has a Preferences file
        def _candidate_paths(paths):
            return [os.path.expandvars(p) for p in paths]

        base_paths = []
        if 'chrome.exe' in browser_name_lower:
            base_paths = _candidate_paths([
                r"%LOCALAPPDATA%\Google\Chrome\User Data",
                r"%LOCALAPPDATA%\Google\Chrome Beta\User Data",
                r"%LOCALAPPDATA%\Google\Chrome SxS\User Data",
            ])
        elif 'msedge.exe' in browser_name_lower:
            base_paths = _candidate_paths([
                r"%LOCALAPPDATA%\Microsoft\Edge\User Data",
                r"%LOCALAPPDATA%\Microsoft\Edge Beta\User Data",
                r"%LOCALAPPDATA%\Microsoft\Edge Dev\User Data",
                r"%LOCALAPPDATA%\Microsoft\Edge SxS\User Data",
            ])
        elif 'brave.exe' in browser_name_lower:
            base_paths = _candidate_paths([
                r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data",
                r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser-Beta\User Data",
                r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser-Dev\User Data",
            ])
        elif 'comet.exe' in browser_name_lower:
            base_paths = _candidate_paths([
                r"%LOCALAPPDATA%\Perplexity\Comet\User Data",
                r"%APPDATA%\Perplexity\Comet\User Data",
            ])
        else:
            self.logger.warning(f"Unknown browser: {browser_name}")
            return False

        for base_path in base_paths:
            status = self._scan_profiles_for_ext_status(base_path, extension_id, self.logger)
            if status is True:
                return True
            # If explicitly False (found disabled), stop early.
            if status is False:
                return False
        return False
    
    def _scan_profiles_for_ext_status(self, base_user_data_path, extension_id, logger):
        """Return True if extension is enabled (incognito/private allowed) across profiles; False if disabled/blocked."""
        enabled_candidate = False
        found_any = False
        profiles_checked = 0
        profiles_skipped_due_to_errors = 0

        if not os.path.isdir(base_user_data_path):
            logger.debug(f"[SCAN] Base path missing: {base_user_data_path}")
            return None

        for name in os.listdir(base_user_data_path):
            # Handle snapshot-based profiles (Edge/Brave keep snapshots under User Data/Snapshots/<ver>/<profile>)
            if name.lower() == 'snapshots':
                snapshots_root = os.path.join(base_user_data_path, name)
                for ver in os.listdir(snapshots_root):
                    ver_dir = os.path.join(snapshots_root, ver)
                    if not os.path.isdir(ver_dir):
                        continue
                    for prof in os.listdir(ver_dir):
                        profile_dir = os.path.join(ver_dir, prof)
                        if not os.path.isdir(profile_dir):
                            continue
                        prefs_path = os.path.join(profile_dir, 'Preferences')
                        if not os.path.isfile(prefs_path):
                            continue

                        profiles_checked += 1
                        try:
                            with open(prefs_path, 'r', encoding='utf-8') as f:
                                prefs_json = json.load(f)
                            ext_data = prefs_json.get('extensions', {}).get('settings', {}).get(extension_id)
                            if not ext_data:
                                logger.debug(f"[SCAN] Extension {extension_id} not found in snapshot profile '{prof}'")
                                continue

                            found_any = True
                            state_val = ext_data.get('state')
                            incog_val = ext_data.get('incognito')
                            allow_incog = ext_data.get('allow_in_incognito')
                            disable_reasons = ext_data.get('disable_reasons', [])
                            if disable_reasons:
                                logger.info(
                                    f"[SCAN] Snapshot profile '{prof}': state={state_val}, incognito={incog_val}, "
                                    f"allow_in_incognito={allow_incog}, disable_reasons={disable_reasons}"
                                )

                            if state_val == 0:
                                logger.warning(f"[SCAN FALSE] Extension {extension_id} DISABLED (state=0) in snapshot '{prof}'")
                                return False

                            if disable_reasons:
                                logger.warning(
                                    f"[SCAN FALSE] Extension {extension_id} DISABLED (disable_reasons={disable_reasons}) "
                                    f"in snapshot '{prof}'"
                                )
                                return False

                            if not _is_incognito_allowed(ext_data):
                                logger.warning(
                                    f"[SCAN FALSE] Extension {extension_id} not allowed in private/incognito in snapshot '{prof}' "
                                    f"(incognito={incog_val}, allow_in_incognito={allow_incog})"
                                )
                                return False

                            enabled_candidate = True
                        except PermissionError:
                            profiles_skipped_due_to_errors += 1
                            logger.debug(f"[SCAN] Preferences locked by browser for snapshot '{prof}' - skipping this check")
                            continue
                        except Exception as e:
                            profiles_skipped_due_to_errors += 1
                            logger.debug(f"[SCAN] Error reading Preferences for snapshot '{prof}': {e}")
                            continue
                # done with snapshots; move to next top-level entry
                continue

            profile_dir = os.path.join(base_user_data_path, name)
            if not os.path.isdir(profile_dir):
                continue

            prefs_path = os.path.join(profile_dir, 'Preferences')
            if not os.path.isfile(prefs_path):
                continue

            profiles_checked += 1

            try:
                with open(prefs_path, 'r', encoding='utf-8') as f:
                    prefs = json.load(f)
                ext_data = prefs.get('extensions', {}).get('settings', {}).get(extension_id)
                if not ext_data:
                    logger.debug(f"[SCAN] Extension {extension_id} not found in profile '{name}'")
                    continue

                found_any = True
                state_val = ext_data.get('state')
                incog_val = ext_data.get('incognito')
                allow_incog = ext_data.get('allow_in_incognito')
                disable_reasons = ext_data.get('disable_reasons', [])
                if disable_reasons:
                    logger.info(
                        f"[SCAN] Profile '{name}': state={state_val}, incognito={incog_val}, "
                        f"allow_in_incognito={allow_incog}, disable_reasons={disable_reasons}"
                    )

                if state_val == 0:
                    logger.warning(f"[SCAN FALSE] Extension {extension_id} DISABLED (state=0) in profile '{name}'")
                    return False

                if disable_reasons:
                    logger.warning(
                        f"[SCAN FALSE] Extension {extension_id} DISABLED (disable_reasons={disable_reasons}) "
                        f"in profile '{name}'"
                    )
                    return False

                if not _is_incognito_allowed(ext_data):
                    logger.warning(
                        f"[SCAN FALSE] Extension {extension_id} not allowed in private/incognito in profile '{name}' "
                        f"(incognito={incog_val}, allow_in_incognito={allow_incog})"
                    )
                    return False

                enabled_candidate = True
            except PermissionError:
                profiles_skipped_due_to_errors += 1
                logger.debug(f"[SCAN] Preferences locked by browser for profile '{name}' - skipping this check")
                continue
            except Exception as e:
                profiles_skipped_due_to_errors += 1
                logger.debug(f"[SCAN] Error reading Preferences for profile '{name}': {e}")
                continue

        # RACE CONDITION FIX: If all profiles were skipped due to file locks/errors,
        # assume extension is still enabled (don't trigger false positive shutdown)
        if profiles_checked > 0 and profiles_skipped_due_to_errors == profiles_checked:
            logger.debug(f"[SCAN SKIP] All {profiles_checked} profile(s) had file access errors - assuming extension is OK")
            return True

        if not found_any:
            # Only treat as "not found" if we actually checked profiles successfully
            if profiles_skipped_due_to_errors > 0:
                logger.debug(f"[SCAN SKIP] Extension not found but {profiles_skipped_due_to_errors} profile(s) had errors - assuming OK")
                return None
            logger.warning(f"[SCAN FALSE] Extension {extension_id} not present in any profile under {base_user_data_path}")
            return None

        return enabled_candidate
    
    def run(self):
        self.root.withdraw()
        self.create_system_tray()
        
        self.monitoring_thread = threading.Thread(target=self.continue_background_monitoring, daemon=True)
        self.monitoring_thread.start()
        
        self.root.mainloop()

if __name__ == "__main__":
    app = ExtensionGuardian(background_mode=True)
    app.run()