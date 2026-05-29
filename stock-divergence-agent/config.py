# ─── API Keys ────────────────────────────────────────────────────────────────
ALPHA_VANTAGE_KEY = ""  # https://www.alphavantage.co/support/#api-key (free)
FRED_API_KEY = ""       # https://fred.stlouisfed.org/docs/api/api_key.html (free)
UNUSUAL_WHALES_KEY = ""

# ─── Feature Flags ───────────────────────────────────────────────────────────
UNUSUAL_WHALES_ENABLED = False
FINVIZ_ENABLED = True
SEC_EDGAR_ENABLED = True

# ─── Watchlist ───────────────────────────────────────────────────────────────
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
    # ETFs
    "SPY", "QQQ", "IWM", "DIA",
]

CUSTOM_WATCHLIST = []

FULL_WATCHLIST = list(set(WATCHLIST + CUSTOM_WATCHLIST))

# ─── Divergence Thresholds ───────────────────────────────────────────────────
PRICE_GAP_THRESHOLD_PCT = 15.0
INSIDER_BUY_THRESHOLD_USD = 100000
INSIDER_SELL_THRESHOLD_USD = 500000
SHORT_FLOAT_HIGH_PCT = 15.0
SHORT_SQUEEZE_SETUP_PCT = 10.0
IV_REALIZED_RATIO_THRESHOLD = 1.5
PUT_CALL_RATIO_THRESHOLD = 1.5
PRICE_DECLINE_FOR_INSIDER_FLAG = -5.0
PRICE_RISE_FOR_INSIDER_FLAG = 10.0

# ─── Confidence Levels ───────────────────────────────────────────────────────
CONFIDENCE_HIGH = "HIGH"
CONFIDENCE_MEDIUM = "MEDIUM"
CONFIDENCE_LOW = "LOW"

# ─── Scheduling ──────────────────────────────────────────────────────────────
REFRESH_INTERVAL_MINUTES = 60
EMAIL_SEND_TIME = "07:30"  # ET, before market open

# ─── Output Paths ────────────────────────────────────────────────────────────
DASHBOARD_OUTPUT_PATH = "dashboard.html"
DB_PATH = "stock_divergence_log.db"
CSV_EXPORT_PATH = "signals_export.csv"

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL = "INFO"
