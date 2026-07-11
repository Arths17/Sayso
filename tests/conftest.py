"""Force the offline stub LLM (and disabled auth) regardless of a local .env,
so the suite stays deterministic and doesn't hit real OpenRouter/Firebase."""
import os

os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SAYSO_AUTH_DISABLED"] = "true"
