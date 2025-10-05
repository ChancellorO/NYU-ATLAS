import earthaccess
from utils.action import generate_package
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess, re, time




def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/")
    def index():
        return jsonify({"message": "NASA Flask API running via Cloudflare Tunnel"})

    @app.route("/analyze", methods=["POST"])
    def analyze():
        try:
            data = request.get_json()
            lat = data.get("lat", 39.9)
            lon = data.get("lon", 116.4)
            date = data.get("date", "2020-06-01")

            package = generate_package(lat=lat, lon=lon, date_str=date)
            return jsonify(package)

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app


if __name__ == "__main__":
    # 登录 NASA Earthdata 账号
    auth = earthaccess.login(strategy="netrc")


    port = 5000
    app = create_app()

    # Start Flask
    print(f"Flask running on http://127.0.0.1:{port}")
    subprocess.Popen(["python", "-m", "flask", "run", "--port", str(port)])
    time.sleep(2)

    # Start Cloudflare Quick Tunnel
    print("Starting Cloudflare Quick Tunnel...\n")
    proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    # Get the public url
    while True:
        line = proc.stdout.readline()
        if not line:
            break
        print(line.strip())
        match = re.search(r"(https://[a-zA-Z0-9-]+\.trycloudflare\.com)", line)
        if match:
            public_url = match.group(1)
            print(f"\n Public Cloudflare URL: {public_url}")
            print(f" Access your API here:\n   {public_url}/\n   {public_url}/analyze\n")
            break

    proc.wait()
    

