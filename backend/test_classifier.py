"""
test_classifier.py - Quick verification tests for the zero-shot transaction classifier.
Run: cd backend && .\\venv\\Scripts\\python.exe test_classifier.py
"""
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, ".")

from classifier import classify_transaction, _keyword_classify, _get_default_category

# ── Test cases ──────────────────────────────────────────────────────────────

tests = [
    # (description, card_id, expected_category)
    # SBI Cashback
    ("AMAZON PAY INDIA PVT Bangalore IN", "sbi-cashback", "Online Spends"),
    ("FLIPKART INTERNET PVT LTD", "sbi-cashback", "Online Spends"),
    ("ZEPTO MARKETPLACE PRIV Bangalore IN", "sbi-cashback", "Online Spends"),
    ("SWIGGY ORDER 12345", "sbi-cashback", "Online Spends"),
    ("NETFLIX SUBSCRIPTION", "sbi-cashback", "Online Spends"),
    ("HP PETROL PUMP MUMBAI", "sbi-cashback", "Excluded"),
    ("NAYARA FUEL STATION", "sbi-cashback", "Excluded"),
    ("LIC PREMIUM PAYMENT", "sbi-cashback", "Excluded"),
    ("MSEDCL ELECTRICITY BILL", "sbi-cashback", "Excluded"),
    ("BIG BAZAAR RETAIL STORE", "sbi-cashback", "Offline Spends"),
    ("RELIANCE MART DELHI", "sbi-cashback", "Offline Spends"),

    # Axis Airtel
    ("AIRTEL PREPAID RECHARGE", "axis-airtel", "Airtel Services"),
    ("AIRTELXSTREAM SUBSCRIPTION", "axis-airtel", "Airtel Services"),
    ("ZOMATO ORDER FOOD", "axis-airtel", "Food & Grocery"),
    ("SWIGGY DELIVERY", "axis-airtel", "Food & Grocery"),
    ("BIGBASKET GROCERY", "axis-airtel", "Food & Grocery"),
    ("BESCOM ELECTRICITY BILL", "axis-airtel", "Utilities"),
    ("MAHANAGAR GAS BILL", "axis-airtel", "Utilities"),
    ("BPCL FUEL STATION", "axis-airtel", "Excluded"),
    ("AMAZON PURCHASE", "axis-airtel", "Other"),

    # HDFC Swiggy
    ("SWIGGY INSTAMART BANGALORE", "hdfc-swiggy", "Swiggy"),
    ("SWIGGY FOOD ORDER", "hdfc-swiggy", "Swiggy"),
    ("ZOMATO ONLINE ORDER", "hdfc-swiggy", "Online Food Delivery"),
    ("DOMINOS PIZZA PUNE", "hdfc-swiggy", "Dining"),
    ("STARBUCKS COFFEE MG ROAD", "hdfc-swiggy", "Dining"),
    ("AMAZON SHOPPING", "hdfc-swiggy", "Online Spends"),
    ("MAKESHIFT RELIANCE RETAIL", "hdfc-swiggy", "Other"),
    ("BPCL PETROL PUMP", "hdfc-swiggy", "Excluded"),
    ("LIC PREMIUM", "hdfc-swiggy", "Excluded"),

    # ── Bug fixes: GST + EMI edge cases ─────────────────
    # GST as standalone description (was wrongly falling to default/semantic)
    ("GST", "axis-airtel", "Excluded"),
    ("GST", "sbi-cashback", "Excluded"),
    ("GST", "hdfc-swiggy", "Excluded"),
    # EMI processing fees (keywords only had 'emi payment', missed 'emi processing')
    ("EMI PROCESSING FEE, REF# 69828714 ELECTRONICS", "axis-airtel", "Excluded"),
    ("EMI PROCESSING FEE REF# 12345", "sbi-cashback", "Excluded"),
    ("EMI PROCESSING FEE", "hdfc-swiggy", "Excluded"),
]

print(f"\n{'Description':<45} {'Card':<15} {'Expected':<22} {'Got':<22} {'✓/✗'}")
print("─" * 115)

passed = 0
failed = 0

for desc, card_id, expected in tests:
    # Only keyword layer for speed (skip model download in CI)
    result = _keyword_classify(desc, card_id)
    if result is None:
        result = _get_default_category(card_id) or "Other"

    ok = result == expected
    status = "✓" if ok else "✗"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"{desc:<45} {card_id:<15} {expected:<22} {result:<22} {status}")

print(f"\n{'─' * 115}")
print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
if failed == 0:
    print("All tests passed! ✓")
else:
    print("Some tests failed: review keyword rules in classifier.py")
    sys.exit(1)
