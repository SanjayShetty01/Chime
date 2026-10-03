"""
build-sidecar.py - Cross-platform script to freeze Chime FastAPI backend
into a Tauri sidecar binary with the appropriate target triple name.

Usage:
    python Scripts/build-sidecar.py [--target TRIPLE]
"""
import argparse
import os
import platform
import shutil
import subprocess
import sys


def detect_target_triple() -> str:
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        return "x86_64-pc-windows-msvc"
    elif system == "linux":
        if machine in ("aarch64", "arm64"):
            return "aarch64-unknown-linux-gnu"
        return "x86_64-unknown-linux-gnu"
    elif system == "darwin":
        if machine in ("arm64", "aarch64"):
            return "aarch64-apple-darwin"
        return "x86_64-apple-darwin"
    else:
        raise RuntimeError(f"Unsupported operating system: {system}")


def main():
    parser = argparse.ArgumentParser(description="Build PyInstaller sidecar binary for Tauri.")
    parser.add_argument("--target", default=None, help="Target architecture triple (e.g., x86_64-pc-windows-msvc)")
    args = parser.parse_args()

    target_triple = args.target or detect_target_triple()

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backend_dir = os.path.join(repo_root, "backend")
    binaries_dir = os.path.join(repo_root, "frontend", "src-tauri", "binaries")

    os.makedirs(binaries_dir, exist_ok=True)

    sep = os.pathsep
    ext = ".exe" if platform.system().lower() == "windows" else ""
    target_filename = f"chime-backend-{target_triple}{ext}"
    dest_path = os.path.join(binaries_dir, target_filename)

    print(f"Building sidecar binary for target: {target_triple}")
    print(f"Destination: {dest_path}")

    # Build PyInstaller command
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--name", "chime-backend",
        "--add-data", f"cards.yaml{sep}.",
        "--add-data", f"keyword_rules.yaml{sep}.",
        "--add-data", f"parsers{sep}parsers",
        "--add-data", f"cashback_calculation{sep}cashback_calculation",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "pdfplumber",
        "--hidden-import", "sklearn.metrics.pairwise",
        "main.py",
    ]

    subprocess.run(pyinstaller_cmd, cwd=backend_dir, check=True)

    built_binary = os.path.join(backend_dir, "dist", f"chime-backend{ext}")
    if not os.path.isfile(built_binary):
        raise FileNotFoundError(f"PyInstaller build failed; {built_binary} not found.")

    shutil.copy2(built_binary, dest_path)
    print(f"Successfully staged sidecar binary to: {dest_path}")


if __name__ == "__main__":
    main()
