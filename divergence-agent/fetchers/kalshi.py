import requests
import config

BASE_URL = "https://trading-api.kalshi.com/trade-api/v2"
_session_token = None


def _login():
    global _session_token
    try:
        resp = requests.post(f"{BASE_URL}/login", json={
            "email": config.KALSHI_EMAIL,
            "password": config.KALSHI_PASSWORD,
        }, timeout=15)
        resp.raise_for_status()
        _session_token = resp.json().get("token")
    except requests.RequestException:
        _session_token = None
        raise


def fetch_markets():
    if not config.KALSHI_ENABLED:
        return [], 0, 0

    if _session_token is None:
        _login()

    try:
        resp = requests.get(f"{BASE_URL}/markets", params={
            "status": "open", "category": "sports",
        }, headers={"Authorization": f"Bearer {_session_token}"}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        markets = data.get("markets", [])
        results = []
        for m in markets:
            results.append({
                "source": "kalshi",
                "id": m.get("ticker", ""),
                "name": m.get("title", ""),
                "url": f"https://kalshi.com/markets/{m.get('ticker', '')}",
                "contracts": [
                    {"name": "Yes", "prob": (m.get("yes_ask", 0) + m.get("yes_bid", 0)) / 2 / 100},
                    {"name": "No", "prob": (m.get("no_ask", 0) + m.get("no_bid", 0)) / 2 / 100},
                ],
                "volume": m.get("volume", 0),
            })
        return results, resp.status_code, resp.elapsed.total_seconds() * 1000
    except requests.RequestException:
        raise


if __name__ == "__main__":
    if not config.KALSHI_ENABLED:
        print("Kalshi integration disabled. Set KALSHI_ENABLED=True in config.py to activate.")
    else:
        markets, _, _ = fetch_markets()
        print(f"Found {len(markets)} Kalshi sports markets")
