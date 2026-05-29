# MASTER BUILD PROMPT: STOCK MARKET SIGNAL DIVERGENCE DETECTION AGENT

---

## ROLE AND OBJECTIVE

You are building a fully functional, production-ready divergence detection agent for the stock market. This agent is a **data tool, not a financial advisor**. It scans publicly available market data sources, identifies where pricing signals disagree across source types, and surfaces those mismatches to the user in plain language with full supporting data. The agent does not make buy/sell recommendations, does not execute trades, and does not manage portfolios. It is a **detection and reporting instrument only**.

The agent must be deployable from this single prompt with no follow-up questions required. Build everything: the data ingestion layer, calculation engine, logging system, scheduling logic, the HTML dashboard artifact, and a daily email digest. Document each step as you go so the user can follow the build sequence and maintain it afterward.

---

## TECH STACK

Use Python 3.9 or higher (must be compatible with macOS system Python). All dependencies must be installable via `pip3 install -r requirements.txt`. The dashboard output must be a single self-contained HTML file that can be opened in any browser without a server. The scheduler must be able to run as a standalone background process. Use SQLite for logging (no external database dependency). Structure the project as follows:

```
/stock-divergence-agent/
  main.py               # entry point and orchestrator
  config.py             # API keys, thresholds, watchlist, scope settings
  fetchers/
    __init__.py
    alpha_vantage.py    # Alpha Vantage integration (quotes, fundamentals)
    yahoo_finance.py    # Yahoo Finance integration (price, options, short interest)
    fred.py             # Federal Reserve Economic Data (macro indicators)
    sec_edgar.py        # SEC EDGAR insider trading filings
    finviz.py           # Finviz screener (analyst targets, ratings)
    unusual_whales.py   # Options flow anomalies (stub, optional)
  calculator.py         # divergence calculation engine
  logger.py             # SQLite logging
  dashboard.py          # HTML artifact generator
  emailer.py            # daily email digest
  scheduler.py          # hourly refresh logic
  run.command           # double-click launcher for macOS
  requirements.txt
  README.md             # full setup and deployment instructions
```

---

## DATA SOURCES, AUTHENTICATION, AND API DOCUMENTATION

### Source 1: Alpha Vantage

* **Purpose**: Primary source for real-time and daily stock quotes, company fundamentals (P/E, EPS, revenue), and earnings calendar.
* **Documentation**: https://www.alphavantage.co/documentation/
* **Base URL**: `https://www.alphavantage.co/query`
* **Authentication**: API key passed as query parameter `apikey`. Store in config.py as `ALPHA_VANTAGE_KEY`. Free tier provides 25 requests/day. Premium tier ($49.99/month) provides 75 requests/minute.
* **Endpoints to use**:
  * `function=GLOBAL_QUOTE&symbol={ticker}` — current price, change, volume for a single ticker.
  * `function=OVERVIEW&symbol={ticker}` — company fundamentals: MarketCap, PERatio, EPS, BookValue, DividendYield, 52WeekHigh, 52WeekLow, AnalystTargetPrice, AnalystRatingStrongBuy/Buy/Hold/Sell/StrongSell.
  * `function=EARNINGS&symbol={ticker}` — quarterly earnings history with estimates vs actuals (surprise %).
  * `function=TIME_SERIES_DAILY&symbol={ticker}&outputsize=compact` — last 100 daily closing prices for trend analysis.
* **Rate limiting**: Free tier is 25 requests/day total (not per endpoint). Implement a request counter that stops fetching and logs a warning when 23 requests have been used (save 2 for retries). On the premium tier, implement a 1-second delay between requests. Log each API call with its response code.
* **Response shape (OVERVIEW, simplified)**:
```json
{
  "Symbol": "AAPL",
  "Name": "Apple Inc",
  "MarketCapitalization": "2800000000000",
  "PERatio": "28.5",
  "EPS": "6.42",
  "BookValue": "4.25",
  "DividendYield": "0.0055",
  "52WeekHigh": "199.62",
  "52WeekLow": "164.08",
  "50DayMovingAverage": "185.30",
  "200DayMovingAverage": "178.50",
  "AnalystTargetPrice": "210.00",
  "AnalystRatingStrongBuy": "15",
  "AnalystRatingBuy": "22",
  "AnalystRatingHold": "8",
  "AnalystRatingSell": "2",
  "AnalystRatingStrongSell": "0"
}
```

