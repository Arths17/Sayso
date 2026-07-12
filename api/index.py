import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app

logger = logging.getLogger(__name__)

try:
    from mangum import Mangum
    handler = Mangum(app)
except Exception:
    logger.exception("Failed to initialize Mangum handler")
    handler = None