import os
import sys
import time
import subprocess
import logging
import winreg
import psutil
from pathlib import Path

# Setup logging
log_dir = Path.home() / "ExtensionGuardian" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "guardian_watchdog.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ExtensionGuardianWatchdog")

def is_service_running():
    """Check if the Extension Guardian service is running"""
    try:
        # Check if the service is running using sc command
        result = subprocess.run(
            ["sc", "query", "ExtensionGuardianService"],
            capture_output=True,
            text=True
        )
        
        return "RUNNING" in result.stdout
    except Exception as e:
        logger.error(f"Error checking service status: {e}")
        return False

def is_guardian_running():
    """Check if any Extension Guardian processes are running"""
    try:
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if 'extension-guardian' in proc.info['name'].lower():
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        return False
    except Exception as e:
        logger.error(f"Error checking guardian processes: {e}")
        return False

def start_service():
    """Start the Extension Guardian service"""
    try:
        # Try to start the service using sc command
        subprocess.run(
            ["sc", "start", "ExtensionGuardianService"],
            capture_output=True,
            text=True
        )
        logger.info("Service start requested")
        return True
    except Exception as e:
        logger.error(f"Error starting service: {e}")
        return False

def start_guardian():
    """Start the Extension Guardian desktop app"""
    try:
        # Get the install path from registry
        install_path = None
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\ExtensionGuardian") as key:
                install_path = winreg.QueryValueEx(key, "InstallPath")[0]
        except (FileNotFoundError, PermissionError):
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\ExtensionGuardian") as key:
                    install_path = winreg.QueryValueEx(key, "InstallPath")[0]
            except (FileNotFoundError, PermissionError):
                pass
        
        # If install path not found in registry, use default
        if not install_path:
            install_path = os.path.join(os.environ['PROGRAMFILES'], "ExtensionGuardian")
        
        # Path to the guardian executable
        guardian_path = os.path.join(install_path, "extension-guardian-desktop.exe")
        
        # Check if the executable exists
        if not os.path.exists(guardian_path):
            logger.error(f"Guardian executable not found: {guardian_path}")
            return False
        
        # Start the guardian process
        subprocess.Popen(
            [guardian_path, "--background"],
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        
        logger.info("Guardian process started")
        return True
    except Exception as e:
        logger.error(f"Error starting guardian process: {e}")
        return False

def check_and_enforce_protection():
    """Check and enforce registry protection"""
    try:
        # Get the install path
        install_path = None
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\ExtensionGuardian") as key:
                install_path = winreg.QueryValueEx(key, "InstallPath")[0]
        except (FileNotFoundError, PermissionError):
            try:
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\ExtensionGuardian") as key:
                    install_path = winreg.QueryValueEx(key, "InstallPath")[0]
            except (FileNotFoundError, PermissionError):
                pass
        
        # If install path not found in registry, use default
        if not install_path:
            install_path = os.path.join(os.environ['PROGRAMFILES'], "ExtensionGuardian")
        
        # Check startup registry entry
        try:
            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ) as key:
                try:
                    value = winreg.QueryValueEx(key, "ExtensionGuardian")[0]
                    if not value:
                        # Re-add to startup
                        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as write_key:
                            winreg.SetValueEx(write_key, "ExtensionGuardian", 0, winreg.REG_SZ, 
                                           f'"{os.path.join(install_path, "extension-guardian-desktop.exe")}" --background')
                        logger.info("Re-added to startup registry")
                except FileNotFoundError:
                    # Add to startup
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as write_key:
                        winreg.SetValueEx(write_key, "ExtensionGuardian", 0, winreg.REG_SZ, 
                                       f'"{os.path.join(install_path, "extension-guardian-desktop.exe")}" --background')
                    logger.info("Added to startup registry")
        except Exception as e:
            logger.error(f"Error checking startup registry: {e}")
    except Exception as e:
        logger.error(f"Error enforcing protection: {e}")

def main():
    """Main watchdog function"""
    logger.info("Extension Guardian Watchdog started")
    
    while True:
        try:
            # Check if the service is running
            service_running = is_service_running()
            guardian_running = is_guardian_running()
            
            if not service_running:
                logger.warning("Service not running, attempting to start")
                start_service()
            
            if not guardian_running:
                logger.warning("Guardian process not running, attempting to start")
                start_guardian()
            
            # Check and enforce protection
            check_and_enforce_protection()
            
            # Sleep for a while
            time.sleep(60)
        except Exception as e:
            logger.error(f"Error in watchdog: {e}")
            time.sleep(300)  # Longer sleep on error

if __name__ == "__main__":
    main()
