import sqlite3
import csv
import os
from datetime import datetime, timedelta

import config

_conn = None


def _get_conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(config.DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _init_tables()
    return _conn


def _init_tables():
    conn = _get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sport TEXT NOT NULL,
            event_name TEXT NOT NULL,
            event_commence_time TIMESTAMP,
            outcome TEXT NOT NULL,
            consensus_sportsbook_prob REAL,
            sportsbook_count INTEGER,
            prediction_market_source TEXT,
            prediction_market_prob REAL,
            prediction_market_volume REAL,
            divergence_pct REAL,
            divergence_direction TEXT,
            flag_reason TEXT,
            match_confidence REAL,
            espn_injury_flag BOOLEAN DEFAULT FALSE,
            espn_injury_notes TEXT,
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
            opportunities_found INTEGER,
            opportunities_flagged INTEGER,
            errors INTEGER
        );
    """)
    conn.commit()


def log_opportunity(opp: dict):
    conn = _get_conn()
    conn.execute("""
        INSERT INTO opportunities
        (sport, event_name, event_commence_time, outcome,
         consensus_sportsbook_prob, sportsbook_count,
         prediction_market_source, prediction_market_prob,
         prediction_market_volume, divergence_pct, divergence_direction,
         flag_reason, match_confidence, espn_injury_flag, espn_injury_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        opp.get("sport"), opp.get("event_name"), opp.get("event_commence_time"),
        opp.get("outcome"), opp.get("consensus_sportsbook_prob"),
        opp.get("sportsbook_count"), opp.get("prediction_market_source"),
        opp.get("prediction_market_prob"), opp.get("prediction_market_volume"),
        opp.get("divergence_pct"), opp.get("divergence_direction"),
        opp.get("flag_reason", "threshold_exceeded"), opp.get("match_confidence"),
        opp.get("espn_injury_flag", False), opp.get("espn_injury_notes", ""),
    ))
    conn.commit()


def log_api_health(source, status_code, response_time_ms, error_message=None):
    conn = _get_conn()
    conn.execute("""
        INSERT INTO api_health_log (source, status_code, response_time_ms, error_message)
        VALUES (?, ?, ?, ?)
    """, (source, status_code, int(response_time_ms) if response_time_ms else 0, error_message))
    conn.commit()


def log_cycle_start():
    conn = _get_conn()
    cur = conn.execute("""
        INSERT INTO refresh_cycles (started_at, opportunities_found, opportunities_flagged, errors)
        VALUES (?, 0, 0, 0)
    """, (datetime.utcnow().isoformat(),))
    conn.commit()
    return cur.lastrowid


def log_cycle_end(cycle_id, found, flagged, errors):
    conn = _get_conn()
    conn.execute("""
        UPDATE refresh_cycles SET completed_at=?, opportunities_found=?, opportunities_flagged=?, errors=?
        WHERE id=?
    """, (datetime.utcnow().isoformat(), found, flagged, errors, cycle_id))
    conn.commit()


def deactivate_stale_opportunities():
    conn = _get_conn()
    conn.execute("UPDATE opportunities SET is_active = FALSE WHERE is_active = TRUE")
    conn.commit()


def get_active_opportunities():
    conn = _get_conn()
    cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
    rows = conn.execute("""
        SELECT * FROM opportunities WHERE is_active = TRUE AND detected_at >= ?
        ORDER BY abs(divergence_pct) DESC
    """, (cutoff,)).fetchall()
    return [dict(r) for r in rows]


def get_recent_opportunities(limit=50):
    conn = _get_conn()
    rows = conn.execute("""
        SELECT * FROM opportunities ORDER BY detected_at DESC LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def get_api_health_latest():
    conn = _get_conn()
    rows = conn.execute("""
        SELECT source, status_code, response_time_ms, error_message, logged_at
        FROM api_health_log
        WHERE id IN (SELECT MAX(id) FROM api_health_log GROUP BY source)
    """).fetchall()
    return [dict(r) for r in rows]


def export_csv():
    opps = get_active_opportunities()
    if not opps:
        return
    fieldnames = list(opps[0].keys())
    with open(config.CSV_EXPORT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(opps)


def emergency_log(opp: dict):
    path = "emergency_log.csv"
    exists = os.path.exists(path)
    with open(path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(opp.keys()))
        if not exists:
            writer.writeheader()
        writer.writerow(opp)
