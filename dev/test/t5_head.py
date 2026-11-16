import base64, hashlib, http.server, json, os, re, socketserver, sys, threading, zipfile
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = BASE + "/shots"; os.makedirs(SHOTS, exist_ok=True)

def gsha(b): return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()

# ---------- fixtures ----------
A = b"same content\n"; OLD = b"old version\n"; OLD_NEW = b"NEW version of old\n"; NEWF = b"brand new\n"; X = b"chem x\n"
zpath = BASE + "/up.zip"
with zipfile.ZipFile(zpath, "w") as z:
    z.writestr("Drive/Physics/2019/a.txt", A)
    z.writestr("Drive/Physics/2019/old.txt", OLD_NEW)
    z.writestr("Drive/Physics/2019/new.txt", NEWF)
    z.writestr("Drive/Chem/x.txt", X)
loose = BASE + "/loose.txt"; open(loose, "wb").write(b"loose file\n")

# ---------- static server ----------
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory="/home/claude/site", **k)
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

# ---------- stateful mock ----------
blob_size = {}; blob_data = {}
def add_blob(b): s = gsha(b); blob_size[s] = len(b); blob_data[s] = b; return s
snaps, commits, ctr = {}, {}, {"t": 0, "c": 0}
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fx") + "/"
def fx(n): return open(FX + n, "rb").read()
MD = b"# Hello Atlas\n\nSee ![fig](fig.png) and [data](data.json) and [web](https://example.com).\n\n```python\nprint('hi')\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<script>window.__xss=1</script>\n"
PY = b"def hello():\n    return 'world'\n"
HTML = b"<h1>Page</h1><script>window.top.__xss2=1</script>"
base = {
  "Docs/notes.md": {"sha": add_blob(MD), "mode": "100644"},
  "Docs/fig.png": {"sha": add_blob(fx("fig.png")), "mode": "100644"},
  "Docs/data.json": {"sha": add_blob(b'{"a":1,"b":[1,2]}'), "mode": "100644"},
  "Docs/code.py": {"sha": add_blob(PY), "mode": "100644"},
  "Docs/page.html": {"sha": add_blob(HTML), "mode": "100644"},
  "Docs/sample.pdf": {"sha": add_blob(fx("r/doc.pdf")), "mode": "100644"},
  "Docs/sample.docx": {"sha": add_blob(fx("sample.docx")), "mode": "100644"},
  "Docs/sample.xlsx": {"sha": add_blob(fx("sample.xlsx")), "mode": "100644"},
  "Docs/sample.pptx": {"sha": add_blob(fx("sample.pptx")), "mode": "100644"},
  "Old/paper.doc": {"sha": add_blob(fx("sample.doc")), "mode": "100644"},
  "Old/marks.xls": {"sha": add_blob(fx("sample.xls")), "mode": "100644"},
  "Old/slides.ppt": {"sha": add_blob(fx("sample.ppt")), "mode": "100644"},
  "Docs/blob.bin": {"sha": add_blob(bytes(range(256))*4), "mode": "100644"},
  "Docs/bundle.zip": {"sha": add_blob(open(zpath, "rb").read()), "mode": "100644"},
  "index.html": {"sha": add_blob(b"app"), "mode": "100644"},
  "app/app.js": {"sha": add_blob(b"app"), "mode": "100644"},
  "README.md": {"sha": add_blob(b"hi"), "mode": "100644"},
  "QPs/Drive/Physics/2019/a.txt": {"sha": add_blob(A), "mode": "100644"},
  "QPs/Drive/Physics/2019/old.txt": {"sha": add_blob(OLD), "mode": "100644"},
  "Notes/todo.txt": {"sha": add_blob(b"todo"), "mode": "100644"},
}
snaps["t0"] = {p: {**v, "size": blob_size[v["sha"]]} for p, v in base.items()}
commits["c0"] = {"tree": "t0", "parents": [], "msg": "Initial", "date": "2026-11-14T10:00:00Z"}
head = {"sha": "c0"}
heads = {"main": head}   # branch name -> {"sha"}
merges = []
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PATCH,OPTIONS", "access-control-expose-headers": "*"}
reqlog = []
CURB = {"n": "main"}
def cur(): return snaps[commits[heads[CURB["n"]]["sha"]]["tree"]]
def paths(): return sorted(cur().keys())

