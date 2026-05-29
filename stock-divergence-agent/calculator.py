import math
import config


def price_gap_pct(current_price, analyst_target):
    if not current_price or current_price <= 0 or not analyst_target:
        return 0.0
    return ((analyst_target - current_price) / current_price) * 100


def net_insider_value(transactions):
    total = 0.0
    for t in transactions:
        kind = (t.get("type") or "").lower()
        value = abs(t.get("value", 0) or 0)
        shares = abs(t.get("shares", 0) or 0)
        price = abs(t.get("price", 0) or 0)
        amt = value if value > 0 else shares * price
        if kind in ("purchase", "buy", "p"):
            total += amt
        elif kind in ("sale", "sell", "s"):
            total -= amt
    return total


def price_change_pct(prices, days=30):
    if not prices or len(prices) < days:
        return 0.0
    newest = prices[0]
    oldest = prices[min(days - 1, len(prices) - 1)]
    if oldest <= 0:
        return 0.0
    return ((newest - oldest) / oldest) * 100


def realized_volatility(prices, days=30):
    if not prices or len(prices) < days + 1:
        return 0.0
    subset = prices[:days + 1]
    returns = []
    for i in range(len(subset) - 1):
        if subset[i + 1] > 0:
            returns.append(math.log(subset[i] / subset[i + 1]))
    if not returns:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / len(returns)
    daily_vol = math.sqrt(variance)
    annualized = daily_vol * math.sqrt(252)
    return annualized


def implied_vs_realized_ratio(implied_vol, realized_vol):
    if not realized_vol or realized_vol <= 0:
        return 0.0
    return implied_vol / realized_vol


def put_call_ratio(total_put_volume, total_call_volume):
    if not total_call_volume or total_call_volume <= 0:
        return 0.0
    return total_put_volume / total_call_volume


def analyst_consensus_score(strong_buy, buy, hold, sell, strong_sell):
    total = (strong_buy or 0) + (buy or 0) + (hold or 0) + (sell or 0) + (strong_sell or 0)
    if total == 0:
        return 3.0
    return (1 * (strong_buy or 0) + 2 * (buy or 0) + 3 * (hold or 0) +
            4 * (sell or 0) + 5 * (strong_sell or 0)) / total


def analyst_consensus_label(score):
    if score <= 1.5:
        return "Strong Buy"
    elif score <= 2.5:
        return "Buy"
    elif score <= 3.5:
        return "Hold"
    elif score <= 4.5:
        return "Sell"
    return "Strong Sell"


