import time
import re
import requests
from datetime import datetime, timedelta

import config

HEADERS = {"User-Agent": "DivergenceAgent/1.0 (zachary.hipes1@gmail.com)"}
SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"


def fetch_insider_filings(ticker):
    if not config.SEC_EDGAR_ENABLED:
        return [], 0, 0

    end = datetime.utcnow().strftime("%Y-%m-%d")
    start = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")

    try:
        resp = requests.get(SEARCH_URL, params={
            "q": f'"{ticker}"',
            "dateRange": "custom",
            "startdt": start,
            "enddt": end,
            "forms": "4",
        }, headers=HEADERS, timeout=15)
        time.sleep(0.2)

        if resp.status_code != 200:
            return [], resp.status_code, resp.elapsed.total_seconds() * 1000

        data = resp.json()
        hits = data.get("hits", {}).get("hits", [])

        filings = []
        for hit in hits[:20]:
            source = hit.get("_source", {})
            filings.append({
                "form": source.get("form_type", "4"),
                "filed": source.get("file_date", ""),
                "entity": source.get("entity_name", ""),
                "description": source.get("display_names", [""])[0] if source.get("display_names") else "",
            })

        return filings, resp.status_code, resp.elapsed.total_seconds() * 1000
    except Exception:
        return [], 0, 0


def count_recent_filings(ticker):
    filings, status, ms = fetch_insider_filings(ticker)
    return {
        "ticker": ticker,
        "form4_count_30d": len(filings),
        "filings": filings,
    }, status, ms


if __name__ == "__main__":
    data, _, _ = count_recent_filings("AAPL")
    print(f"AAPL: {data['form4_count_30d']} Form 4 filings in last 30 days")
    for f in data["filings"][:3]:
        print(f"  {f['filed']}: {f['entity']} - {f['description']}")
