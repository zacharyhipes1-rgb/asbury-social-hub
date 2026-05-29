import json
import requests
import config

GAMMA_URL = "https://gamma-api.polymarket.com/markets"


def _passes_filters(market):
    question = market.get("question", "").lower()
    category = (market.get("category") or "").lower()
    for kw in config.EXCLUSION_KEYWORDS:
        if kw in question:
            return False
    if category == "sports":
        return True
    for kw in config.PREDICTION_MARKET_KEYWORDS_INCLUDE:
        if kw in question:
            return True
    return False


def fetch_markets():
    try:
        resp = requests.get(GAMMA_URL, params={"active": "true", "closed": "false"},
                            timeout=15, headers={
                                "User-Agent": "Mozilla/5.0 (compatible; DivergenceAgent/1.0)"
                            })
        resp.raise_for_status()
        raw = resp.json()
        status = resp.status_code
        ms = resp.elapsed.total_seconds() * 1000
    except requests.RequestException:
        raise

    if isinstance(raw, dict):
        items = raw.get("markets", raw.get("data", []))
    elif isinstance(raw, list):
        items = raw
    else:
        items = []

    filtered = []
    for m in items:
        if not _passes_filters(m):
            continue

        volume = float(m.get("volume", 0) or 0)
        if volume < config.MINIMUM_PREDICTION_MARKET_VOLUME_USD:
            continue

        try:
            prices = json.loads(m.get("outcomePrices", "[]"))
            outcomes = json.loads(m.get("outcomes", "[]"))
        except (json.JSONDecodeError, TypeError):
            continue

        contracts = []
        for name, price_str in zip(outcomes, prices):
            try:
                prob = float(price_str)
            except (ValueError, TypeError):
                continue
            contracts.append({"name": name, "prob": prob})

        if contracts:
            filtered.append({
                "source": "polymarket",
                "id": m.get("id", ""),
                "name": m.get("question", ""),
                "url": f"https://polymarket.com/event/{m.get('slug', m.get('id', ''))}",
                "contracts": contracts,
                "volume": volume,
                "liquidity": float(m.get("liquidity", 0) or 0),
            })

    return filtered, status, ms


if __name__ == "__main__":
    markets, status, ms = fetch_markets()
    print(f"Found {len(markets)} sports-related Polymarket markets (vol >= ${config.MINIMUM_PREDICTION_MARKET_VOLUME_USD:,})")
    for m in markets[:5]:
        print(f"\n  {m['name']}  (vol: ${m['volume']:,.0f})")
        for c in m["contracts"]:
            print(f"    {c['name']}: {c['prob']:.0%}")
