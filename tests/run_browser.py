"""Run a browser suite in an existing ego-browser task space."""
import argparse
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--space', required=True, type=int)
parser.add_argument('--suite', choices=['browser', 'motion-browser'], default='browser')
args = parser.parse_args()
script = f'globalThis.EGO_SPACE_ID={args.space};globalThis.SITE_URL={json.dumps((root / "index.html").as_uri())};\n'
script += (root / 'tests' / (args.suite + '.js')).read_text()
subprocess.run(['ego-browser', 'nodejs'], input=script, text=True, check=True, cwd=root)
