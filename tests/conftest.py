"""Force the offline stub LLM (and disabled auth/OAuth) regardless of a local
.env, so the suite stays deterministic and doesn't hit real
OpenRouter/Firebase/Google."""
import os

os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SAYSO_AUTH_DISABLED"] = "true"
os.environ["GOOGLE_OAUTH_CLIENT_ID"] = ""
os.environ["GOOGLE_OAUTH_CLIENT_SECRET"] = ""
