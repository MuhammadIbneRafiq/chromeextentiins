import win32serviceutil
import win32service
import win32event
import servicemanager
import socket
import sys
import os
import time
import subprocess
import logging
import psutil
import winreg
from pathlib import Path
import threading

# Setup logging
log_dir = Path.home() / "ExtensionGuardian" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "guardian_service.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ExtensionGuardianService")

class ExtensionGuardianService(win32serviceutil.ServiceFramework):
    _svc_name_ = "ExtensionGuardianService"
    _svc_display_name_ = "Extension Guardian Service"
    _svc_description_ = "Monitors and protects browser extensions from being disabled"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.is_running = True
        
        # Get the directory where the service is installed
        self.service_path = os.path.dirname(os.path.abspath(__file__))
        logger.info(f"Service path: {self.service_path}")
        
        # Guardian process
        self.guardian_process = None
        self.watchdog_thread = None
        
        # Protection settings
        self.setup_protection()

    def SvcStop(self):
        logger.info("Service stop requested")
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.is_running = False
        
        # Try to gracefully stop the guardian process
        self.stop_guardian_process()

    def SvcDoRun(self):
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                             servicemanager.PYS_SERVICE_STARTED,
                             (self._svc_name_, ''))
        logger.info("Service starting")
        self.main()

    def setup_protection(self):
        """Set up protection mechanisms"""
        try:
            # Create registry keys to prevent uninstallation
            self.protect_registry()
            
            # Add to startup
            self.add_to_startup()
            
            logger.info("Protection mechanisms set up")
        except Exception as e:
            logger.error(f"Error setting up protection: {e}")

    def protect_registry(self):
        """Add registry keys to protect the service"""
        try:
            # Create a registry key for the service
            key_path = r"SOFTWARE\ExtensionGuardian"
            try:
                winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path)
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_WRITE) as key:
                    winreg.SetValueEx(key, "InstallPath", 0, winreg.REG_SZ, self.service_path)
                    winreg.SetValueEx(key, "Version", 0, winreg.REG_SZ, "1.0.0")
                    winreg.SetValueEx(key, "Protected", 0, winreg.REG_DWORD, 1)
                logger.info("Registry protection set up")
            except PermissionError:
                logger.warning("Could not create HKLM registry key - trying HKCU")
                # Try current user if admin rights are not available
                winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
                    winreg.SetValueEx(key, "InstallPath", 0, winreg.REG_SZ, self.service_path)
                    winreg.SetValueEx(key, "Version", 0, winreg.REG_SZ, "1.0.0")
                    winreg.SetValueEx(key, "Protected", 0, winreg.REG_DWORD, 1)
        except Exception as e:
            logger.error(f"Error protecting registry: {e}")

    def add_to_startup(self):
        """Add the service to startup"""
        try:
            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
                winreg.SetValueEx(key, "ExtensionGuardian", 0, winreg.REG_SZ, 
                                 f'"{os.path.join(self.service_path, "extension-guardian-desktop.exe")}" --background')
            logger.info("Added to startup registry")
        except Exception as e:
            logger.error(f"Error adding to startup: {e}")

    def start_guardian_process(self):
        """Start the guardian process"""
        try:
            # Path to the guardian executable or script
            guardian_path = os.path.join(self.service_path, "extension-guardian-desktop.py")
            if not os.path.exists(guardian_path):
                guardian_path = os.path.join(self.service_path, "extension-guardian-desktop.exe")
                
            if not os.path.exists(guardian_path):
                logger.error(f"Guardian executable not found at {guardian_path}")
                return False
                
            logger.info(f"Starting guardian process: {guardian_path}")
            
            # Start the process with background flag
            self.guardian_process = subprocess.Popen(
                [sys.executable, guardian_path, "--background"] if guardian_path.endswith(".py") else [guardian_path, "--background"],
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            logger.info(f"Guardian process started with PID: {self.guardian_process.pid}")
            return True
        except Exception as e:
            logger.error(f"Error starting guardian process: {e}")
            return False

    def stop_guardian_process(self):
        """Stop the guardian process"""
        try:
            if self.guardian_process:
                logger.info(f"Stopping guardian process: {self.guardian_process.pid}")
                self.guardian_process.terminate()
                try:
                    self.guardian_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning("Guardian process did not terminate gracefully, killing")
                    self.guardian_process.kill()
                logger.info("Guardian process stopped")
        except Exception as e:
            logger.error(f"Error stopping guardian process: {e}")

    def watchdog(self):
        """Watchdog thread to ensure the guardian process is running"""
        logger.info("Watchdog thread started")
        while self.is_running:
            try:
                # Check if the guardian process is running
                if self.guardian_process and self.guardian_process.poll() is not None:
                    logger.warning("Guardian process has stopped, restarting")
                    self.start_guardian_process()
                
                # Check for other instances of the guardian
                self.check_and_enforce_guardian()
                
                # Sleep for a while
                time.sleep(10)
            except Exception as e:
                logger.error(f"Error in watchdog: {e}")
                time.sleep(30)  # Longer sleep on error

    def check_and_enforce_guardian(self):
        """Check for extension guardian processes and enforce protection"""
        try:
            # Look for extension-guardian-desktop processes
            guardian_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'exe']):
                try:
                    if 'extension-guardian' in proc.info['name'].lower():
                        guardian_processes.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # If no guardian processes found, start one
            if not guardian_processes and not (self.guardian_process and self.guardian_process.poll() is None):
                logger.warning("No guardian processes found, starting one")
                self.start_guardian_process()
                
        except Exception as e:
            logger.error(f"Error checking guardian processes: {e}")

    def main(self):
        """Main service function"""
        logger.info("Service main function started")
        
        # Start the guardian process
        if self.start_guardian_process():
            # Start watchdog thread
            self.watchdog_thread = threading.Thread(target=self.watchdog)
            self.watchdog_thread.daemon = True
            self.watchdog_thread.start()
            
            # Main loop
            while self.is_running:
                # Check if stop is requested
                if win32event.WaitForSingleObject(self.hWaitStop, 1000) == win32event.WAIT_OBJECT_0:
                    break
                
                # Perform regular service tasks
                self.check_and_enforce_protection()
        
        logger.info("Service main function exiting")

    def check_and_enforce_protection(self):
        """Check and enforce protection mechanisms"""
        try:
            # Re-apply registry protection
            self.protect_registry()
            
            # Check if service is still in startup
            self.add_to_startup()
        except Exception as e:
            logger.error(f"Error enforcing protection: {e}")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(ExtensionGuardianService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(ExtensionGuardianService)
