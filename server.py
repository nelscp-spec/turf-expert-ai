import http.server
import socketserver
import urllib.request
import urllib.parse
import ssl
import json
import datetime
import os
import threading
import time

PORT = 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

LIVE_CACHE = {
    'last_update': 0,
    'data': []
}

def load_turf_data_js_json():
    target_path = os.path.join(DIRECTORY, "turfData.js")
    if not os.path.exists(target_path):
        return []
    try:
        with open(target_path, "r", encoding="utf-8") as f:
            content = f.read()
        start = content.find("getMockProgramme() {")
        if start != -1:
            json_start = content.find("[", start)
            json_end = content.rfind("];")
            if json_start != -1 and json_end != -1:
                json_str = content[json_start:json_end+1]
                return json.loads(json_str)
    except Exception as e:
        print(f"Error loading turfData.js JSON: {e}")
    return []

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/programme':
            data = load_turf_data_js_json()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            return
        
        super().do_GET()

if __name__ == "__main__":
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Server started at http://127.0.0.1:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
