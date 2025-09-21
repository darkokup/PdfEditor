import http.server
import socketserver
import os
import sys
import threading
import webbrowser

# Change to the frontend build directory
build_dir = 'F:/CodeTests/gittest/pdf-annotation-app/frontend/build'
if not os.path.exists(build_dir):
    print(f"Error: Build directory not found at {build_dir}")
    sys.exit(1)

os.chdir(build_dir)
print(f"Serving from: {os.getcwd()}")

PORT = 3001

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format%args}")

Handler = MyHTTPRequestHandler

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"✅ Serving React app at http://localhost:{PORT}")
        print("✅ Backend should be at http://localhost:5001")
        print("Press Ctrl+C to stop the server")
        print("=" * 50)
        httpd.serve_forever()
except OSError as e:
    if e.errno == 48:  # Address already in use
        print(f"❌ Port {PORT} is already in use. Please kill the process using this port or use a different port.")
    else:
        print(f"❌ Error starting server: {e}")
    sys.exit(1)
except KeyboardInterrupt:
    print("\n✅ Server stopped gracefully.")
    sys.exit(0)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)