def detect_signals(ticker_data):
    signals = []
    td = ticker_data
    ticker = td.get("ticker", "")
    name = td.get("name", ticker)
    price = td.get("price", 0) or 0

    # --- Type 1: Analyst Target vs Price ---
    target = td.get("analyst_target")
    if target and price > 0:
        gap = price_gap_pct(price, target)
        if abs(gap) >= config.PRICE_GAP_THRESHOLD_PCT:
            sources = td.get("target_sources", 1)
            signals.append({
                "ticker": ticker,
                "company_name": name,
                "signal_type": "PRICE_GAP",
                "signal_label": "UNDERVALUED vs ANALYSTS" if gap > 0 else "OVERVALUED vs ANALYSTS",
                "current_price": price,
                "analyst_target": target,
                "gap_pct": gap,
                "confidence": config.CONFIDENCE_HIGH if sources >= 2 else config.CONFIDENCE_MEDIUM,
                "detail": td,
            })

    # --- Type 2: Insider Activity vs Price Trend ---
    insider_net = td.get("insider_net_value", 0)
    change_30d = td.get("price_change_30d", 0)

    if insider_net > config.INSIDER_BUY_THRESHOLD_USD and change_30d < config.PRICE_DECLINE_FOR_INSIDER_FLAG:
        signals.append({
            "ticker": ticker,
            "company_name": name,
            "signal_type": "INSIDER_DIVERGENCE",
            "signal_label": "INSIDER BUYING INTO WEAKNESS",
            "current_price": price,
            "net_insider_value": insider_net,
            "price_change_30d_pct": change_30d,
            "confidence": config.CONFIDENCE_HIGH,
            "detail": td,
        })
    elif insider_net < -config.INSIDER_SELL_THRESHOLD_USD and change_30d > config.PRICE_RISE_FOR_INSIDER_FLAG:
        signals.append({
            "ticker": ticker,
            "company_name": name,
            "signal_type": "INSIDER_DIVERGENCE",
            "signal_label": "INSIDER SELLING INTO STRENGTH",
            "current_price": price,
            "net_insider_value": insider_net,
            "price_change_30d_pct": change_30d,
            "confidence": config.CONFIDENCE_HIGH,
            "detail": td,
        })

    # --- Type 3: Short Interest ---
    short_pct = td.get("short_pct_float")
    if short_pct and short_pct * 100 >= config.SHORT_FLOAT_HIGH_PCT:
        label = "HIGH SHORT INTEREST"
        if short_pct * 100 >= config.SHORT_SQUEEZE_SETUP_PCT and change_30d > 5:
            label = "POTENTIAL SHORT SQUEEZE SETUP"
        signals.append({
            "ticker": ticker,
            "company_name": name,
            "signal_type": "SHORT_INTEREST",
            "signal_label": label,
            "current_price": price,
            "short_float_pct": short_pct * 100,
            "price_change_30d_pct": change_30d,
            "confidence": config.CONFIDENCE_MEDIUM,
            "detail": td,
        })

    # --- Type 4: Options IV vs Realized Vol ---
    iv = td.get("implied_vol", 0)
    rv = td.get("realized_vol", 0)
    pcr = td.get("put_call_ratio_val", 0)

    if iv > 0 and rv > 0:
        iv_ratio = implied_vs_realized_ratio(iv, rv)
        if iv_ratio >= config.IV_REALIZED_RATIO_THRESHOLD:
            signals.append({
                "ticker": ticker,
                "company_name": name,
                "signal_type": "VOLATILITY_MISMATCH",
                "signal_label": "OPTIONS PRICING BIG MOVE",
                "current_price": price,
                "implied_vol": iv,
                "realized_vol": rv,
                "iv_ratio": iv_ratio,
                "confidence": config.CONFIDENCE_MEDIUM,
                "detail": td,
            })

    if pcr >= config.PUT_CALL_RATIO_THRESHOLD:
        signals.append({
            "ticker": ticker,
            "company_name": name,
            "signal_type": "VOLATILITY_MISMATCH",
            "signal_label": "HEAVY PUT ACTIVITY",
            "current_price": price,
            "put_call_ratio": pcr,
            "confidence": config.CONFIDENCE_MEDIUM,
            "detail": td,
        })

    # --- Type 5: Multi-Source Consensus Conflict ---
    av_score = td.get("av_consensus_score")
    yf_rec = td.get("yf_recommendation", "")
    if av_score and yf_rec:
        av_label = analyst_consensus_label(av_score)
        bullish_labels = {"Strong Buy", "Buy"}
        bearish_labels = {"Sell", "Strong Sell"}
        yf_bullish = yf_rec.lower() in ("strong_buy", "buy")
        yf_bearish = yf_rec.lower() in ("sell", "strong_sell", "underperform")
        av_bullish = av_label in bullish_labels
        av_bearish = av_label in bearish_labels
        if (av_bullish and yf_bearish) or (av_bearish and yf_bullish):
            signals.append({
                "ticker": ticker,
                "company_name": name,
                "signal_type": "RATING_SPLIT",
                "signal_label": "ANALYST SOURCES DISAGREE",
                "current_price": price,
                "av_consensus": av_label,
                "yf_recommendation": yf_rec,
                "confidence": config.CONFIDENCE_LOW,
                "detail": td,
            })

    return signals
