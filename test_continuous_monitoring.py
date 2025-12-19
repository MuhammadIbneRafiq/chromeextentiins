"""
Test script to verify continuous monitoring is working properly.
This will read the log file and show recent monitoring activity.
"""
import os
from pathlib import Path
from datetime import datetime, timedelta

def tail_log(log_file, lines=50):
    """Read last N lines from log file"""
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            return all_lines[-lines:]
    except Exception as e:
        return [f"Error reading log: {e}"]

def analyze_monitoring():
    """Analyze the monitoring activity from logs"""
    log_dir = Path.home() / "ExtensionGuardian" / "logs"
    today_log = log_dir / f"guardian_{datetime.now().strftime('%Y%m%d')}.log"
    
    if not today_log.exists():
        print(f"❌ Log file not found: {today_log}")
        return
    
    print(f"📋 Reading log file: {today_log}\n")
    print("=" * 80)
    print("LAST 50 LOG ENTRIES:")
    print("=" * 80)
    
    lines = tail_log(today_log, 50)
    for line in lines:
        line = line.rstrip()
        if "CHECK CYCLE" in line:
            print(f"🔍 {line}")
        elif "DISABLED" in line and "EXTENSION" in line:
            print(f"⚠️  {line}")
        elif "ENABLED" in line and "Extension" in line:
            print(f"✅ {line}")
        elif "Closing browsers" in line:
            print(f"🛑 {line}")
        elif "Shutdown" in line:
            print(f"💥 {line}")
        elif "WARNING" in line or "ERROR" in line:
            print(f"⚠️  {line}")
        elif "tick" in line:
            print(f"⏱️  {line}")
        else:
            print(f"   {line}")
    
    print("\n" + "=" * 80)
    print("MONITORING ANALYSIS:")
    print("=" * 80)
    
    # Count check cycles in last minute
    recent_checks = [l for l in lines if "CHECK CYCLE" in l and "Starting" in l]
    if recent_checks:
        print(f"✓ Found {len(recent_checks)} check cycles in recent logs")
        print(f"✓ Monitoring appears to be running continuously")
    else:
        print("❌ No recent check cycles found - monitoring may not be running!")
    
    # Check for disabled detections
    disabled_detections = [l for l in lines if "EXTENSION DISABLED" in l and "DETECTED" in l]
    if disabled_detections:
        print(f"⚠️  Found {len(disabled_detections)} disabled extension detection(s)")
    
    # Check for shutdowns
    shutdowns = [l for l in lines if "Starting shutdown sequence" in l]
    if shutdowns:
        print(f"💥 Found {len(shutdowns)} shutdown sequence(s) initiated")
    
    # Check if shutdown completed
    completed = [l for l in lines if "Shutdown sequence completed" in l]
    if completed:
        print(f"✓ Found {len(completed)} completed shutdown(s)")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    print("🛡️  Extension Guardian - Continuous Monitoring Test\n")
    analyze_monitoring()
    print("\n💡 Tip: Run this script multiple times to verify monitoring is continuous")
    print("💡 If you see regular CHECK CYCLE entries, monitoring is working!")

