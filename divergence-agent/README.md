# Divergence Detector

A detection and reporting agent that identifies pricing mismatches between sportsbook odds and prediction markets. This is a data tool, not a gambling advisor. It does not make picks, recommend sides, or place bets.

## Prerequisites

- Python 3.11 or higher
- pip

## Setup

### 1. Install dependencies

```bash
cd divergence-agent
pip install -r requirements.txt
```

### 2. Get an Odds API key

Sign up at [https://the-odds-api.com/](https://the-odds-api.com/).

- **Free tier**: 500 requests/month. Enough for testing (~4 requests per cycle x 4 sports = ~16 requests per run).
- **Developer tier** (~$20/month): Recommended for hourly polling. Covers months of continuous operation.

### 3. Configure

Open `config.py` and set your API key:

```python
ODDS_API_KEY = "your_actual_key_here"
```

Key settings:

| Variable | Default | Description |
|---|---|---|
| `ODDS_API_KEY` | `""` | Your Odds API key |
| `KALSHI_ENABLED` | `False` | Enable Kalshi integration (requires account) |
| `ESPN_ENABLED` | `True` | Pull injury/context data from ESPN |
| `DIVERGENCE_THRESHOLD_PERCENTAGE` | `2.0` | Minimum divergence (percentage points) to flag |
| `MINIMUM_PREDICTION_MARKET_VOLUME_USD` | `10000` | Polymarket minimum volume filter |
| `REFRESH_INTERVAL_MINUTES` | `60` | How often the scheduler runs a cycle |
| `FUZZY_MATCH_THRESHOLD` | `0.80` | Event matching confidence floor |

## Running

### One-off cycle

```bash
python main.py
```

Runs a single fetch-calculate-render cycle and exits. Dashboard is written to `dashboard.html`.

### Continuous scheduler

```bash
python scheduler.py
```

Runs an immediate cycle, then repeats every `REFRESH_INTERVAL_MINUTES` minutes.

### Background process (Mac/Linux)

```bash
nohup python scheduler.py > agent.log 2>&1 &
```

Check logs: `tail -f agent.log`

## Viewing the Dashboard

Open `dashboard.html` in any browser. No server required. The file is self-contained (only external dependency is Google Fonts for the Inter typeface).

The dashboard shows:
- Flagged opportunities sorted by divergence magnitude
- Plain-language explanations of each mismatch
- A sortable log table of the last 50 flagged items
- API health indicators for each data source
- Remaining Odds API quota

## CSV Export

Each cycle writes `opportunities_export.csv` with all active opportunities from the last 7 days. Import directly into Excel or Google Sheets.

## Adjusting the Divergence Threshold

In `config.py`, change:

```python
DIVERGENCE_THRESHOLD_PERCENTAGE = 2.0  # percentage points
```

Lower values surface more (smaller) mismatches. Higher values show only large gaps.

## Enabling Kalshi

1. Create a Kalshi account at [https://kalshi.com/](https://kalshi.com/)
2. In `config.py`, set:

```python
KALSHI_ENABLED = True
KALSHI_EMAIL = "your@email.com"
KALSHI_PASSWORD = "your_password"
```

## Data Sources

| Source | Auth | Purpose |
|---|---|---|
| The Odds API | API key (required) | Live sportsbook odds across US bookmakers |
| PredictIt | None | Prediction market pricing for sports-adjacent events |
| Polymarket | None | Higher-liquidity prediction market (Gamma API) |
| ESPN | None | Event validation, injury data, game context |
| Kalshi | Email/password (optional) | CFTC-regulated prediction market |

## Project Structure

```
divergence-agent/
  main.py               # Entry point and orchestrator
  config.py             # All configurable values
  calculator.py         # Odds conversion, matching, divergence math
  logger.py             # SQLite logging and CSV export
  dashboard.py          # HTML dashboard generator
  scheduler.py          # Hourly refresh loop
  fetchers/
    odds_api.py         # The Odds API integration
    predictit.py        # PredictIt integration
    polymarket.py       # Polymarket integration
    espn.py             # ESPN feed integration
    kalshi.py           # Kalshi stub (activate via config)
  divergence_log.db     # SQLite database (auto-created)
  dashboard.html        # Generated dashboard (auto-created)
  opportunities_export.csv  # CSV export (auto-created)
```

## Troubleshooting

- **"WARNING: [source] has failed 3 consecutive cycles"**: Check your API key and internet connection.
- **Empty dashboard**: Verify your Odds API key is set and has remaining quota. During off-season, sportsbook data may be limited.
- **No matches found**: The fuzzy matching threshold may be too strict for unusual team name formats. Lower `FUZZY_MATCH_THRESHOLD` in config.py (not recommended below 0.70).
- **Database locked**: Only run one instance of the scheduler at a time.
