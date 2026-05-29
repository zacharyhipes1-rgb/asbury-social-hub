import time
import requests
from bs4 import BeautifulSoup

import config

_cache = {}
_cache_time = {}
_CACHE_TTL = 14400  # 4 hours

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_finviz_data(ticker):
    if not config.FINVIZ_ENABLED:
        return None, 0, 0

    now = time.time()
    if ticker in _cache and (now - _cache_time.get(ticker, 0)) < _CACHE_TTL:
        return _cache[ticker], 200, 0

    url = f"https://finviz.com/quote.ashx?t={ticker}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        time.sleep(2)

        if resp.status_code == 403:
            time.sleep(120)
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                return None, resp.status_code, 0

        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        data = {}
        table = soup.find("table", class_="snapshot-table2")
        if not table:
            tables = soup.find_all("table")
            for t in tables:
                if t.find("td", string="Target Price"):
                    table = t
                    break

        if table:
            cells = table.find_all("td")
            for i in range(0, len(cells) - 1, 2):
                label = cells[i].get_text(strip=True)
                value = cells[i + 1].get_text(strip=True)
                if label == "Target Price":
                    data["target_price"] = _safe_float(value)
                elif label == "Recom":
                    data["recommendation"] = _safe_float(value)
                elif label == "Short Float":
                    data["short_float_pct"] = _safe_pct(value)
                elif label == "Insider Own":
                    data["insider_own_pct"] = _safe_pct(value)
                elif label == "Inst Own":
                    data["inst_own_pct"] = _safe_pct(value)
                elif label == "P/E":
                    data["pe_ratio"] = _safe_float(value)
                elif label == "Price":
                    data["price"] = _safe_float(value)

        data["ticker"] = ticker
        _cache[ticker] = data
        _cache_time[ticker] = now
        return data, resp.status_code, resp.elapsed.total_seconds() * 1000
    except Exception:
        return None, 0, 0


def _safe_float(s):
    try:
        return float(s.replace(",", ""))
    except (ValueError, TypeError, AttributeError):
        return None


def _safe_pct(s):
    try:
        return float(s.replace("%", "").replace(",", "")) / 100
    except (ValueError, TypeError, AttributeError):
        return None


if __name__ == "__main__":
    data, _, _ = fetch_finviz_data("AAPL")
    if data:
        print(f"AAPL Finviz:")
        for k, v in data.items():
            print(f"  {k}: {v}")
    else:
        print("Finviz data unavailable (may be rate limited)")
