"""Vercel Python serverless entry point.

Vercel's file-based routing serves this module. We expose the FastAPI ASGI app
directly (Vercel's Python runtime supports ASGI apps exported as `app`), and
also provide a Mangum handler as a fallback adapter.
"""
import sys
from pathlib import Path

# ensure the project root is importable when Vercel runs this file in /api
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

try:
    from mangum import Mangum

    handler = Mangum(app)
except Exception:  # pragma: no cover
    handler = None
