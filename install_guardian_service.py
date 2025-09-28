import os
import sys
import subprocess
import winreg
import ctypes
import logging
import shutil
from pathlib import Path

# Setup logging
log_dir = Path.home() / "ExtensionGuardian" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "guardian_install.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ExtensionGuardianInstaller")

def is_admin():
    """Check if the script is running with admin privileges"""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    """Re-run the script with admin privileges"""
    if not is_admin():
        logger.info("Requesting admin privileges...")
        ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        sys.exit(0)

def install_service():
    """Install the Extension Guardian service"""
    try:
        logger.info("Installing Extension Guardian service...")
        
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Path to the service script
        service_script = os.path.join(current_dir, "extension_guardian_service.py")
        
        # Check if the service script exists
        if not os.path.exists(service_script):
            logger.error(f"Service script not found: {service_script}")
            return False
        
        # Install the service
        result = subprocess.run(
            [sys.executable, service_script, "install"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"Error installing service: {result.stderr}")
            return False
        
        logger.info("Service installed successfully")
        
        # Start the service
        result = subprocess.run(
            [sys.executable, service_script, "start"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"Error starting service: {result.stderr}")
            return False
        
        logger.info("Service started successfully")
        return True
    except Exception as e:
        logger.error(f"Error installing service: {e}")
        return False

def setup_registry_protection():
    """Set up registry protection to prevent uninstallation"""
    try:
        logger.info("Setting up registry protection...")
        
        # Create a registry key for the service
        key_path = r"SOFTWARE\ExtensionGuardian"
        try:
            winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path)
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_WRITE) as key:
                winreg.SetValueEx(key, "InstallPath", 0, winreg.REG_SZ, os.path.dirname(os.path.abspath(__file__)))
                winreg.SetValueEx(key, "Version", 0, winreg.REG_SZ, "1.0.0")
                winreg.SetValueEx(key, "Protected", 0, winreg.REG_DWORD, 1)
            logger.info("Registry protection set up in HKLM")
        except PermissionError:
            logger.warning("Could not create HKLM registry key - trying HKCU")
            # Try current user if admin rights are not available
            winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
                winreg.SetValueEx(key, "InstallPath", 0, winreg.REG_SZ, os.path.dirname(os.path.abspath(__file__)))
                winreg.SetValueEx(key, "Version", 0, winreg.REG_SZ, "1.0.0")
                winreg.SetValueEx(key, "Protected", 0, winreg.REG_DWORD, 1)
            logger.info("Registry protection set up in HKCU")
        
        # Add to startup
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
            # Add main app to startup
            winreg.SetValueEx(key, "ExtensionGuardian", 0, winreg.REG_SZ, 
                             f'"{os.path.join(os.path.dirname(os.path.abspath(__file__)), "extension-guardian-desktop.exe")}" --background')
            
            # Add watchdog to startup
            winreg.SetValueEx(key, "ExtensionGuardianWatchdog", 0, winreg.REG_SZ, 
                             f'"{os.path.join(os.path.dirname(os.path.abspath(__file__)), "guardian_watchdog.exe")}"')
        logger.info("Added to startup registry")
        
        return True
    except Exception as e:
        logger.error(f"Error setting up registry protection: {e}")
        return False

def copy_to_protected_location():
    """Copy the application to a protected location"""
    try:
        logger.info("Copying application to protected location...")
        
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Define the protected location
        protected_dir = os.path.join(os.environ['PROGRAMFILES'], "ExtensionGuardian")
        
        # Create the directory if it doesn't exist
        os.makedirs(protected_dir, exist_ok=True)
        
        # Copy all files to the protected location
        for file in os.listdir(current_dir):
            source = os.path.join(current_dir, file)
            destination = os.path.join(protected_dir, file)
            
            if os.path.isfile(source):
                shutil.copy2(source, destination)
            elif os.path.isdir(source):
                shutil.copytree(source, destination, dirs_exist_ok=True)
        
        logger.info(f"Application copied to {protected_dir}")
        return True
    except Exception as e:
        logger.error(f"Error copying to protected location: {e}")
        return False

def create_uninstall_protection():
    """Create protection against uninstallation"""
    try:
        logger.info("Setting up uninstall protection...")
        
        # Create a key in the uninstall section with a password
        key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ExtensionGuardian"
        winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path, 0, winreg.KEY_WRITE) as key:
            winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, "Extension Guardian")
            winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, 
                             f'"{os.path.join(os.path.dirname(os.path.abspath(__file__)), "uninstall_guardian.exe")}" --password')
            winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, 
                             os.path.join(os.path.dirname(os.path.abspath(__file__)), "extension-guardian-desktop.exe"))
            winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
        
        logger.info("Uninstall protection set up")
        return True
    except Exception as e:
        logger.error(f"Error setting up uninstall protection: {e}")
        return False

def main():
    """Main installation function"""
    logger.info("Starting Extension Guardian installation...")
    
    # Check if running as admin
    if not is_admin():
        run_as_admin()
        return
    
    # Copy to protected location
    if copy_to_protected_location():
        # Change directory to the protected location
        os.chdir(os.path.join(os.environ['PROGRAMFILES'], "ExtensionGuardian"))
        
        # Set up registry protection
        setup_registry_protection()
        
        # Create uninstall protection
        create_uninstall_protection()
        
        # Install the service
        if install_service():
            logger.info("Extension Guardian installed successfully!")
            print("Extension Guardian has been installed and is now running in the background.")
        else:
            logger.error("Failed to install Extension Guardian service")
            print("Failed to install Extension Guardian service. Check the logs for details.")
    else:
        logger.error("Failed to copy to protected location")
        print("Failed to install Extension Guardian. Check the logs for details.")

if __name__ == "__main__":
    main()
