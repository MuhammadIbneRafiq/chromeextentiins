#!/usr/bin/env python3
"""
Native Messaging Host for Extension Guardian
This allows the browser extension to communicate with the desktop application
"""

import json
import sys
import struct
import subprocess
import psutil
import time
import threading
from pathlib import Path

class NativeMessagingHost:
    def __init__(self):
        self.extension_id = None
        self.desktop_app_running = False
        self.heartbeat_interval = 30  # seconds
        self.last_heartbeat = 0
        
    def read_message(self):
        """Read a message from stdin"""
        raw_length = sys.stdin.buffer.read(4)
        if len(raw_length) == 0:
            return None
        
        message_length = struct.unpack('@I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length).decode('utf-8')
        return json.loads(message)
    
    def send_message(self, message):
        """Send a message to stdout"""
        encoded_message = json.dumps(message).encode('utf-8')
        sys.stdout.buffer.write(struct.pack('@I', len(encoded_message)))
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()
    
    def is_desktop_app_running(self):
        """Check if the desktop application is running"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['name'].lower() == 'python.exe':
                    cmdline = proc.info['cmdline']
                    if cmdline and any('extension-guardian-desktop.py' in arg for arg in cmdline):
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return False
    
    def start_desktop_app(self):
        """Start the desktop application if not running"""
        if not self.is_desktop_app_running():
            try:
                script_path = Path(__file__).parent / 'extension-guardian-desktop.py'
                subprocess.Popen(['python', str(script_path)], 
                               creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0)
                return True
            except Exception as e:
                return False
        return True
    
    def handle_heartbeat(self, message):
        """Handle heartbeat message from extension"""
        self.last_heartbeat = time.time()
        self.extension_id = message.get('extensionId')
        
        # Check if desktop app is running
        if not self.is_desktop_app_running():
            if not self.start_desktop_app():
                return {
                    'type': 'error',
                    'message': 'Failed to start desktop application'
                }
        
        return {
            'type': 'heartbeat_ack',
            'timestamp': time.time(),
            'desktop_app_running': self.is_desktop_app_running()
        }
    
    def handle_extension_status(self, message):
        """Handle extension status message"""
        status = message.get('status', 'unknown')
        extension_id = message.get('extensionId')
        
        # Forward status to desktop app if running
        if self.is_desktop_app_running():
            # In a real implementation, you'd use IPC to communicate with desktop app
            pass
        
        return {
            'type': 'status_ack',
            'extension_id': extension_id,
            'status': status,
            'timestamp': time.time()
        }
    
    def handle_request(self, message):
        """Handle incoming message from extension"""
        msg_type = message.get('type', 'unknown')
        
        if msg_type == 'heartbeat':
            return self.handle_heartbeat(message)
        elif msg_type == 'extension_status':
            return self.handle_extension_status(message)
        else:
            return {
                'type': 'error',
                'message': f'Unknown message type: {msg_type}'
            }
    
    def run(self):
        """Main message handling loop"""
        try:
            while True:
                message = self.read_message()
                if message is None:
                    break
                
                response = self.handle_request(message)
                self.send_message(response)
                
        except Exception as e:
            error_response = {
                'type': 'error',
                'message': str(e)
            }
            self.send_message(error_response)

if __name__ == '__main__':
    host = NativeMessagingHost()
    host.run()
