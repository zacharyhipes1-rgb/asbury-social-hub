import sys
import os
import webbrowser
import subprocess
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import config
import logger
import dashboard
from calculator import compute_consensus, match_events_to_prediction_markets, detect_prediction_market_splits


class DataSourceHealth:
    def __init__(self):
        self._failures = {}

    def record_success(self, source):
        self._failures[source] = 0

    def record_failure(self, source, error):
        self._failures[source] = self._failures.get(source, 0) + 1
        if self._failures[source] >= 3:
            print(f"WARNING: {source} has failed 3 consecutive cycles. Check API key and connectivity.")

    def consecutive_failures(self, source):
        return self._failures.get(source, 0)


health_tracker = DataSourceHealth()


def _notify(flagged, total_events):
    title = "Divergence Detector"
    if flagged > 0:
        msg = f"{flagged} mismatch{'es' if flagged != 1 else ''} found across {total_events} events. Dashboard ready."
    else:
        msg = f"No divergences found across {total_events} events. Markets look efficient."
    try:
        subprocess.run([
            "osascript", "-e",
            f'display notification "{msg}" with title "{title}" sound name "Glass"'
        ], check=False, capture_output=True)
    except Exception:
        pass


def open_dashboard():
    path = os.path.abspath(config.DASHBOARD_OUTPUT_PATH)
    webbrowser.open(f"file://{path}")


def _fetch_odds_api():
    from fetchers.odds_api import fetch_all_odds, get_quota
    try:
        events = fetch_all_odds()
        quota = get_quota()
        logger.log_api_health("odds_api", 200, 0)
        health_tracker.record_success("odds_api")
        return {"events": events, "quota": quota}
    except Exception as exc:
        logger.log_api_health("odds_api", 0, 0, str(exc))
        health_tracker.record_failure("odds_api", str(exc))
        return {"events": [], "quota": {}}


def _fetch_predictit():
    from fetchers.predictit import fetch_markets
    try:
        markets, status, ms = fetch_markets()
        logger.log_api_health("predictit", status, ms)
        health_tracker.record_success("predictit")
        return markets
    except Exception as exc:
        logger.log_api_health("predictit", 0, 0, str(exc))
        health_tracker.record_failure("predictit", str(exc))
        return []


def _fetch_polymarket():
    from fetchers.polymarket import fetch_markets
    try:
        markets, status, ms = fetch_markets()
        logger.log_api_health("polymarket", status, ms)
        health_tracker.record_success("polymarket")
        return markets
    except Exception as exc:
        logger.log_api_health("polymarket", 0, 0, str(exc))
        health_tracker.record_failure("polymarket", str(exc))
        return []


def _fetch_kalshi():
    from fetchers.kalshi import fetch_markets
    if not config.KALSHI_ENABLED:
        return []
    try:
        markets, status, ms = fetch_markets()
        logger.log_api_health("kalshi", status, ms)
        health_tracker.record_success("kalshi")
        return markets
    except Exception as exc:
        logger.log_api_health("kalshi", 0, 0, str(exc))
        health_tracker.record_failure("kalshi", str(exc))
        return []


def _fetch_espn():
    from fetchers.espn import fetch_all
    if not config.ESPN_ENABLED:
        return []
    try:
        events = fetch_all()
        logger.log_api_health("espn", 200, 0)
        health_tracker.record_success("espn")
        return events
    except Exception as exc:
        logger.log_api_health("espn", 0, 0, str(exc))
        health_tracker.record_failure("espn", str(exc))
        return []


def _enrich_with_espn(opportunities, espn_events):
    from calculator import normalize_team_name, fuzzy_match_score
    for opp in opportunities:
        for espn_ev in espn_events:
            espn_teams = [t["name"] for t in espn_ev.get("teams", [])]
            for team in espn_teams:
                if fuzzy_match_score(opp["outcome"], team) >= 0.80:
                    if espn_ev.get("has_injuries"):
                        opp["espn_injury_flag"] = True
                        opp["espn_injury_notes"] = "; ".join(espn_ev["injury_notes"][:3])
                    break