### Source 2: Yahoo Finance (yfinance library)

* **Purpose**: Supplementary source for real-time quotes, options chain data (implied volatility, put/call ratios), short interest, and institutional holdings. No API key required.
* **Library**: `yfinance` (pip install yfinance). This is a widely-used Python wrapper around Yahoo Finance data.
* **Authentication**: None required. No API key needed.
* **Data to extract per ticker**:
  * `ticker.info` — currentPrice, targetMeanPrice, targetHighPrice, targetLowPrice, recommendationMean, recommendationKey, shortPercentOfFloat, heldPercentInsiders, heldPercentInstitutions, forwardPE, trailingPE, priceToBook, beta.
  * `ticker.options` — list of expiration dates. For the nearest expiration, pull the calls and puts chains to compute put/call ratio and aggregate implied volatility.
  * `ticker.institutional_holders` — top institutional holders and recent changes.
  * `ticker.insider_transactions` — recent insider buys/sells.
* **Rate limiting**: Yahoo Finance can throttle aggressive requests. Add a 0.5-second delay between ticker fetches. If a 429 response is received, back off for 60 seconds and retry once.
* **Fallback**: If yfinance fails for a ticker, log the error and continue. Yahoo data is supplementary; a single ticker failure must not crash the cycle.

### Source 3: FRED (Federal Reserve Economic Data)

* **Purpose**: Macro-economic context that helps interpret stock divergences. Rising rates, yield curve inversions, and inflation prints affect whether a divergence is structural or noise.
* **Documentation**: https://fred.stlouisfed.org/docs/api/fred/
* **Base URL**: `https://api.stlouisfed.org/fred/series/observations`
* **Authentication**: API key passed as query parameter `api_key`. Store in config.py as `FRED_API_KEY`. Free — register at https://fred.stlouisfed.org/docs/api/api_key.html.
* **Series to pull**:
  * `DGS10` — 10-Year Treasury yield
  * `DGS2` — 2-Year Treasury yield (compute 10Y-2Y spread for yield curve)
  * `VIXCLS` — CBOE Volatility Index (VIX)
  * `CPIAUCSL` — Consumer Price Index (inflation)
  * `UNRATE` — Unemployment rate
* **Use**: Display these as context indicators on the dashboard and in the email. If VIX is elevated (>25), note it as a market stress flag. If yield curve is inverted (10Y-2Y < 0), note it. These do not generate divergence signals themselves — they provide backdrop.
* **Refresh**: These move slowly. Fetch once per day maximum. Cache locally and reuse within the same day.

### Source 4: SEC EDGAR (Insider Trading Filings)

* **Purpose**: Detect insider buying/selling activity that diverges from analyst consensus or current price trend. Insider buying during a price decline or when analysts are bearish is a meaningful signal.
* **Documentation**: https://www.sec.gov/edgar/sec-api-documentation
* **Base URL**: `https://efts.sec.gov/LATEST/search-index?q=`
* **Full-text search endpoint**: `https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&dateRange=custom&startdt={30_days_ago}&enddt={today}&forms=4`
* **Alternative (structured)**: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=4&dateb=&owner=include&count=10&search_text=&action=getcompany`
* **Authentication**: None required. Use a User-Agent header: `DivergenceAgent/1.0 (zachary.hipes1@gmail.com)` — SEC requires a contact email in the User-Agent.
* **Rate limiting**: SEC asks for no more than 10 requests per second. Implement a 0.2-second delay between requests.
* **Data to extract**: For each Form 4 filing, extract: insider name, title, transaction type (Purchase/Sale), shares, price, date. Aggregate net insider buying (purchases minus sales in dollars) over the last 30 days.
* **Signal**: If net insider buying is positive (insiders are buying) while the stock price is declining or analyst targets are below current price, flag as a divergence.

### Source 5: Finviz (Analyst Consensus Scraping)

* **Purpose**: Quick-lookup analyst price targets, consensus ratings, and key metrics for cross-referencing against Alpha Vantage and Yahoo Finance.
* **URL pattern**: `https://finviz.com/quote.ashx?t={ticker}`
* **Authentication**: None required. Use a browser-style User-Agent header.
* **Method**: HTTP GET with `requests` + parse the HTML response for key data fields. Finviz embeds structured data in a predictable HTML table format.
* **Data to extract**: Target price, analyst recommendation (1.0=Strong Buy to 5.0=Strong Sell), short float %, insider ownership %, institutional ownership %.
* **Rate limiting**: Finviz blocks aggressive scraping. Add a 2-second delay between requests. If blocked (403 response), wait 120 seconds and retry once. Cache results for 4 hours.
* **Fallback**: If Finviz is unavailable, the agent continues without it. Finviz data is for cross-referencing, not primary signals.

