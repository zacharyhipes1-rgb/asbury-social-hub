import time
import requests
import config

BASE_URL = "https://www.alphavantage.co/query"
_request_count = 0
_daily_limit = 23  # save 2 for retries


def _get(params):
    global _request_count
    if _request_count >= _daily_limit:
        raise RuntimeError("Alpha Vantage daily request limit reached. Skipping.")
    params["apikey"] = config.ALPHA_VANTAGE_KEY
    try:
        resp = requests.get(BASE_URL, params=params, timeout=15)
        _request_count += 1
        resp.raise_for_status()
        data = resp.json()
        if "Error Message" in data or "Note" in data:
            raise RuntimeError(data.get("Error Message") or data.get("Note", "Rate limited"))
        return data, resp.status_code, resp.elapsed.total_seconds() * 1000
    except requests.RequestException:
        raise


def get_request_count():
    return _request_count


def reset_request_count():
    global _request_count
    _request_count = 0


def fetch_quote(ticker):
    data, status, ms = _get({"function": "GLOBAL_QUOTE", "symbol": ticker})
    q = data.get("Global Quote", {})
    return {
        "ticker": ticker,
        "price": float(q.get("05. price", 0) or 0),
        "change_pct": float((q.get("10. change percent", "0%") or "0%").replace("%", "")),
        "volume": int(q.get("06. volume", 0) or 0),
        "previous_close": float(q.get("08. previous close", 0) or 0),
    }, status, ms


def fetch_overview(ticker):
    data, status, ms = _get({"function": "OVERVIEW", "symbol": ticker})
    if not data or "Symbol" not in data:
        return None, status, ms

    def safe_float(v):
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    def safe_int(v):
        try:
            return int(v)
        except (ValueError, TypeError):
            return 0

    return {
        "ticker": data.get("Symbol"),
        "name": data.get("Name", ""),
        "market_cap": safe_float(data.get("MarketCapitalization")),
        "pe_ratio": safe_float(data.get("PERatio")),
        "eps": safe_float(data.get("EPS")),
        "book_value": safe_float(data.get("BookValue")),
        "dividend_yield": safe_float(data.get("DividendYield")),
        "week_52_high": safe_float(data.get("52WeekHigh")),
        "week_52_low": safe_float(data.get("52WeekLow")),
        "ma_50": safe_float(data.get("50DayMovingAverage")),
        "ma_200": safe_float(data.get("200DayMovingAverage")),
        "analyst_target": safe_float(data.get("AnalystTargetPrice")),
        "analyst_strong_buy": safe_int(data.get("AnalystRatingStrongBuy")),
        "analyst_buy": safe_int(data.get("AnalystRatingBuy")),
        "analyst_hold": safe_int(data.get("AnalystRatingHold")),
        "analyst_sell": safe_int(data.get("AnalystRatingSell")),
        "analyst_strong_sell": safe_int(data.get("AnalystRatingStrongSell")),
        "beta": safe_float(data.get("Beta")),
    }, status, ms


def fetch_daily_prices(ticker, days=100):
    data, status, ms = _get({
        "function": "TIME_SERIES_DAILY",
        "symbol": ticker,
        "outputsize": "compact",
    })
    ts = data.get("Time Series (Daily)", {})
    prices = []
    for date in sorted(ts.keys(), reverse=True)[:days]:
        prices.append(float(ts[date]["4. close"]))
    return prices, status, ms


if __name__ == "__main__":
    q, _, _ = fetch_quote("AAPL")
    print(f"AAPL price: ${q['price']:.2f} ({q['change_pct']:+.2f}%)")
    o, _, _ = fetch_overview("AAPL")
    if o:
        print(f"  Analyst target: ${o['analyst_target']}")
        print(f"  P/E: {o['pe_ratio']}, EPS: {o['eps']}")
        print(f"  Ratings: {o['analyst_strong_buy']}SB {o['analyst_buy']}B {o['analyst_hold']}H {o['analyst_sell']}S {o['analyst_strong_sell']}SS")
    print(f"  Requests used: {get_request_count()}")
