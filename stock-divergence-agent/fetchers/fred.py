import time
import requests
from datetime import datetime, timedelta

import config

BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

_cache = {}
_cache_time = {}
_CACHE_TTL = 86400  # 24 hours

SERIES = {
    "treasury_10y": "DGS10",
    "treasury_2y": "DGS2",
    "vix": "VIXCLS",
    "cpi": "CPIAUCSL",
    "unemployment": "UNRATE",
}


def _fetch_series(series_id):
    now = time.time()
    if series_id in _cache and (now - _cache_time.get(series_id, 0)) < _CACHE_TTL:
        return _cache[series_id], 200, 0

    end = datetime.utcnow().strftime("%Y-%m-%d")
    start = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

    try:
        resp = requests.get(BASE_URL, params={
            "series_id": series_id,
            "api_key": config.FRED_API_KEY,
            "file_type": "json",
            "observation_start": start,
            "observation_end": end,
            "sort_order": "desc",
            "limit": 10,
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        observations = data.get("observations", [])

        for obs in observations:
            if obs.get("value") and obs["value"] != ".":
                val = float(obs["value"])
                _cache[series_id] = val
                _cache_time[series_id] = now
                return val, resp.status_code, resp.elapsed.total_seconds() * 1000

        return None, resp.status_code, resp.elapsed.total_seconds() * 1000
    except (requests.RequestException, ValueError):
        return None, 0, 0


def fetch_macro_context():
    results = {}
    for key, series_id in SERIES.items():
        val, status, ms = _fetch_series(series_id)
        results[key] = val
        time.sleep(0.2)

    t10 = results.get("treasury_10y")
    t2 = results.get("treasury_2y")
    if t10 is not None and t2 is not None:
        results["yield_curve_spread"] = t10 - t2
        results["yield_curve_inverted"] = (t10 - t2) < 0
    else:
        results["yield_curve_spread"] = None
        results["yield_curve_inverted"] = None

    vix = results.get("vix")
    results["vix_elevated"] = vix is not None and vix > 25

    return results


if __name__ == "__main__":
    macro = fetch_macro_context()
    print("Macro context:")
    for k, v in macro.items():
        print(f"  {k}: {v}")
