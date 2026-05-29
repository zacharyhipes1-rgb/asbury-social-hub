import json
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
    """)
    conn.commit()


def log_signal(sig):
    conn = _get_conn()
    detail = sig.get("detail", {})
    conn.execute("""
        INSERT INTO signals
        (ticker, company_name, signal_type, signal_label, current_price,
         analyst_target, gap_pct, short_float_pct, net_insider_value,
         price_change_30d_pct, implied_vol, realized_vol, put_call_ratio,
         analyst_consensus_score, analyst_consensus_label, detail_json,
         flag_reason, confidence)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        sig.get("ticker"), sig.get("company_name"), sig.get("signal_type"),
        sig.get("signal_label"), sig.get("current_price"),
        sig.get("analyst_target"), sig.get("gap_pct"),
        sig.get("short_float_pct"), sig.get("net_insider_value"),
        sig.get("price_change_30d_pct"), sig.get("implied_vol"),
        sig.get("realized_vol"), sig.get("put_call_ratio"),
        sig.get("analyst_consensus_score"), sig.get("analyst_consensus_label"),
        json.dumps(detail, default=str),
        sig.get("flag_reason", "threshold_exceeded"), sig.get("confidence"),
    ))
    conn.commit()


def log_api_health(source, status_code, response_time_ms, error_message=None):
    conn = _get_conn()
    conn.execute("""
        INSERT INTO api_health_log (source, status_code, response_time_ms, error_message)
        VALUES (?,?,?,?)
    """, (source, status_code, int(response_time_ms) if response_time_ms else 0, error_message))
    conn.commit()


def log_macro(macro):
    conn = _get_conn()
    conn.execute("""
        INSERT INTO macro_context (treasury_10y, treasury_2y, yield_curve_spread, vix, cpi_latest, unemployment_rate)
        VALUES (?,?,?,?,?,?)
    """, (
        macro.get("treasury_10y"), macro.get("treasury_2y"),
        macro.get("yield_curve_spread"), macro.get("vix"),
        macro.get("cpi"), macro.get("unemployment"),
    ))
    conn.commit()


def log_cycle_start():
    conn = _get_conn()
    cur = conn.execute("""
        INSERT INTO refresh_cycles (started_at, tickers_scanned, signals_found, errors)
        VALUES (?, 0, 0, 0)
    """, (datetime.utcnow().isoformat(),))
    conn.commit()
    return cur.lastrowid


def log_cycle_end(cycle_id, scanned, found, errors):
    conn = _get_conn()
    conn.execute("""
        UPDATE refresh_cycles SET completed_at=?, tickers_scanned=?, signals_found=?, errors=?
        WHERE id=?
    """, (datetime.utcnow().isoformat(), scanned, found, errors, cycle_id))
    conn.commit()


def deactivate_stale_signals():
    conn = _get_conn()
    conn.execute("UPDATE signals SET is_active = FALSE WHERE is_active = TRUE")
    conn.commit()


def get_active_signals():
    conn = _get_conn()
    cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
    rows = conn.execute("""
        SELECT * FROM signals WHERE is_active = TRUE AND detected_at >= ?
        ORDER BY abs(gap_pct) DESC, abs(short_float_pct) DESC
    """, (cutoff,)).fetchall()
    return [dict(r) for r in rows]


def get_recent_signals(limit=100):
    conn = _get_conn()
    rows = conn.execute("""
        SELECT * FROM signals ORDER BY detected_at DESC LIMIT ?
    """, (limit,)).fetchall()
    return [dict(r) for r in rows]


def get_latest_macro():
    conn = _get_conn()
    row = conn.execute("""
        SELECT * FROM macro_context ORDER BY fetched_at DESC LIMIT 1
    """).fetchone()
    return dict(row) if row else {}


def get_api_health_latest():
    conn = _get_conn()
    rows = conn.execute("""
        SELECT source, status_code, response_time_ms, error_message, logged_at
        FROM api_health_log
        WHERE id IN (SELECT MAX(id) FROM api_health_log GROUP BY source)
    """).fetchall()
    return [dict(r) for r in rows]


def export_csv():
    sigs = get_active_signals()
    if not sigs:
        return
    fieldnames = [k for k in sigs[0].keys() if k != "detail_json"]
    with open(config.CSV_EXPORT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(sigs)


def emergency_log(sig):
    path = "emergency_log.csv"
    exists = os.path.exists(path)
    clean = {k: v for k, v in sig.items() if k != "detail"}
    with open(path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(clean.keys()))
        if not exists:
            writer.writeheader()
        writer.writerow(clean)
