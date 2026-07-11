import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app

try:
    from mangum import Mangum

    handler = Mangum(app)
except Exception:
    handler = None