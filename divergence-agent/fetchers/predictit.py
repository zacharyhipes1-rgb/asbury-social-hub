import time
import requests
import config

API_URL = "https://www.predictit.org/api/marketdata/all/"
_cache = None
_cache_time = 0
_CACHE_TTL = 300  # 5 minutes


def _passes_filters(market):
    name_lower = market.get("name", "").lower()
    if market.get("status") != "Open":
        return False
    for kw in config.EXCLUSION_KEYWORDS:
        if kw in name_lower:
            return False
    for kw in config.PREDICTION_MARKET_KEYWORDS_INCLUDE:
        if kw in name_lower:
            return True
    return False


def fetch_markets():
    global _cache, _cache_time
    now = time.time()
    if _cache is not None and (now - _cache_time) < _CACHE_TTL:
        raw = _cache
        status, ms = 200, 0
    else:
        try:
            resp = requests.get(API_URL, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (compatible; DivergenceAgent/1.0)"
            })
            resp.raise_for_status()
            raw = resp.json()
            _cache = raw
            _cache_time = now
            status = resp.status_code
            ms = resp.elapsed.total_seconds() * 1000
        except requests.RequestException as exc:
            raise

    markets = raw.get("markets", [])
    filtered = []
    for m in markets:
        if not _passes_filters(m):
            continue
        contracts = []
        for c in m.get("contracts", []):
            if c.get("status") != "Open":
                continue
            contracts.append({
                "name": c.get("name", ""),
                "prob": c.get("lastTradePrice", 0.0),
                "best_buy_yes": c.get("bestBuyYesCost"),
                "best_buy_no": c.get("bestBuyNoCost"),
            })
        if contracts:
            filtered.append({
                "source": "predictit",
                "id": m.get("id"),
                "name": m.get("name", ""),
                "url": m.get("url", ""),
                "contracts": contracts,
                "volume": None,  # PredictIt doesn't expose volume per market
            })
    return filtered, status, ms


if __name__ == "__main__":
    markets, status, ms = fetch_markets()
    print(f"Found {len(markets)} sports-related PredictIt markets")
    for m in markets[:5]:
        print(f"\n  {m['name']}")
        for c in m["contracts"][:3]:
            print(f"    {c['name']}: {c['prob']:.0%}")