def run_full_cycle():
    cycle_id = logger.log_cycle_start()
    errors = 0
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Fetch all sources in parallel
    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(_fetch_odds_api): "odds_api",
            pool.submit(_fetch_predictit): "predictit",
            pool.submit(_fetch_polymarket): "polymarket",
            pool.submit(_fetch_kalshi): "kalshi",
        }
        if config.ESPN_ENABLED:
            futures[pool.submit(_fetch_espn)] = "espn"

        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception:
                results[key] = [] if key != "odds_api" else {"events": [], "quota": {}}
                errors += 1

    odds_data = results.get("odds_api", {"events": [], "quota": {}})
    sportsbook_events = odds_data["events"]
    quota = odds_data.get("quota", {})

    prediction_markets = []
    prediction_markets.extend(results.get("predictit", []))
    prediction_markets.extend(results.get("polymarket", []))
    prediction_markets.extend(results.get("kalshi", []))

    espn_events = results.get("espn", [])

    total_events = len(sportsbook_events)

    if not sportsbook_events:
        print(f"[{now}] No sportsbook data available. Skipping divergence calculation.")
        logger.log_cycle_end(cycle_id, 0, 0, errors)
        dashboard.generate_dashboard(total_events=0, opportunities=[], quota_remaining=quota.get("remaining"))
        return

    if not prediction_markets:
        print(f"[{now}] No prediction market data available. Skipping divergence calculation.")
        logger.log_cycle_end(cycle_id, total_events, 0, errors)
        dashboard.generate_dashboard(total_events=total_events, opportunities=[], quota_remaining=quota.get("remaining"))
        return

    # Compute consensus
    consensus = compute_consensus(sportsbook_events)

    # Match and calculate divergences
    opportunities = match_events_to_prediction_markets(consensus, prediction_markets)

    # Detect prediction market splits
    splits = detect_prediction_market_splits(prediction_markets)

    # Enrich with ESPN injury data
    if espn_events:
        _enrich_with_espn(opportunities, espn_events)

    # Deactivate prior cycle opportunities, write new ones
    logger.deactivate_stale_opportunities()
    for opp in opportunities:
        try:
            logger.log_opportunity(opp)
        except Exception:
            logger.emergency_log(opp)
            errors += 1

    for split in splits:
        try:
            logger.log_opportunity({
                "sport": "cross_market",
                "event_name": split.get("market_name", ""),
                "outcome": split["outcome"],
                "consensus_sportsbook_prob": split["prob_a"],
                "sportsbook_count": 0,
                "prediction_market_source": f"{split['source_a']} vs {split['source_b']}",
                "prediction_market_prob": split["prob_b"],
                "prediction_market_volume": None,
                "divergence_pct": split["divergence_pct"],
                "divergence_direction": "prediction_market_split",
                "flag_reason": "PREDICTION MARKET SPLIT - not sportsbook divergence",
                "match_confidence": 1.0,
            })
        except Exception:
            errors += 1

    flagged = len(opportunities) + len(splits)
    logger.log_cycle_end(cycle_id, total_events, flagged, errors)
    logger.export_csv()

    # Generate dashboard
    active = logger.get_active_opportunities()
    dashboard.generate_dashboard(
        total_events=total_events,
        opportunities=active,
        quota_remaining=quota.get("remaining"),
    )

    print(f"[{now}] Cycle complete. {flagged} opportunities flagged. Dashboard updated.")
    _notify(flagged, total_events)


if __name__ == "__main__":
    if not config.KALSHI_ENABLED:
        print("Kalshi integration disabled. Set KALSHI_ENABLED=True in config.py to activate.")
    print("Running cycle...")
    run_full_cycle()
    print("Opening dashboard in browser...")
    open_dashboard()
