"""Local preview: python3 serve.py [port], then open http://127.0.0.1:8765/. A threaded server with a deeper listen
queue: the plain `python3 -m http.server` accepts five pending connections and drops the rest when the browser
fetches page files, photos and fonts in parallel."""
import http.server, os, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.ThreadingHTTPServer.request_queue_size = 128
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, ServerClass=http.server.ThreadingHTTPServer, port=port, bind='127.0.0.1')
