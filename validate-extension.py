#!/usr/bin/env python3
"""
Extension Validation Script
Checks if all required files are present and properly formatted
"""
import os
import json
import sys

def check_file_exists(filepath, description):
    """Check if a file exists and return status"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"✅ {description}: {filepath} ({size} bytes)")
        return True
    else:
        print(f"❌ {description}: {filepath} - MISSING")
        return False

def validate_json(filepath):
    """Validate JSON file format"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            json.load(f)
        print(f"✅ {filepath} - Valid JSON format")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ {filepath} - Invalid JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ {filepath} - Error reading: {e}")
        return False

def validate_manifest(filepath):
    """Validate manifest.json content"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        required_fields = ['manifest_version', 'name', 'version', 'permissions']
        missing_fields = [field for field in required_fields if field not in manifest]
        
        if missing_fields:
            print(f"❌ Manifest missing required fields: {missing_fields}")
            return False
        
        if manifest.get('manifest_version') != 3:
            print(f"⚠️  Manifest version is {manifest.get('manifest_version')}, should be 3")
        
        print(f"✅ Manifest validation passed")
        print(f"   Name: {manifest.get('name')}")
        print(f"   Version: {manifest.get('version')}")
        print(f"   Permissions: {len(manifest.get('permissions', []))} items")
        return True
        
    except Exception as e:
        print(f"❌ Manifest validation failed: {e}")
        return False

def main():
    """Main validation function"""
    print("🔍 AI Productivity Guardian - Extension Validation")
    print("=" * 50)
    
    all_valid = True
    
    # Check required files
    required_files = [
        ('manifest.json', 'Extension manifest'),
        ('background.js', 'Background service worker'),
        ('content.js', 'Content script'),
        ('popup.html', 'Popup HTML'),
        ('popup.css', 'Popup stylesheet'),
        ('popup.js', 'Popup JavaScript'),
        ('block-page.html', 'Block page'),
        ('README.md', 'Documentation'),
        ('setup.md', 'Setup guide'),
    ]
    
    print("\n📁 Checking Required Files:")
    for filepath, description in required_files:
        if not check_file_exists(filepath, description):
            all_valid = False
    
    # Check icons directory
    print("\n🎨 Checking Icons:")
    icons_dir = 'icons'
    if os.path.exists(icons_dir):
        icon_files = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png']
        for icon in icon_files:
            icon_path = os.path.join(icons_dir, icon)
            if not check_file_exists(icon_path, f"Icon {icon}"):
                all_valid = False
    else:
        print("❌ Icons directory missing")
        all_valid = False
    
    # Validate JSON files
    print("\n📄 Validating JSON Files:")
    if os.path.exists('manifest.json'):
        if not validate_json('manifest.json'):
            all_valid = False
        if not validate_manifest('manifest.json'):
            all_valid = False
    
    # Check file sizes (basic sanity check)
    print("\n📊 File Size Check:")
    size_checks = [
        ('background.js', 5000, 'Background script seems too small'),
        ('content.js', 3000, 'Content script seems too small'),
        ('popup.js', 5000, 'Popup script seems too small'),
        ('popup.css', 3000, 'Popup CSS seems too small'),
        ('block-page.html', 8000, 'Block page seems too small'),
    ]
    
    for filepath, min_size, warning in size_checks:
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            if size < min_size:
                print(f"⚠️  {filepath}: {size} bytes - {warning}")
            else:
                print(f"✅ {filepath}: {size} bytes - OK")
    
    # Summary
    print("\n" + "=" * 50)
    if all_valid:
        print("🎉 VALIDATION PASSED!")
        print("✅ All required files present")
        print("✅ JSON files are valid")
        print("✅ Extension ready for loading")
        print("\n🚀 Next steps:")
        print("1. Open Chrome/Brave and go to chrome://extensions/")
        print("2. Enable 'Developer mode'")
        print("3. Click 'Load unpacked'")
        print("4. Select this folder")
        print("5. Test with youtube.com or sflix.to")
    else:
        print("❌ VALIDATION FAILED!")
        print("Please fix the issues above before loading the extension.")
        sys.exit(1)

if __name__ == "__main__":
    main() 