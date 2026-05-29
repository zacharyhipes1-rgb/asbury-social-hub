# ─── API Keys ────────────────────────────────────────────────────────────────
ODDS_API_KEY = "aa603e87dee7d0c1bb4442535c5ca90a"
KALSHI_EMAIL = ""
KALSHI_PASSWORD = ""

# ─── Feature Flags ───────────────────────────────────────────────────────────
KALSHI_ENABLED = False
ESPN_ENABLED = True

# ─── Sports Scope ────────────────────────────────────────────────────────────
ALLOWED_SPORTS_API_KEYS = [
    "americanfootball_nfl",
    "americanfootball_ncaaf",
    "basketball_nba",
    "basketball_ncaab",
]

# ─── Prediction Market Inclusion Keywords ────────────────────────────────────
PREDICTION_MARKET_KEYWORDS_INCLUDE = [
    "nfl", "nba", "college football", "college basketball",
    "super bowl", "championship", "playoffs", "ncaa",
    "draft pick", "mvp", "heisman", "coach of the year",
    "finals", "championship series",
]

# ─── Exclusion Keywords (politics, non-US sports, esports) ───────────────────
EXCLUSION_KEYWORDS = [
    "president", "congress", "senate", "election", "governor",
    "party", "vote", "legislation", "bill", "political",
    "immigration", "tariff", "fed rate", "interest rate",
    "gdp", "inflation", "soccer", "esports", "esport",
    "league of legends", "dota", "fifa", "premier league",
    "champions league", "bundesliga", "la liga",
]

# ─── Thresholds ──────────────────────────────────────────────────────────────
DIVERGENCE_THRESHOLD_PERCENTAGE = 2.0
MINIMUM_PREDICTION_MARKET_VOLUME_USD = 10000
FUZZY_MATCH_THRESHOLD = 0.80

# ─── Scheduling ──────────────────────────────────────────────────────────────
REFRESH_INTERVAL_MINUTES = 60

# ─── Output Paths ────────────────────────────────────────────────────────────
DASHBOARD_OUTPUT_PATH = "dashboard.html"
DB_PATH = "divergence_log.db"
CSV_EXPORT_PATH = "opportunities_export.csv"

# ─── Logging ─────────────────────────────────────────────────────────────────
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR
