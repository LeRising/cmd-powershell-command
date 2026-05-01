import json
import os
import hashlib
from flask import Flask, render_template, jsonify, make_response, request
from flask_compress import Compress

app = Flask(__name__)
Compress(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# ---------------------------------------------------------------------------
# Precomputed data — loaded once at startup, not per-request
# ---------------------------------------------------------------------------

def _load_commands():
    """Load all command JSON files once and return the combined list."""
    commands = []
    for filename in ["cmd_commands.json", "powershell_commands.json", "run_commands.json"]:
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                commands.extend(json.load(f))
    return commands

def _build_categories(commands):
    """Build sorted category list from commands."""
    cats = {}
    for cmd in commands:
        key = cmd["category"]
        if key not in cats:
            cats[key] = {"key": key, "label": cmd["categoryLabel"], "count": 0}
        cats[key]["count"] += 1
    return sorted(cats.values(), key=lambda x: x["label"])

def _build_stats(commands):
    """Build statistics dict from commands."""
    sources = {}
    for cmd in commands:
        src = cmd["source"]
        sources[src] = sources.get(src, 0) + 1
    return {
        "total": len(commands),
        "sources": sources,
        "categories": len(set(cmd["category"] for cmd in commands)),
    }

# Load once at import time
COMMANDS = _load_commands()
CATEGORIES = _build_categories(COMMANDS)
STATS = _build_stats(COMMANDS)
COMMANDS_JSON = json.dumps(COMMANDS, ensure_ascii=False, separators=(",", ":"))
ETAG = hashlib.md5(COMMANDS_JSON.encode("utf-8")).hexdigest()

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.after_request
def add_headers(response):
    """Add common security and performance headers."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if request.endpoint == "static":
        response.headers["Cache-Control"] = "public, max-age=86400"
    return response

@app.route("/")
def index():
    resp = make_response(render_template(
        "index.html",
        commands_json=COMMANDS_JSON,
        categories=CATEGORIES,
        total_count=len(COMMANDS),
    ))
    resp.headers["ETag"] = f'"{ETAG}"'
    resp.headers["Cache-Control"] = "private, max-age=0, must-revalidate"
    return resp

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "total_commands": len(COMMANDS)})

@app.route("/api/stats")
def stats():
    return jsonify(STATS)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
