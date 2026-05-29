import re
from difflib import SequenceMatcher
from dateutil import parser as dtparser
from datetime import timedelta
from typing import Optional

import config

TEAM_SUFFIXES = re.compile(
    r"\b(fc|city|united|university of|state|college|the)\b", re.IGNORECASE
)
PUNCTUATION = re.compile(r"[^\w\s]")


def american_to_implied_prob(american_odds: int) -> float:
    if american_odds > 0:
        return 100 / (american_odds + 100)
    else:
        return abs(american_odds) / (abs(american_odds) + 100)


def remove_vig(probs: list) -> list:
    total = sum(probs)
    if total == 0:
        return probs
    return [p / total for p in probs]


def normalize_team_name(name: str) -> str:
    name = name.lower().strip()
    name = PUNCTUATION.sub("", name)
    name = TEAM_SUFFIXES.sub("", name)
    return " ".join(name.split())


def fuzzy_match_score(a: str, b: str) -> float:
    na = normalize_team_name(a)
    nb = normalize_team_name(b)
    return SequenceMatcher(None, na, nb).ratio()


def times_within_window(t1_str, t2_str, hours=24):
    if not t1_str or not t2_str:
        return True  # can't reject on time if missing
    try:
        t1 = dtparser.parse(t1_str)
        t2 = dtparser.parse(t2_str)
        return abs(t1 - t2) <= timedelta(hours=hours)
    except (ValueError, TypeError):
        return True


def extract_team_from_question(question: str, known_teams: list) -> Optional[str]:
    q_lower = question.lower()
    best_match = None
    best_score = 0
    for team in known_teams:
        norm = normalize_team_name(team)
        if norm in q_lower:
            score = len(norm)
            if score > best_score:
                best_score = score
                best_match = team
    return best_match


def compute_consensus(events: list[dict]) -> list[dict]:
    consensus_events = []
    for event in events:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            continue

        markets_consensus = {}
        for market_key in ("h2h", "spreads", "totals"):
            outcome_probs = {}
            book_count = 0
            for bk in bookmakers:
                for mkt in bk.get("markets", []):
                    if mkt["key"] != market_key:
                        continue
                    raw_probs = []
                    outcomes_list = []
                    for o in mkt["outcomes"]:
                        prob = american_to_implied_prob(o["price"])
                        raw_probs.append(prob)
                        outcomes_list.append(o["name"])
                    fair_probs = remove_vig(raw_probs)
                    for name, prob in zip(outcomes_list, fair_probs):
                        outcome_probs.setdefault(name, []).append(prob)
                    book_count += 1

            if outcome_probs:
                consensus = {}
                for name, probs in outcome_probs.items():
                    consensus[name] = sum(probs) / len(probs)
                markets_consensus[market_key] = {
                    "consensus": consensus,
                    "book_count": book_count,
                    "low_sample": book_count < 3,
                }

        consensus_events.append({
            "id": event.get("id"),
            "sport_key": event.get("sport_key"),
            "home_team": event.get("home_team"),
            "away_team": event.get("away_team"),
            "commence_time": event.get("commence_time"),
            "markets": markets_consensus,
            "bookmakers_raw": bookmakers,
        })
    return consensus_events


def calculate_divergence(consensus_sportsbook_prob: float, prediction_market_prob: float) -> float:
    return (prediction_market_prob - consensus_sportsbook_prob) * 100


def match_events_to_prediction_markets(consensus_events, prediction_markets):
    known_teams = []
    for e in consensus_events:
        known_teams.append(e["home_team"])
        known_teams.append(e["away_team"])

    matches = []
    for pm in prediction_markets:
        pm_name = pm.get("name", "")
        for contract in pm.get("contracts", []):
            contract_name = contract["name"]
            best_event = None
            best_score = 0
            best_outcome = None

            for event in consensus_events:
                h2h = event["markets"].get("h2h")
                if not h2h:
                    continue

                # Try matching contract name to home/away team
                for team_field in ("home_team", "away_team"):
                    team = event[team_field]
                    score = fuzzy_match_score(contract_name, team)
                    if score > best_score:
                        best_score = score
                        best_event = event
                        best_outcome = team

                # Also try extracting team from the market question
                extracted = extract_team_from_question(pm_name, [event["home_team"], event["away_team"]])
                if extracted:
                    score = fuzzy_match_score(contract_name, extracted)
                    if score > best_score:
                        best_score = score
                        best_event = event
                        best_outcome = extracted

            if best_score >= config.FUZZY_MATCH_THRESHOLD and best_event:
                h2h_consensus = best_event["markets"].get("h2h", {}).get("consensus", {})
                sportsbook_prob = h2h_consensus.get(best_outcome)
                if sportsbook_prob is None:
                    continue

                divergence = calculate_divergence(sportsbook_prob, contract["prob"])

                if abs(divergence) >= config.DIVERGENCE_THRESHOLD_PERCENTAGE:
                    direction = "prediction_market_higher" if divergence > 0 else "sportsbook_higher"
                    matches.append({
                        "sport": best_event["sport_key"],
                        "event_name": f"{best_event['home_team']} vs {best_event['away_team']}",
                        "event_commence_time": best_event["commence_time"],
                        "outcome": best_outcome,
                        "consensus_sportsbook_prob": sportsbook_prob,
                        "sportsbook_count": best_event["markets"]["h2h"]["book_count"],
                        "prediction_market_source": pm["source"],
                        "prediction_market_prob": contract["prob"],
                        "prediction_market_volume": pm.get("volume"),
                        "divergence_pct": divergence,
                        "divergence_direction": direction,
                        "match_confidence": best_score,
                        "bookmakers_raw": best_event.get("bookmakers_raw", []),
                        "pm_url": pm.get("url", ""),
                    })

    return matches


def detect_prediction_market_splits(prediction_markets):
    by_contract = {}
    for pm in prediction_markets:
        for contract in pm.get("contracts", []):
            key = normalize_team_name(contract["name"])
            by_contract.setdefault(key, []).append({
                "source": pm["source"],
                "name": contract["name"],
                "prob": contract["prob"],
                "market_name": pm["name"],
                "volume": pm.get("volume"),
            })

    splits = []
    for key, entries in by_contract.items():
        if len(entries) < 2:
            continue
        for i in range(len(entries)):
            for j in range(i + 1, len(entries)):
                diff = abs(entries[i]["prob"] - entries[j]["prob"]) * 100
                if diff >= config.DIVERGENCE_THRESHOLD_PERCENTAGE:
                    splits.append({
                        "type": "prediction_market_split",
                        "outcome": entries[i]["name"],
                        "source_a": entries[i]["source"],
                        "prob_a": entries[i]["prob"],
                        "source_b": entries[j]["source"],
                        "prob_b": entries[j]["prob"],
                        "divergence_pct": diff,
                        "market_name": entries[i]["market_name"],
                    })
    return splits
