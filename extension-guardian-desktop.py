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
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Extension Guardian")
        self.root.geometry("800x600")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
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
        self.logger.info("Extension Guardian started")
    
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
    
    def check_extension_status(self, browser_name):
        browser_key = browser_name.lower().replace('.exe', '')

        if 'edge' in browser_key:
            return self.check_edge_extension_status()
        elif 'brave' in browser_key:
            return self.check_brave_extension_status()
    
    def check_edge_extension_status(self):
        try:
            # Edge extension registry path
            reg_path = r"SOFTWARE\Microsoft\Edge\User Data\Default\Extensions"
            
            # Try to find extension in registry
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path) as key:
                # Check if our extension ID exists
                try:
                    ext_key = winreg.OpenKey(key, self.config['extension_id'])
                    # Check if extension is enabled (has a version subkey)
                    try:
                        winreg.QueryValue(ext_key, "0")
                        self.logger.info(f"Extension {self.config['extension_id']} found and enabled in Edge")
                        return True
                    except FileNotFoundError:
                        self.logger.warning(f"Extension {self.config['extension_id']} found but disabled in Edge")
                        return False
                except FileNotFoundError:
                    self.logger.warning(f"Extension {self.config['extension_id']} NOT found in Edge registry")
                    return False
                
        except Exception as e:
            self.logger.error(f"Error checking Edge extension: {e}")
            return True
    
    def check_brave_extension_status(self):
        reg_path = r"SOFTWARE\BraveSoftware\Brave-Browser\User Data\Default\Extensions"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path) as key:
            # Check if our extension ID exists
            try:
                ext_key = winreg.OpenKey(key, self.config['extension_id'])
                # Check if extension is enabled (has a version subkey)
                try:
                    winreg.QueryValue(ext_key, "0")
                    self.logger.info(f"Extension {self.config['extension_id']} found and enabled in Brave")
                    return True
                except FileNotFoundError:
                    self.logger.warning(f"Extension {self.config['extension_id']} found but disabled in Brave")
                    return False
            except FileNotFoundError:
                self.logger.warning(f"Extension {self.config['extension_id']} NOT found in Brave registry")
                return False
    
    def handle_extension_disabled(self):        
        self.show_extension_disabled_warning()
        threading.Thread(target=self.countdown_and_close_browsers, daemon=True).start()
    
    def show_extension_disabled_warning(self):
        def show_warning():
            warning_msg = """oops"""
            try:
                messagebox.showwarning("Extension Disabled", warning_msg)
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
                self.browser_tree.insert('', 'end', 
                                       text=browser['name'],
                                       values=('Running', browser['pid'], 'Unknown'))
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
            result = messagebox.askyesno("Protection Active")
            if not result:
                return
        
        self.save_config()
        self.root.destroy()
        self.continue_background_monitoring()
    
    def continue_background_monitoring(self):
        while self.is_monitoring:
            self.check_browsers_and_extensions()
            time.sleep(self.config['check_interval_seconds'])
    
    def run(self):
        self.root.mainloop()

app = ExtensionGuardian()
app.run()