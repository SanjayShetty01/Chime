"""
classifier.py - Two-layer zero-shot transaction category classifier.

Layer 1: Keyword rules loaded from keyword_rules.yaml (fast, no model needed).
Layer 2: Sentence-transformers semantic similarity fallback (zero-shot NLP).

Usage:
    from classifier import classify_transaction
    category = classify_transaction(
        description="AMAZON PAY INDIA",
        card_id="sbi-cashback",
        candidate_categories=["Online Spends", "Offline Spends", "Excluded"]
    )
"""
from __future__ import annotations
import os
import logging
import yaml

logger = logging.getLogger(__name__)

# ── Load keyword rules (GitHub Remote Sync + Local Fallback) ───────────────────

from cards_sync import load_rules_yaml

_keyword_rules_cache: dict | None = None


def _load_rules() -> dict:
    """Load and cache keyword_rules (from remote sync or local YAML)."""
    global _keyword_rules_cache
    if _keyword_rules_cache is None:
        data = load_rules_yaml()
        _keyword_rules_cache = data.get("rules", {})
    return _keyword_rules_cache


def _keyword_classify(description: str, card_id: str) -> str | None:
    """
    Try to classify using keyword rules from YAML.
    Returns the matched category name, or None if no match.
    Rules are evaluated top-to-bottom; first match wins.
    """
    rules = _load_rules()
    card_rules = rules.get(card_id)
    if not card_rules:
        return None

    desc_lower = description.lower()
    categories = card_rules.get("categories", {})

    for category, keywords in categories.items():
        if not keywords:
            continue
        for kw in keywords:
            if kw.lower() in desc_lower:
                return category

    return None


def _get_default_category(card_id: str) -> str | None:
    """Return the configured default category for a card (fallback after no keyword match)."""
    rules = _load_rules()
    card_rules = rules.get(card_id, {})
    return card_rules.get("default_category")


# ── Layer 2: Sentence-Transformers (lazy-loaded) ──────────────────────────────

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            import warnings
            warnings.filterwarnings("ignore", message=".*unauthenticated requests to the HF Hub.*")
            warnings.filterwarnings("ignore", category=UserWarning, module="huggingface_hub")
            logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
            logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformers model (first time - downloading if needed)...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Model loaded successfully.")
        except ImportError:
            logger.warning("sentence-transformers not installed. Semantic fallback disabled.")
            _model = "unavailable"
    return _model if _model != "unavailable" else None


def _semantic_classify(description: str, candidates: list[str]) -> tuple[str | None, float]:
    """Zero-shot semantic classification via cosine similarity.

    Returns (best_matching_category, score), or (None, 0.0) if score is low.
    """
    model = _get_model()
    if model is None or not candidates:
        return None, 0.0

    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    import re

    # Strip noisy city/country suffixes common in Indian bank statements
    clean_desc = re.sub(
        r"\b(bangalore|bengaluru|mumbai|delhi|chennai|hyderabad|pune|kolkata|india|in|pvt|ltd|private|limited)\b",
        "",
        description.lower(),
    )
    clean_desc = re.sub(r"\s+", " ", clean_desc).strip()

    desc_emb = model.encode([clean_desc])
    cat_embs = model.encode(candidates)

    sims = cosine_similarity(desc_emb, cat_embs)[0]
    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])

    CONFIDENCE_THRESHOLD = 0.25
    if best_score < CONFIDENCE_THRESHOLD:
        logger.debug(
            "Semantic score %.3f below threshold for '%s' → falling back to default",
            best_score, description,
        )
        return None, round(best_score, 2)

    return candidates[best_idx], round(best_score, 2)


# ── Public API ────────────────────────────────────────────────────────────────

def classify_transaction_with_confidence(
    description: str,
    card_id: str,
    candidate_categories: list[str],
) -> tuple[str, float, str]:
    """
    Classify a transaction description and return (category, confidence_score, match_type).

    Returns:
        tuple of (category_name, confidence_float_0_to_1, match_type_string)
        match_type is one of: "rule" (1.0), "semantic" (0.25..1.0), "fallback" (0.50)
    """
    # Layer 1: keyword rules from YAML
    keyword_result = _keyword_classify(description, card_id)
    if keyword_result and keyword_result in candidate_categories:
        return keyword_result, 1.0, "rule"

    default_cat = _get_default_category(card_id)
    if default_cat and default_cat in candidate_categories:
        if len(description.strip()) < 6:
            return default_cat, 0.60, "fallback"

    # Layer 2: semantic similarity
    semantic_candidates = [c for c in candidate_categories if c != "Excluded"]
    if not semantic_candidates:
        semantic_candidates = candidate_categories

    result_cat, score = _semantic_classify(description, semantic_candidates)
    if result_cat and result_cat in candidate_categories:
        return result_cat, score, "semantic"

    # Fallback default
    fallback = default_cat if (default_cat and default_cat in candidate_categories) else candidate_categories[0]
    return fallback, 0.50, "fallback"


def classify_transaction(description: str, card_id: str, candidate_categories: list[str]) -> str:
    """Legacy wrapper returning only the category string."""
    cat, _, _ = classify_transaction_with_confidence(description, card_id, candidate_categories)
    return cat


def reload_rules() -> None:
    """Force a reload of keyword_rules.yaml (useful after editing it at runtime)."""
    global _keyword_rules_cache
    _keyword_rules_cache = None
    _load_rules()
    logger.info("keyword_rules.yaml reloaded.")