### Source 6: Unusual Whales (Optional, include as stub)

* **Purpose**: Options flow anomaly detection — large unusual options trades that may signal informed positioning.
* **Documentation**: https://docs.unusualwhales.com/
* **Authentication**: Requires paid subscription and API key. Store as `UNUSUAL_WHALES_KEY` in config.py.
* **Build this as a stub**: Implement the fetch function but gate activation behind `UNUSUAL_WHALES_ENABLED = True/False` in config.py. If disabled, log: "Unusual Whales integration disabled. Set UNUSUAL_WHALES_ENABLED=True in config.py to activate."

---

## WATCHLIST CONFIGURATION

The agent monitors a user-defined watchlist rather than scanning the entire market. This keeps API usage manageable and results focused. Hardcode a default watchlist in `config.py` but make it easy to customize:

```python
WATCHLIST = [
    # Mega-cap tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
    # Financials
    "JPM", "BAC", "GS", "V", "MA",
    # Healthcare
    "UNH", "JNJ", "PFE", "ABBV",
    # Energy
    "XOM", "CVX", "COP",
    # Consumer
    "WMT", "COST", "HD", "MCD",
    # Industrials
    "CAT", "BA", "GE", "UPS",
    # ETFs (broad market context)
    "SPY", "QQQ", "IWM", "DIA",
]

# User can add custom tickers here
CUSTOM_WATCHLIST = []

# Combined watchlist
FULL_WATCHLIST = list(set(WATCHLIST + CUSTOM_WATCHLIST))
```

---

## DIVERGENCE TYPES TO DETECT

The agent must detect and surface the following five types of signal divergences. Each one represents a different kind of disagreement between data sources.

### Type 1: Analyst Target vs Current Price (PRICE GAP)

* **What**: Analyst consensus price target is significantly above or below the current trading price.
* **Calculation**: `gap_pct = ((analyst_target - current_price) / current_price) * 100`
* **Flag if**: `abs(gap_pct) >= 15%` — meaning analysts collectively think the stock should be at least 15% higher or lower than where it trades.
* **Label**: "UNDERVALUED vs ANALYSTS" (target above price) or "OVERVALUED vs ANALYSTS" (target below price).
* **Cross-reference**: Check if the analyst consensus direction (Buy/Hold/Sell) aligns with the price gap. If target says +20% but consensus is "Hold" or "Sell", flag as a contradictory signal.

### Type 2: Insider Activity vs Price Trend (INSIDER DIVERGENCE)

* **What**: Corporate insiders (officers, directors) are buying shares while the stock price is declining, or selling shares while the price is rising.
* **Calculation**: Compute net insider transaction value over last 30 days (buys minus sells in $). Compute 30-day price change %.
* **Flag if**: Net insider buying > $100,000 AND 30-day price change < -5% (insiders buying the dip). OR: Net insider selling > $500,000 AND 30-day price change > +10% (insiders selling into strength).
* **Label**: "INSIDER BUYING INTO WEAKNESS" or "INSIDER SELLING INTO STRENGTH".

### Type 3: Short Interest Anomaly (SHORT SQUEEZE SIGNAL)

* **What**: Short interest (% of float sold short) is abnormally high relative to the stock's historical short interest, or is rising while the stock price is also rising (short squeeze setup).
* **Calculation**: `short_float_pct` from Yahoo Finance or Finviz.
* **Flag if**: `short_float_pct >= 15%` — high short interest. Also flag if short interest > 10% AND the stock is up > 5% in the last 30 days (shorts may be getting squeezed).
* **Label**: "HIGH SHORT INTEREST" or "POTENTIAL SHORT SQUEEZE SETUP".

### Type 4: Options-Implied vs Historical Volatility (VOLATILITY MISMATCH)

