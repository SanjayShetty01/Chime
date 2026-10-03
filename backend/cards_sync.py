"""
cards_sync.py - Handles remote syncing of credit card definitions (cards.yaml)
and keyword classification rules (keyword_rules.yaml) from GitHub.

Falls back gracefully to local bundled YAML files if offline or unreachable.
"""
from __future__ import annotations
import os
import logging
import urllib.request
import yaml

logger = logging.getLogger(__name__)

# Default raw GitHub URLs (can be overridden via environment variables)
DEFAULT_CARDS_REMOTE_URL = os.environ.get(
    "CHIME_CARDS_REMOTE_URL",
    "https://raw.githubusercontent.com/SanjayShetty01/Chime/main/backend/cards.yaml"
)
DEFAULT_RULES_REMOTE_URL = os.environ.get(
    "CHIME_RULES_REMOTE_URL",
    "https://raw.githubusercontent.com/SanjayShetty01/Chime/main/backend/keyword_rules.yaml"
)

LOCAL_CARDS_PATH = os.path.join(os.path.dirname(__file__), "cards.yaml")
LOCAL_RULES_PATH = os.path.join(os.path.dirname(__file__), "keyword_rules.yaml")

from database import get_data_dir

CACHE_DIR = get_data_dir()
REMOTE_CARDS_CACHE = os.path.join(CACHE_DIR, "remote_cards.yaml")
REMOTE_RULES_CACHE = os.path.join(CACHE_DIR, "remote_keyword_rules.yaml")


def sync_remote_configs():
    """Try downloading the latest cards.yaml and keyword_rules.yaml from GitHub."""
    os.makedirs(CACHE_DIR, exist_ok=True)

    # 1. Sync cards.yaml
    try:
        req = urllib.request.Request(
            DEFAULT_CARDS_REMOTE_URL,
            headers={"User-Agent": "Chime-App/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            content = resp.read().decode("utf-8")
            data = yaml.safe_load(content)
            if data and "cards" in data:
                with open(REMOTE_CARDS_CACHE, "w", encoding="utf-8") as f:
                    f.write(content)
                logger.info("Successfully synced latest cards.yaml from GitHub.")
    except Exception as e:
        logger.warning(f"Could not fetch remote cards.yaml ({e}). Using cached/local version.")

    # 2. Sync keyword_rules.yaml
    try:
        req = urllib.request.Request(
            DEFAULT_RULES_REMOTE_URL,
            headers={"User-Agent": "Chime-App/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            content = resp.read().decode("utf-8")
            data = yaml.safe_load(content)
            if data and "rules" in data:
                with open(REMOTE_RULES_CACHE, "w", encoding="utf-8") as f:
                    f.write(content)
                logger.info("Successfully synced latest keyword_rules.yaml from GitHub.")
    except Exception as e:
        logger.warning(f"Could not fetch remote keyword_rules.yaml ({e}). Using cached/local version.")


def load_cards_yaml() -> dict:
    """Load cards data from remote cache (if available) or local cards.yaml."""
    if os.path.exists(REMOTE_CARDS_CACHE):
        try:
            with open(REMOTE_CARDS_CACHE, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data and "cards" in data:
                    return data
        except Exception:
            pass

    if os.path.exists(LOCAL_CARDS_PATH):
        with open(LOCAL_CARDS_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"cards": []}

    return {"cards": []}


def load_rules_yaml() -> dict:
    """Load classification rules from remote cache (if available) or local keyword_rules.yaml."""
    if os.path.exists(REMOTE_RULES_CACHE):
        try:
            with open(REMOTE_RULES_CACHE, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if data and "rules" in data:
                    return data
        except Exception:
            pass

    if os.path.exists(LOCAL_RULES_PATH):
        with open(LOCAL_RULES_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {"rules": {}}

    return {"rules": {}}
