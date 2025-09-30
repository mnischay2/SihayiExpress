import http.server
import socketserver
import os
import socket
from zeroconf import ServiceInfo, Zeroconf

PORT = 80  # Default HTTP port
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def get_ip_address():
    """Helper function to get the primary IP address of the machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == "__main__":
    # --- Announce the service on the local network via mDNS (Zeroconf) ---
    zeroconf = Zeroconf()
    ip_address = get_ip_address()
    service_info = ServiceInfo(
        "_http._tcp.local.",
        "SihayiExpress Frontend._http._tcp.local.",
        addresses=[socket.inet_aton(ip_address)],
        port=PORT,
        properties={'path': '/'},
        server="sihayi.local."
    )
    zeroconf.register_service(service_info)
    print("Frontend service announced on the network as 'SihayiExpress Frontend'")

    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving frontend at http://0.0.0.0:{PORT} (accessible on your LAN)")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            zeroconf.unregister_service(service_info)
            zeroconf.close()
            httpd.server_close()
