"""Run the software-only Reddit ranking from either working directory."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).resolve().parent / 'hex-only' / 'rebuild.py'), run_name='__main__')
