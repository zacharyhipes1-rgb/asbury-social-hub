import time
import yfinance as yf

_DELAY = 0.5


def fetch_ticker_info(ticker):
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        time.sleep(_DELAY)
        return {
            "ticker": ticker,
            "price": info.get("currentPrice") or info.get("regularMarketPrice", 0),
            "target_mean": info.get("targetMeanPrice"),
            "target_high": info.get("targetHighPrice"),
            "target_low": info.get("targetLowPrice"),
            "recommendation": info.get("recommendationKey", ""),
            "recommendation_mean": info.get("recommendationMean"),
            "short_pct_float": info.get("shortPercentOfFloat"),
            "short_ratio": info.get("shortRatio"),
            "held_pct_insiders": info.get("heldPercentInsiders"),
            "held_pct_institutions": info.get("heldPercentInstitutions"),
            "forward_pe": info.get("forwardPE"),
            "trailing_pe": info.get("trailingPE"),
            "price_to_book": info.get("priceToBook"),
            "beta": info.get("beta"),
            "market_cap": info.get("marketCap"),
            "name": info.get("shortName") or info.get("longName", ticker),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
        }, 200, 0
    except Exception as exc:
        return None, 0, 0


def fetch_options_data(ticker):
    try:
        t = yf.Ticker(ticker)
        expirations = t.options
        if not expirations:
            return None, 200, 0

        nearest = expirations[0]
        chain = t.option_chain(nearest)
        calls = chain.calls
        puts = chain.puts

        total_call_vol = int(calls["volume"].sum()) if "volume" in calls.columns else 0
        total_put_vol = int(puts["volume"].sum()) if "volume" in puts.columns else 0

        call_ivs = calls["impliedVolatility"].dropna().tolist() if "impliedVolatility" in calls.columns else []
        put_ivs = puts["impliedVolatility"].dropna().tolist() if "impliedVolatility" in puts.columns else []
        all_ivs = call_ivs + put_ivs
        avg_iv = sum(all_ivs) / len(all_ivs) if all_ivs else 0

        total_call_oi = int(calls["openInterest"].sum()) if "openInterest" in calls.columns else 0
        total_put_oi = int(puts["openInterest"].sum()) if "openInterest" in puts.columns else 0

        time.sleep(_DELAY)
        return {
            "ticker": ticker,
            "expiration": nearest,
            "call_volume": total_call_vol,
            "put_volume": total_put_vol,
            "call_oi": total_call_oi,
            "put_oi": total_put_oi,
            "avg_implied_vol": avg_iv,
        }, 200, 0
    except Exception:
        return None, 0, 0


def fetch_insider_transactions(ticker):
    try:
        t = yf.Ticker(ticker)
        insiders = t.insider_transactions
        if insiders is None or insiders.empty:
            return [], 200, 0
        txns = []
        for _, row in insiders.iterrows():
            txn_type = str(row.get("Text", "")).lower()
            shares = abs(row.get("Shares", 0) or 0)
            value = abs(row.get("Value", 0) or 0)
            if "purchase" in txn_type or "buy" in txn_type:
                kind = "purchase"
            elif "sale" in txn_type or "sell" in txn_type:
                kind = "sale"
            else:
                continue
            txns.append({
                "insider": row.get("Insider", ""),
                "type": kind,
                "shares": shares,
                "value": value,
                "date": str(row.get("Start Date", "")),
            })
        time.sleep(_DELAY)
        return txns, 200, 0
    except Exception:
        return [], 0, 0


def fetch_price_history(ticker, period="3mo"):
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period)
        if hist.empty:
            return [], 200, 0
        prices = hist["Close"].tolist()
        prices.reverse()  # newest first
        time.sleep(_DELAY)
        return prices, 200, 0
    except Exception:
        return [], 0, 0


if __name__ == "__main__":
    info, _, _ = fetch_ticker_info("AAPL")
    if info:
        print(f"AAPL: ${info['price']:.2f}")
        print(f"  Target: ${info['target_mean']} (low ${info['target_low']} / high ${info['target_high']})")
        print(f"  Short float: {(info['short_pct_float'] or 0)*100:.1f}%")
        print(f"  Recommendation: {info['recommendation']}")
    opts, _, _ = fetch_options_data("AAPL")
    if opts:
        pcr = opts["put_volume"] / max(opts["call_volume"], 1)
        print(f"  Options P/C ratio: {pcr:.2f}, IV: {opts['avg_implied_vol']:.2f}")
