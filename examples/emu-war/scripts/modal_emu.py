"""One-off Modal GPU render of the Remotion short "The War I Won" (remotion/emu-war), the Emu War told by an emu.

    modal run remotion/modal_emu.py::render_emu          # done by .github/workflows/emu-war-render.yml

Renders the composition EmuShort at the cartoon-short skill's final spec (1440x2560, --scale 1.3333, MSAA 4, full
lens blur) with Chromium on the L4 through ANGLE/EGL (falls back to egl, then software swangle), muxes the mix from
R2 previews/emu-war-pov/mix.wav, and uploads the result to R2 previews/emu-war-pov/ (whole file + 40 MB parts).
Publishes nothing. Secret: the existing Modal secret `sitefarm-cloudflare` (CLOUDFLARE_API_TOKEN).
"""

from __future__ import annotations

import os
import subprocess
import time
import urllib.parse
import urllib.request

import modal

APP = "/app"
ACCOUNT = "4cf9e25a3dccfbd03d390e5555b59e3d"
BUCKET = "sitefarm-mcp-artifacts"
PREFIX = "previews/emu-war-pov/"
HERE = os.path.dirname(os.path.abspath(__file__))

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("curl", "ca-certificates", "gnupg", "ffmpeg", "libnss3", "libdbus-1-3", "libatk1.0-0", "libgbm1",
                 "libasound2", "libxrandr2", "libxkbcommon0", "libxfixes3", "libxcomposite1", "libxdamage1",
                 "libatk-bridge2.0-0", "libpango-1.0-0", "libcairo2", "libcups2", "libegl1", "libgl1",
                 "libglx-mesa0", "libgles2", "fonts-dejavu-core")
    .run_commands("curl -fsSL https://deb.nodesource.com/setup_22.x | bash -", "apt-get install -y nodejs")
    .add_local_file(os.path.join(HERE, "emu-war/package.json"), f"{APP}/package.json", copy=True)
    .add_local_file(os.path.join(HERE, "emu-war/package-lock.json"), f"{APP}/package-lock.json", copy=True)
    .run_commands(f"cd {APP} && npm ci --no-audit --no-fund && npx remotion browser ensure")
    .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "NVIDIA_VISIBLE_DEVICES": "all"})
    .add_local_dir(os.path.join(HERE, "emu-war/src"), f"{APP}/src")
    .add_local_dir(os.path.join(HERE, "emu-war/scripts"), f"{APP}/scripts")
    .add_local_dir(os.path.join(HERE, "emu-war/public"), f"{APP}/public")
    .add_local_file(os.path.join(HERE, "emu-war/tsconfig.json"), f"{APP}/tsconfig.json")
)
app = modal.App("emu-war-render", image=image)
cloudflare = modal.Secret.from_name("sitefarm-cloudflare")


def _r2(method: str, key: str, data: bytes | None = None, ctype: str = "application/octet-stream") -> bytes:
    token = "".join(os.environ["CLOUDFLARE_API_TOKEN"].split())
    url = (f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/r2/buckets/{BUCKET}/objects/"
           + urllib.parse.quote(key, safe=""))
    req = urllib.request.Request(url, data=data, method=method, headers={"Authorization": f"Bearer {token}", "Content-Type": ctype})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            print(f"R2 {method} {key} failed ({e}), retry {i + 1}", flush=True)
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"R2 {method} {key} failed")


def _render(gl: str, out: str, rng: str | None = None) -> bool:
    cmd = ["node", "scripts/render.mjs", gl, "1.3333", "4", out] + ([rng] if rng else [])
    t0 = time.time()
    r = subprocess.run(cmd, cwd=APP)
    print(f"--- {gl}{' ' + rng if rng else ''}: exit {r.returncode} in {time.time() - t0:.0f}s", flush=True)
    return r.returncode == 0 and os.path.exists(out)


@app.function(gpu="L4", cpu=8, memory=16384, timeout=4 * 3600, secrets=[cloudflare])
def render_emu() -> str:
    print(subprocess.run(["nvidia-smi", "--query-gpu=name,driver_version", "--format=csv"], capture_output=True, text=True).stdout, flush=True)
    # probe: 30 frames per GL backend, keep the first that works and is fast
    gl = None
    for cand in ("angle-egl", "egl", "swangle"):
        t0 = time.time()
        if _render(cand, "/tmp/probe.mp4", "100-129"):
            print(f"probe {cand}: {(time.time() - t0) / 30:.2f} s/frame (incl. bundle)", flush=True)
            gl = cand
            break
    if gl is None:
        raise RuntimeError("no GL backend rendered")
    silent = "/tmp/silent.mp4"
    if not _render(gl, silent):
        raise RuntimeError("full render failed")
    with open("/tmp/mix.wav", "wb") as fh:
        fh.write(_r2("GET", PREFIX + "mix.wav"))
    final = "/tmp/emu-war-pov.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", "/tmp/mix.wav", "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", final], check=True)
    data = open(final, "rb").read()
    print(f"final {len(data) / 1e6:.1f} MB ({gl})", flush=True)
    part = 40 * 1024 * 1024
    for i in range(0, len(data), part):
        _r2("PUT", f"{PREFIX}emu-war-pov.mp4.part{i // part:02d}", data[i:i + part], "application/octet-stream")
    try:
        _r2("PUT", PREFIX + "emu-war-pov.mp4", data, "video/mp4")
    except Exception as e:  # noqa: BLE001  (the parts are enough)
        print(f"whole-file upload failed: {e}", flush=True)
    _r2("PUT", PREFIX + "DONE.txt", f"{len(data)} bytes, gl={gl}, parts={(len(data) + part - 1) // part}\n".encode(), "text/plain")
    return PREFIX + "emu-war-pov.mp4"
