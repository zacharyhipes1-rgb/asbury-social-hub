import time
import requests
import config

BASE_URL = "https://api.the-odds-api.com/v4"
_quota_remaining = None
_quota_used = None


def _get(endpoint, params=None):
    global _quota_remaining, _quota_used
    if params is None:
        params = {}
    params["apiKey"] = config.ODDS_API_KEY

    url = f"{BASE_URL}{endpoint}"
    retries = 0
    while retries < 3:
        try:
            resp = requests.get(url, params=params, timeout=15)
            _quota_remaining = resp.headers.get("X-Requests-Remaining")
            _quota_used = resp.headers.get("X-Requests-Used")
            resp.raise_for_status()
            return resp.json(), resp.status_code, resp.elapsed.total_seconds() * 1000
        except requests.RequestException as exc:
            retries += 1
            if retries >= 3:
                raise
            time.sleep(2 ** retries)


def get_quota():
    return {"remaining": _quota_remaining, "used": _quota_used}


def fetch_sports():
    data, status, ms = _get("/sports")
    allowed = [s for s in data if s.get("key") in config.ALLOWED_SPORTS_API_KEYS and s.get("active")]
    return allowed, status, ms


def fetch_odds(sport_key):
    params = {
        "regions": "us",
        "markets": "h2h,spreads,totals",
        "oddsFormat": "american",
    }
    data, status, ms = _get(f"/sports/{sport_key}/odds", params)
    return data, status, ms


def fetch_all_odds():
    results = []
    sports, status, ms = fetch_sports()
    for sport in sports:
        try:
            events, s, m = fetch_odds(sport["key"])
            results.extend(events)
        except Exception:
            pass
    return results


if __name__ == "__main__":
    from calculator import american_to_implied_prob, remove_vig
    sports, _, _ = fetch_sports()
    print(f"Active sports in scope: {[s['key'] for s in sports]}")
    for sport in sports[:1]:
        events, _, _ = fetch_odds(sport["key"])
        if events:
            e = events[0]
            print(f"\n{e['home_team']} vs {e['away_team']} ({e['sport_key']})")
            for bk in e.get("bookmakers", [])[:3]:
                for mkt in bk.get("markets", []):
                    if mkt["key"] == "h2h":
                        probs = [american_to_implied_prob(o["price"]) for o in mkt["outcomes"]]
                        fair = remove_vig(probs)
                        names = [o["name"] for o in mkt["outcomes"]]
                        print(f"  {bk['title']}: {dict(zip(names, [f'{p:.1%}' for p in fair]))}")
    print(f"\nQuota: {get_quota()}")