* **What**: The options market is pricing in significantly more (or less) future movement than the stock has historically exhibited.
* **Calculation**: Pull aggregate implied volatility from nearest-expiry options chain (average IV across at-the-money calls and puts). Compare to beta or 30-day realized volatility from price history.
* **Flag if**: Implied volatility is more than 1.5x the 30-day realized volatility (options are pricing a big move the stock hasn't shown yet). OR: Put/call ratio exceeds 1.5 (heavy put buying, bearish positioning).
* **Label**: "OPTIONS PRICING BIG MOVE" or "HEAVY PUT ACTIVITY".

### Type 5: Multi-Source Consensus Conflict (RATING SPLIT)

* **What**: Different data sources disagree on the same stock's direction.
* **Calculation**: Compare analyst rating from Alpha Vantage vs Yahoo Finance vs Finviz. If one source says "Strong Buy" and another says "Hold" or "Sell", flag it.
* **Also check**: If analyst consensus is bullish (target > current price by 15%+) but institutional holders are decreasing positions, or vice versa.
* **Label**: "ANALYST SOURCES DISAGREE" or "INSTITUTIONS DIVERGE FROM ANALYSTS".

---

## CALCULATION ENGINE (calculator.py)

Build `calculator.py` with the following exact logic:

```python
def price_gap_pct(current_price: float, analyst_target: float) -> float:
    """Returns percentage gap between analyst target and current price.
    Positive = target above current (undervalued per analysts).
    Negative = target below current (overvalued per analysts)."""
    if current_price <= 0:
        return 0.0
    return ((analyst_target - current_price) / current_price) * 100

def net_insider_value(transactions: list) -> float:
    """Sum of (buy_value - sell_value) from insider transactions.
    Positive = net buying. Negative = net selling."""
    total = 0.0
    for t in transactions:
        if t["type"].lower() in ("purchase", "buy", "p"):
            total += t["shares"] * t["price"]
        elif t["type"].lower() in ("sale", "sell", "s"):
            total -= t["shares"] * t["price"]
    return total

def price_change_pct(prices: list, days: int = 30) -> float:
    """Percentage change over the last N trading days from a list of closing prices (newest first)."""
    if len(prices) < days:
        return 0.0
    return ((prices[0] - prices[days - 1]) / prices[days - 1]) * 100

def implied_vs_realized_ratio(implied_vol: float, realized_vol: float) -> float:
    """Ratio of implied volatility to realized volatility.
    Above 1.5 = options pricing significantly more movement than historical."""
    if realized_vol <= 0:
        return 0.0
    return implied_vol / realized_vol

def put_call_ratio(total_put_volume: int, total_call_volume: int) -> float:
    """Put/call volume ratio. Above 1.0 = more puts than calls (bearish lean)."""
    if total_call_volume <= 0:
        return 0.0
    return total_put_volume / total_call_volume

def analyst_consensus_score(strong_buy: int, buy: int, hold: int, sell: int, strong_sell: int) -> float:
    """Weighted score: 1.0 = Strong Buy, 5.0 = Strong Sell."""
    total = strong_buy + buy + hold + sell + strong_sell
    if total == 0:
        return 3.0
    return (1*strong_buy + 2*buy + 3*hold + 4*sell + 5*strong_sell) / total

def analyst_consensus_label(score: float) -> str:
    if score <= 1.5:
        return "Strong Buy"
    elif score <= 2.5:
        return "Buy"
    elif score <= 3.5:
        return "Hold"
    elif score <= 4.5:
        return "Sell"
    else:
        return "Strong Sell"
```

---

## DATABASE SCHEMA AND LOGGING

Use SQLite. Database file: `stock_divergence_log.db`. Create these tables on first run:

```sql
CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ticker TEXT NOT NULL,
    company_name TEXT,
    signal_type TEXT NOT NULL,
    signal_label TEXT NOT NULL,
    current_price REAL,
    analyst_target REAL,
    gap_pct REAL,
    short_float_pct REAL,
    net_insider_value REAL,
    price_change_30d_pct REAL,
    implied_vol REAL,
    realized_vol REAL,
    put_call_ratio REAL,
    analyst_consensus_score REAL,
    analyst_consensus_label TEXT,
    sportsbook_count INTEGER,
    detail_json TEXT,
    flag_reason TEXT,
    confidence TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS api_health_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS refresh_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    tickers_scanned INTEGER,
    signals_found INTEGER,
    errors INTEGER
);

CREATE TABLE IF NOT EXISTS macro_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    treasury_10y REAL,
    treasury_2y REAL,
    yield_curve_spread REAL,
    vix REAL,
    cpi_latest REAL,
    unemployment_rate REAL
);
```

Also maintain a rolling CSV export: `signals_export.csv` overwritten each cycle with all `is_active = TRUE` signals from the last 7 days.

---

## SCHEDULING LOGIC

Same pattern as the sports agent. Use Python `schedule` library. The main loop runs every 60 minutes. On startup, run one immediate cycle.

**Important timing note for stock data**: The stock market is open 9:30 AM - 4:00 PM ET, Monday-Friday. The agent should still run 24/7 (pre-market and after-hours data is valuable), but log whether each cycle ran during market hours or outside them.

Wire the email digest to send once daily at 7:30 AM ET (before market open), so the user has fresh signals before trading begins.

---

## HTML DASHBOARD DESIGN SPECIFICATIONS

Generate a single self-contained HTML file: `dashboard.html`.

### Visual Requirements — MUST match this exact design system:

* **Fonts**: Load Inter from Google Fonts: `https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap`. Only external dependency permitted.
* **Background**: `#0f1117` (near-black)
* **Surface cards**: `#1a1d2e` (dark navy)
* **Accent — undervalued/bullish signals**: `#00d4ff` (electric cyan)
* **Accent — overvalued/bearish signals**: `#ff6b35` (orange-red)
* **Accent — neutral/informational**: `#a855f7` (purple)
* **Text primary**: `#ffffff`
* **Text secondary**: `#8b8fa8`
* **Border/divider**: `#2a2d3e`

### Layout

**Top header bar**:
* Agent name: "STOCK DIVERGENCE DETECTOR"
* Last updated timestamp
* Next refresh countdown (JavaScript timer)
* Summary stats: tickers scanned, signals flagged, strongest signal

**Macro context bar** (below header):
* 10Y Treasury yield, VIX level, yield curve status (normal/inverted), market status (open/closed/pre-market)
* Color-code: VIX > 25 = orange-red background, yield curve inverted = orange-red background

**Signal cards** (one per flagged signal, sorted by signal strength descending):

Each card must contain the following in plain language:

**Line 1 (headline)**: Ticker + company name in large bold text. Example: `AAPL — Apple Inc`

**Line 2 (signal tag)**: Color-coded badge. Examples: `UNDERVALUED vs ANALYSTS`, `INSIDER BUYING INTO WEAKNESS`, `HIGH SHORT INTEREST`, `OPTIONS PRICING BIG MOVE`, `ANALYST SOURCES DISAGREE`

**Line 3 (plain language summary)**: One or two sentences a non-expert can understand. Examples:
* "Wall Street analysts think Apple should be trading at $210, but it's currently at $175. That's a 20% gap — they think it's significantly undervalued."
* "Corporate insiders have bought $2.3M worth of Boeing stock in the last 30 days, even though the price has dropped 12%. They're buying while others are selling."
* "23% of Tesla's tradable shares are sold short. That's very high. Meanwhile the stock is up 8% this month — shorts may be getting squeezed."

**Line 4 (the numbers)**: Key metrics displayed prominently:
* Current price
* Analyst target (if applicable)
* Gap / divergence percentage in large colored text
* Short float %, insider net value, IV ratio — whichever is relevant to the signal type

**Line 5 (supporting context)**:
* 30-day price change
* Analyst consensus rating and score
* Volume or liquidity indicator
* Data source(s) used

### Visual treatment:
* Signals with gap >= 25% or extreme readings get a glowing border
* Signals with gap 15-24.9% get an accent-colored left border
* Each card has a badge: signal type in the accent color

### No Signals State
Centered message: "No divergences above threshold detected. All watchlist stocks look consistently priced across sources. Check back next refresh."

### Bottom of Dashboard
* Full log table: last 100 signals in a sortable HTML table (vanilla JS sort on column click)
* API health indicators for each source
* Remaining Alpha Vantage quota
* Macro context history (last 7 days of VIX, yield curve)

**Self-contained requirement**: Embed all CSS and JavaScript inline. No external libraries except Google Fonts.

---

## EMAIL DIGEST SPECIFICATIONS

Build `emailer.py` that sends a styled HTML email daily at 7:30 AM ET.

**Email must include**:
1. **Summary bar**: total signals, strongest signal, market context (VIX, yield curve)
2. **"How to read this" legend**: explaining signal types and color coding
3. **Each signal as its own card** (same visual language as dashboard):
   * Clear tag: UNDERVALUED / OVERVALUED / INSIDER DIVERGENCE / SHORT SQUEEZE / etc.
   * Plain English explanation
   * The numbers side by side
   * Confidence level
4. **Macro backdrop section**: Treasury yields, VIX, yield curve status
5. **Footer disclaimer**: "This is market data only. Not financial advice. Not a recommendation to buy or sell any security."

**Email config**:
```python
EMAIL_TO = "zachary.hipes1@gmail.com"
EMAIL_FROM = "zachary.hipes1@gmail.com"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "zachary.hipes1@gmail.com"
SMTP_PASSWORD = ""  # Gmail App Password goes here
```

On first run, if SMTP_PASSWORD is empty, print: "Email not configured. Set SMTP_PASSWORD in emailer.py with a Gmail App Password to activate daily digests."

---

## THRESHOLDS AND CONFIGURATION

All thresholds in `config.py`:

```python
# Divergence thresholds
PRICE_GAP_THRESHOLD_PCT = 15.0          # Analyst target vs price gap minimum
INSIDER_BUY_THRESHOLD_USD = 100000      # Minimum net insider buying to flag
INSIDER_SELL_THRESHOLD_USD = 500000     # Minimum net insider selling to flag
SHORT_FLOAT_HIGH_PCT = 15.0             # High short interest threshold
SHORT_SQUEEZE_SETUP_PCT = 10.0          # Short interest + rising price threshold
IV_REALIZED_RATIO_THRESHOLD = 1.5       # Implied vol / realized vol ratio
PUT_CALL_RATIO_THRESHOLD = 1.5          # Bearish options threshold
PRICE_DECLINE_FOR_INSIDER_FLAG = -5.0   # 30-day decline % to flag insider buying
PRICE_RISE_FOR_INSIDER_FLAG = 10.0      # 30-day rise % to flag insider selling

# Confidence levels
CONFIDENCE_HIGH = "HIGH"      # Multiple sources agree
CONFIDENCE_MEDIUM = "MEDIUM"  # Two sources agree or one strong signal
CONFIDENCE_LOW = "LOW"        # Single source, possible data quality issue
```

---

## ERROR HANDLING REQUIREMENTS

Every API call must be wrapped in try/except. On failure:

1. Log the error to `api_health_log`.
2. Continue the cycle with available data.
3. Never crash the main loop due to a single source failure.
4. If Alpha Vantage fails, surface a banner on the dashboard: "Primary data source unavailable. Showing last known data."
5. If a ticker fails across all sources, skip it and note it in the log.
6. If the database write fails, fall back to `emergency_log.csv`.

Implement a `DataSourceHealth` class tracking consecutive failures. 3 consecutive failures for any source prints: `WARNING: [source] has failed 3 consecutive cycles.`

---

## macOS INTEGRATION

1. **Auto-open dashboard**: After each cycle, automatically open `dashboard.html` in the default browser using `webbrowser.open()`.
2. **macOS notification**: After each cycle, send a macOS notification via `osascript` with summary: "{N} signals found across {M} tickers. Dashboard ready."
3. **Double-click launcher**: Create `run.command` (chmod +x) that runs a single cycle and opens the dashboard.
4. **Background mode**: Document how to run with `nohup python3 scheduler.py > agent.log 2>&1 &`

---

## REQUIREMENTS.TXT

```
requests==2.31.0
schedule==1.2.1
python-dateutil==2.8.2
jinja2==3.1.2
yfinance==0.2.31
beautifulsoup4==4.12.2
lxml==4.9.3
```

No pandas, no numpy, no heavy dependencies. Keep it lean. Use yfinance for Yahoo data, beautifulsoup4 for Finviz HTML parsing.

---

## STEP-BY-STEP BUILD ROADMAP

Build in this exact order. Complete each step fully before moving to the next.

**Step 1**: Create project directory structure. Create all files as empty stubs. Install dependencies.

**Step 2**: Build `config.py` with all default values, watchlist, and thresholds.

**Step 3**: Build `fetchers/alpha_vantage.py`. Implement GLOBAL_QUOTE, OVERVIEW, EARNINGS, and TIME_SERIES_DAILY fetches. Include request counter for quota tracking. Write a standalone test that fetches AAPL data and prints key metrics.

**Step 4**: Build `fetchers/yahoo_finance.py`. Implement ticker info fetch, options chain parsing (IV calculation, put/call ratio), insider transactions, and institutional holders. Write a standalone test.

**Step 5**: Build `fetchers/fred.py`. Implement macro indicator fetches (10Y, 2Y, VIX, CPI, unemployment). Cache results for 24 hours. Write a standalone test.

**Step 6**: Build `fetchers/sec_edgar.py`. Implement Form 4 filing search and insider transaction parsing. Write a standalone test.

**Step 7**: Build `fetchers/finviz.py`. Implement HTML scraping for analyst target, recommendation, short float. Write a standalone test.

**Step 8**: Build `fetchers/unusual_whales.py` as a stub with activation gate.

**Step 9**: Build `calculator.py` with all divergence calculation functions. Write unit tests with known inputs and expected outputs.

**Step 10**: Build `logger.py`. Create SQLite database, all tables, and logging functions. Test read/write.

**Step 11**: Build `dashboard.py`. Create the full HTML template with all design specs. Test with hardcoded sample data before connecting to live sources.

**Step 12**: Build `emailer.py`. Create the styled HTML email template with all signal types, macro context, and disclaimer. Test by sending a sample email.

**Step 13**: Build `main.py` as the orchestrator. Wire all modules together. Run one full cycle manually and verify the pipeline end to end.

**Step 14**: Build `scheduler.py`. Add the hourly loop + daily 7:30 AM email. Test with a short interval.

**Step 15**: Create `run.command` double-click launcher. Create `README.md` with full setup instructions.

**Step 16**: Final review. Verify: no hardcoded values outside config.py, all error paths handled, dashboard renders correctly with populated and empty states, email sends correctly, CSV export works, macOS notification fires.

---

## FINAL CONSTRAINTS AND GUARDRAILS

* The agent **never surfaces a recommendation** to buy or sell any security. If any output text approaches a recommendation, rewrite it to be purely descriptive: "Analysts target $210 vs current $175" — not "You should buy."
* The agent **never executes trades**, accesses any brokerage account, or interacts with any trading platform.
* Every signal surfaced must show its **data sources and calculation** so the user can verify independently.
* The phrases **"you should buy"**, **"you should sell"**, **"we recommend"**, or any variant must **never appear** anywhere in the codebase, dashboard, email, or logs.
* All signals must include a **confidence level** (HIGH/MEDIUM/LOW) based on how many independent sources confirm the signal.
* All times on the dashboard must show **user's local timezone** via JavaScript `toLocaleString()`.
* The **disclaimer** "This is market data only. Not financial advice. Not a recommendation to buy or sell any security." must appear on both the dashboard and every email.
* If two sources provide the same metric (e.g., analyst target from both Alpha Vantage and Yahoo Finance), average them and note both sources rather than picking one.

---

## API KEYS THE USER WILL NEED

| Source | How to get | Cost |
|---|---|---|
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | Free (25 req/day) or $49.99/mo |
| FRED | https://fred.stlouisfed.org/docs/api/api_key.html | Free |
| Yahoo Finance | No key needed (yfinance library) | Free |
| SEC EDGAR | No key needed (public API) | Free |
| Finviz | No key needed (HTML scraping) | Free |
| Unusual Whales | https://unusualwhales.com/ (optional) | Paid subscription |

The agent is fully functional with just **Alpha Vantage (free)** and **FRED (free)**. All other sources enhance but are not required.

---

## EMAIL CONFIGURATION

The user's email delivery settings (copy these exactly):

```python
EMAIL_TO = "zachary.hipes1@gmail.com"
EMAIL_FROM = "zachary.hipes1@gmail.com"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "zachary.hipes1@gmail.com"
SMTP_PASSWORD = ""  # User will provide Gmail App Password
```

---

Begin building now. Follow the step-by-step roadmap in order. After completing each step, print a brief confirmation before starting the next. Auto-open the dashboard in the browser after the first successful cycle. Send a test email after emailer.py is built. Make everything work with a single `python3 main.py` command.