def handler(route, request):
    if request.method == "OPTIONS": return route.fulfill(status=204, headers=CORS)
    path = re.sub(r"^https://api.github.com", "", request.url)
    body = json.loads(request.post_data) if request.post_data else None
    reqlog.append((request.method, path))
    def ok(o, s=200): route.fulfill(status=s, headers={**CORS, "content-type": "application/json"}, body=json.dumps(o))
    if request.headers.get("authorization") != "Bearer test-token": return ok({"message": "Bad credentials"}, 401)
    mbr = re.match(r"/repos/me/(\w+)/branches/main$", path)
    if request.method == "GET" and mbr:
        return ok({"name": "main"}) if mbr.group(1) in ("qp","qp2") else ok({"message": "Not Found"}, 404)
    R = "/repos/me/qp"
    if request.method == "GET" and path == R + "/branches?per_page=100": return ok([{"name": n} for n in heads])
    mh = re.match(R + r"/git/ref/heads/(.+)$", path)
    if request.method == "GET" and mh:
        from urllib.parse import unquote
        n = unquote(mh.group(1)); return ok({"object": {"sha": heads[n]["sha"]}}) if n in heads else ok({"message": "Not Found"}, 404)
    if request.method == "POST" and path == R + "/git/refs":
        n = body["ref"].replace("refs/heads/", ""); heads[n] = {"sha": body["sha"]}; return ok({"ref": body["ref"]}, 201)
    if request.method == "POST" and path == R + "/merges":
        if body["base"] == "conflict": return ok({"message": "Merge conflict"}, 409)
        merges.append((body["base"], body["head"])); return ok({"sha": "m1"}, 201)
    m = re.match(R + r"/git/commits/(\w+)$", path)
    if request.method == "GET" and m:
        c = commits[m.group(1)]; return ok({"sha": m.group(1), "tree": {"sha": c["tree"]}})
    m = re.match(R + r"/git/trees/(\w+)\?recursive=1$", path)
    if request.method == "GET" and m:
        return ok({"truncated": False, "tree": [{"path": p, "type": "blob", "mode": v["mode"], "sha": v["sha"], "size": v["size"]} for p, v in snaps[m.group(1)].items()]})
    if request.method == "GET" and path.startswith(R + "/commits?"):
        from urllib.parse import unquote
        bn = re.search(r"sha=([^&]+)", path); bn = unquote(bn.group(1)) if bn else "main"
        out, s = [], heads.get(bn, head)["sha"]
        while s:
            c = commits[s]
            out.append({"sha": s, "commit": {"message": c["msg"], "author": {"date": c["date"]}}, "parents": [{"sha": x} for x in c["parents"]]})
            s = c["parents"][0] if c["parents"] else None
        return ok(out)
    mc = re.match(R + r"/contents/(.+?)\?ref=(.+)$", path)
    if request.method == "GET" and mc:
        from urllib.parse import unquote
        p, ref = unquote(mc.group(1)), unquote(mc.group(2))
        cs = heads[ref]["sha"] if ref in heads else ref
        f = snaps[commits[cs]["tree"]].get(p)
        if not f: return ok({"message": "Not Found"}, 404)
        return ok({"sha": f["sha"], "path": p, "type": "file"})
    mb = re.match(R + r"/git/blobs/(\w+)$", path)
    if request.method == "GET" and mb:
        return route.fulfill(status=200, headers={**CORS, "content-type": "application/octet-stream"}, body=blob_data[mb.group(1)])
    if request.method == "POST" and path == R + "/git/blobs":
        data = base64.b64decode(body["content"]) if body.get("encoding") == "base64" else body["content"].encode()
        return ok({"sha": add_blob(data)}, 201)
    if request.method == "POST" and path == R + "/git/trees":
        ctr["t"] += 1; sha = "t%d" % ctr["t"]; s = dict(snaps[body["base_tree"]])
        for e in body["tree"]:
            if e["sha"] is None: s.pop(e["path"], None)
            else: s[e["path"]] = {"sha": e["sha"], "mode": e["mode"], "size": blob_size[e["sha"]]}
        snaps[sha] = s; return ok({"sha": sha}, 201)
    if request.method == "POST" and path == R + "/git/commits":
        ctr["c"] += 1; sha = "c%d" % ctr["c"]
        commits[sha] = {"tree": body["tree"], "parents": body["parents"], "msg": body["message"], "date": "2026-11-15T09:%02d:00Z" % ctr["c"]}
        return ok({"sha": sha}, 201)
    mp = re.match(R + r"/git/refs/heads/(.+)$", path)
    if request.method == "PATCH" and mp:
        from urllib.parse import unquote
        heads[unquote(mp.group(1))]["sha"] = body["sha"]; return ok({"object": {"sha": body["sha"]}})
    return ok({"message": "Not Found"}, 404)


PW = "pw-Ünï 1!"
def LOGIN(pw=None):
    page.click("#homeLogin"); page.wait_for_selector(".layer.open input[type=password]")
    page.fill(".layer.open input[type=password]", pw or PW); page.keyboard.press("Enter")
    page.wait_for_selector("#libList .row")

def OPENMENU():
    if not page.locator("#menuBtn").is_visible():
        page.click("#fHome"); page.wait_for_selector("#tab-files:not([hidden])"); page.wait_for_timeout(450)
    page.click("#menuBtn")
