import os
import sys
import subprocess
import winreg
import ctypes
import logging
import shutil
import getpass
import hashlib
from pathlib import Path

# Setup logging
log_dir = Path.home() / "ExtensionGuardian" / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / "guardian_uninstall.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("ExtensionGuardianUninstaller")

# Password hash (change this to your desired password hash)
# Default password: "guardian"
PASSWORD_HASH = "5f4dcc3b5aa765d61d8327deb882cf99"  # MD5 hash of "password"

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

def verify_password():
    """Verify the uninstall password"""
    if "--force" in sys.argv:
        logger.info("Force uninstall requested")
        return True
        
    print("Extension Guardian Uninstaller")
    print("------------------------------")
    print("This will completely remove Extension Guardian from your system.")
    print("You need to provide the uninstall password to continue.")
    
    password = getpass.getpass("Enter uninstall password: ")
    password_hash = hashlib.md5(password.encode()).hexdigest()
    
    if password_hash == PASSWORD_HASH:
        logger.info("Password verified")
        return True
    else:
        logger.warning("Invalid password")
        print("Invalid password. Uninstallation aborted.")
        return False

def stop_service():
    """Stop the Extension Guardian service"""
    try:
        logger.info("Stopping Extension Guardian service...")
        
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Path to the service script
        service_script = os.path.join(current_dir, "extension_guardian_service.py")
        
        # Check if the service script exists
        if not os.path.exists(service_script):
            logger.warning(f"Service script not found: {service_script}")
            # Try to stop the service using sc command
            subprocess.run(
                ["sc", "stop", "ExtensionGuardianService"],
                capture_output=True,
                text=True
            )
        else:
            # Stop the service
            result = subprocess.run(
                [sys.executable, service_script, "stop"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Error stopping service: {result.stderr}")
                return False
        
        logger.info("Service stopped successfully")
        return True
    except Exception as e:
        logger.error(f"Error stopping service: {e}")
        return False

def uninstall_service():
    """Uninstall the Extension Guardian service"""
    try:
        logger.info("Uninstalling Extension Guardian service...")
        
        # Get the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Path to the service script
        service_script = os.path.join(current_dir, "extension_guardian_service.py")
        
        # Check if the service script exists
        if not os.path.exists(service_script):
            logger.warning(f"Service script not found: {service_script}")
            # Try to remove the service using sc command
            subprocess.run(
                ["sc", "delete", "ExtensionGuardianService"],
                capture_output=True,
                text=True
            )
        else:
            # Uninstall the service
            result = subprocess.run(
                [sys.executable, service_script, "remove"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Error uninstalling service: {result.stderr}")
                return False
        
        logger.info("Service uninstalled successfully")
        return True
    except Exception as e:
        logger.error(f"Error uninstalling service: {e}")
        return False

def remove_registry_entries():
    """Remove registry entries created by Extension Guardian"""
    try:
        logger.info("Removing registry entries...")
        
        # Remove the ExtensionGuardian key
        try:
            winreg.DeleteKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\ExtensionGuardian")
            logger.info("Removed HKLM ExtensionGuardian key")
        except FileNotFoundError:
            logger.info("HKLM ExtensionGuardian key not found")
        except PermissionError:
            logger.warning("Could not remove HKLM ExtensionGuardian key - insufficient permissions")
        
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, r"SOFTWARE\ExtensionGuardian")
            logger.info("Removed HKCU ExtensionGuardian key")
        except FileNotFoundError:
            logger.info("HKCU ExtensionGuardian key not found")
        
        # Remove from startup
        try:
            key_path = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_WRITE) as key:
                try:
                    winreg.DeleteValue(key, "ExtensionGuardian")
                    logger.info("Removed from startup registry")
                except FileNotFoundError:
                    logger.info("Startup registry entry not found")
        except Exception as e:
            logger.warning(f"Error removing startup registry entry: {e}")
        
        # Remove uninstall key
        try:
            winreg.DeleteKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ExtensionGuardian")
            logger.info("Removed uninstall registry key")
        except FileNotFoundError:
            logger.info("Uninstall registry key not found")
        except PermissionError:
            logger.warning("Could not remove uninstall registry key - insufficient permissions")
        
        return True
    except Exception as e:
        logger.error(f"Error removing registry entries: {e}")
        return False

def kill_guardian_processes():
    """Kill all Extension Guardian processes"""
    try:
        logger.info("Killing Extension Guardian processes...")
        
        # Use taskkill to kill all processes
        subprocess.run(
            ["taskkill", "/F", "/IM", "extension-guardian-desktop.exe"],
            capture_output=True,
            text=True
        )
        
        subprocess.run(
            ["taskkill", "/F", "/IM", "python.exe", "/FI", "WINDOWTITLE eq Extension Guardian*"],
            capture_output=True,
            text=True
        )
        
        logger.info("Processes killed")
        return True
    except Exception as e:
        logger.error(f"Error killing processes: {e}")
        return False

def remove_files():
    """Remove all Extension Guardian files"""
    try:
        logger.info("Removing Extension Guardian files...")
        
        # Get the install location from registry
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
        
        # Check if the directory exists
        if os.path.exists(install_path):
            # Remove all files in the directory
            for item in os.listdir(install_path):
                item_path = os.path.join(install_path, item)
                try:
                    if os.path.isfile(item_path):
                        os.unlink(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                except Exception as e:
                    logger.error(f"Error removing {item_path}: {e}")
            
            # Try to remove the directory itself
            try:
                shutil.rmtree(install_path)
                logger.info(f"Removed directory {install_path}")
            except Exception as e:
                logger.error(f"Error removing directory {install_path}: {e}")
        else:
            logger.info(f"Install directory {install_path} not found")
        
        return True
    except Exception as e:
        logger.error(f"Error removing files: {e}")
        return False

def main():
    """Main uninstallation function"""
    logger.info("Starting Extension Guardian uninstallation...")
    
    # Check if running as admin
    if not is_admin():
        run_as_admin()
        return
    
    # Verify password
    if not verify_password():
        return
    
    # Kill all Extension Guardian processes
    kill_guardian_processes()
    
    # Stop and uninstall the service
    stop_service()
    uninstall_service()
    
    # Remove registry entries
    remove_registry_entries()
    
    # Remove files
    remove_files()
    
    logger.info("Extension Guardian uninstalled successfully!")
    print("Extension Guardian has been uninstalled successfully.")

if __name__ == "__main__":
    main()
