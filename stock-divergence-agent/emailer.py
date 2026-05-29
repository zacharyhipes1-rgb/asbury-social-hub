import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

import config
import logger

EMAIL_TO = "zachary.hipes1@gmail.com"
EMAIL_FROM = "zachary.hipes1@gmail.com"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "zachary.hipes1@gmail.com"
SMTP_PASSWORD = "zqew suar nbkx gkiw"


def _build_html_email(signals, macro):
    now_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    if not signals:
        return f"""
        <div style="font-family:Inter,-apple-system,sans-serif;background:#0f1117;color:#fff;padding:40px;border-radius:16px;max-width:700px;margin:0 auto;">
            <h1 style="color:#00d4ff;margin-bottom:8px;font-size:22px;letter-spacing:1px;">STOCK DIVERGENCE DETECTOR</h1>
            <p style="color:#8b8fa8;font-size:13px;margin-bottom:32px;">{now_str}</p>
            <div style="text-align:center;padding:60px 20px;background:#1a1d2e;border-radius:12px;">
                <p style="color:#8b8fa8;font-size:16px;">All watchlist stocks look consistently priced across sources.</p>
                <p style="color:#555;font-size:13px;margin-top:8px;">No actionable signals today.</p>
            </div>
            <div style="text-align:center;color:#555;font-size:11px;margin-top:24px;">This is market data only. Not financial advice.</div>
        </div>"""

    # Build macro bar
    vix = macro.get("vix")
    yc = macro.get("yield_curve_spread")
    t10 = macro.get("treasury_10y")
    vix_warn = vix and vix > 25
    yc_warn = yc is not None and yc < 0

    macro_html = f"""
    <div style="display:flex;gap:10px;margin-bottom:20px;">
        <div style="background:#1a1d2e;border-radius:8px;padding:12px 16px;flex:1;text-align:center;{'border:1px solid #ff6b35;' if vix_warn else 'border:1px solid #2a2d3e;'}">
            <div style="font-size:18px;font-weight:700;color:{'#ff6b35' if vix_warn else '#fff'};">{vix:.1f if vix else 'N/A'}</div>
            <div style="font-size:9px;color:#8b8fa8;text-transform:uppercase;">VIX</div>
        </div>
        <div style="background:#1a1d2e;border-radius:8px;padding:12px 16px;flex:1;text-align:center;{'border:1px solid #ff6b35;' if yc_warn else 'border:1px solid #2a2d3e;'}">
            <div style="font-size:18px;font-weight:700;color:{'#ff6b35' if yc_warn else '#fff'};">{yc:.2f if yc is not None else 'N/A'}%</div>
            <div style="font-size:9px;color:#8b8fa8;text-transform:uppercase;">Yield Curve</div>
        </div>
        <div style="background:#1a1d2e;border-radius:8px;padding:12px 16px;flex:1;text-align:center;border:1px solid #2a2d3e;">
            <div style="font-size:18px;font-weight:700;color:#fff;">{t10:.2f if t10 else 'N/A'}%</div>
            <div style="font-size:9px;color:#8b8fa8;text-transform:uppercase;">10Y Treasury</div>
        </div>
    </div>"""

    # Count by type
    undervalued = sum(1 for s in signals if 'UNDERVALUED' in (s.get('signal_label') or ''))
    overvalued = sum(1 for s in signals if 'OVERVALUED' in (s.get('signal_label') or ''))
    insider = sum(1 for s in signals if s.get('signal_type') == 'INSIDER_DIVERGENCE')
    short_sig = sum(1 for s in signals if s.get('signal_type') == 'SHORT_INTEREST')
    vol_sig = sum(1 for s in signals if s.get('signal_type') == 'VOLATILITY_MISMATCH')

    # Build signal cards
    cards = ""
    for s in signals[:20]:
        label = s.get("signal_label", "")
        ticker = s.get("ticker", "")
        name = s.get("company_name", "")
        price = s.get("current_price", 0)
        target = s.get("analyst_target")
        gap = abs(s.get("gap_pct") or 0)
        confidence = s.get("confidence", "")
        sig_type = s.get("signal_type", "")

        is_bullish = label in ('UNDERVALUED vs ANALYSTS', 'INSIDER BUYING INTO WEAKNESS', 'POTENTIAL SHORT SQUEEZE SETUP')
        is_bearish = label in ('OVERVALUED vs ANALYSTS', 'INSIDER SELLING INTO STRENGTH', 'HEAVY PUT ACTIVITY')
        color = "#00d4ff" if is_bullish else ("#ff6b35" if is_bearish else "#a855f7")
        bg_color = "0,212,255" if is_bullish else ("255,107,53" if is_bearish else "168,85,247")

        # Summary text
        if sig_type == "PRICE_GAP":
            summary = f"Analysts target ${target:.2f} for {ticker}, currently at ${price:.2f}. That's a {gap:.1f}% gap — analysts think it's {'undervalued' if (s.get('gap_pct',0)) > 0 else 'overvalued'}."
        elif sig_type == "INSIDER_DIVERGENCE" and "BUYING" in label:
            summary = f"Insiders have net purchased ${abs(s.get('net_insider_value',0)):,.0f} of {ticker} while the stock dropped {abs(s.get('price_change_30d_pct',0)):.1f}% in 30 days."
        elif sig_type == "INSIDER_DIVERGENCE" and "SELLING" in label:
            summary = f"Insiders have net sold ${abs(s.get('net_insider_value',0)):,.0f} of {ticker} while the stock rose {s.get('price_change_30d_pct',0):.1f}% in 30 days."
        elif sig_type == "SHORT_INTEREST" and "SQUEEZE" in label:
            summary = f"{s.get('short_float_pct',0):.1f}% of {ticker}'s float is short and the stock is up {s.get('price_change_30d_pct',0):.1f}% — potential squeeze."
        elif sig_type == "SHORT_INTEREST":
            summary = f"{s.get('short_float_pct',0):.1f}% of {ticker}'s tradable shares are sold short. Heavy bearish positioning."
        elif "BIG MOVE" in label:
            summary = f"Options on {ticker} are pricing {(s.get('implied_vol',0))*100:.0f}% annualized vol vs {(s.get('realized_vol',0))*100:.0f}% realized. Market expects a big move."
        elif "PUT" in label:
            summary = f"Put/call ratio on {ticker} is {s.get('put_call_ratio',0):.2f}. Significantly more puts than calls — bearish lean."
        elif sig_type == "RATING_SPLIT":
            summary = f"Sources disagree on {ticker}: conflicting analyst ratings across platforms."
        else:
            summary = f"Signal detected on {ticker}."

        # Key number
        if gap > 0:
            big_label = "Gap"
            big_val = f"{gap:.1f}%"
        elif s.get("short_float_pct"):
            big_label = "Short Float"
            big_val = f"{s['short_float_pct']:.1f}%"
        elif s.get("put_call_ratio"):
            big_label = "P/C Ratio"
            big_val = f"{s['put_call_ratio']:.2f}"
        elif s.get("net_insider_value"):
            big_label = "Insider Net"
            big_val = f"${abs(s['net_insider_value']):,.0f}"
        else:
            big_label = ""
            big_val = ""

        conf_color = "#22c55e" if confidence == "HIGH" else ("#eab308" if confidence == "MEDIUM" else "#a855f7")

        cards += f"""
        <div style="background:#1a1d2e;border-radius:12px;padding:20px 24px;margin-bottom:14px;border-left:4px solid {color};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                <div>
                    <span style="font-size:18px;font-weight:900;color:#fff;">{ticker}</span>
                    <span style="font-size:12px;color:#8b8fa8;margin-left:8px;">{name}</span>
                    <span style="font-size:9px;font-weight:700;color:{conf_color};background:rgba({bg_color},.1);padding:2px 6px;border-radius:3px;margin-left:6px;">{confidence}</span>
                </div>
                <span style="font-size:9px;font-weight:700;color:{color};background:rgba({bg_color},.12);padding:3px 8px;border-radius:4px;letter-spacing:.5px;">{label}</span>
            </div>
            <div style="font-size:13px;color:#ddd;line-height:1.6;margin:10px 0 14px;">{summary}</div>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:6px 0;">
                        <span style="color:#8b8fa8;font-size:10px;text-transform:uppercase;">Price</span><br>
                        <span style="color:#fff;font-size:18px;font-weight:700;">${price:.2f}</span>
                    </td>
                    {'<td style="padding:6px 0;"><span style="color:#8b8fa8;font-size:10px;text-transform:uppercase;">Target</span><br><span style="color:#fff;font-size:18px;font-weight:700;">$' + f'{target:.2f}' + '</span></td>' if target else ''}
                    {'<td style="padding:6px 0;text-align:center;"><span style="color:#8b8fa8;font-size:10px;text-transform:uppercase;">' + big_label + '</span><br><span style="color:' + color + ';font-size:24px;font-weight:900;">' + big_val + '</span></td>' if big_val else ''}
                </tr>
            </table>
        </div>"""

    body = f"""
    <div style="font-family:Inter,-apple-system,sans-serif;background:#0f1117;color:#fff;padding:40px;border-radius:16px;max-width:700px;margin:0 auto;">
        <h1 style="color:#00d4ff;margin-bottom:4px;font-size:22px;letter-spacing:1px;">STOCK DIVERGENCE DETECTOR</h1>
        <p style="color:#8b8fa8;font-size:13px;margin-bottom:20px;">{now_str} &mdash; Pre-Market Briefing</p>

        {macro_html}

        <div style="background:#1a1d2e;border-radius:12px;padding:18px 24px;margin-bottom:20px;display:flex;justify-content:space-around;text-align:center;">
            <div><div style="font-size:26px;font-weight:900;color:#fff;">{len(signals)}</div><div style="font-size:9px;color:#8b8fa8;text-transform:uppercase;">Signals</div></div>
            <div><div style="font-size:26px;font-weight:900;color:#00d4ff;">{undervalued}</div><div style="font-size:9px;color:#00d4ff;text-transform:uppercase;">Undervalued</div></div>
            <div><div style="font-size:26px;font-weight:900;color:#ff6b35;">{overvalued}</div><div style="font-size:9px;color:#ff6b35;text-transform:uppercase;">Overvalued</div></div>
            <div><div style="font-size:26px;font-weight:900;color:#a855f7;">{insider + short_sig + vol_sig}</div><div style="font-size:9px;color:#a855f7;text-transform:uppercase;">Other Signals</div></div>
        </div>

        <div style="padding:10px 14px;background:rgba(0,212,255,.04);border-radius:8px;border:1px solid #2a2d3e;margin-bottom:18px;">
            <p style="color:#8b8fa8;font-size:11px;margin:0;line-height:1.6;">
                <strong style="color:#00d4ff;">UNDERVALUED</strong> = analysts/insiders think price should be higher &nbsp;
                <strong style="color:#ff6b35;">OVERVALUED</strong> = analysts/insiders think price should be lower &nbsp;
                <strong style="color:#a855f7;">OTHER</strong> = short interest, options flow, or rating conflicts
            </p>
        </div>

        {cards}

        <div style="text-align:center;color:#555;font-size:11px;margin-top:24px;padding:16px;border-top:1px solid #2a2d3e;">
            This is market data only. Not financial advice. Not a recommendation to buy or sell any security.
        </div>
    </div>"""
    return body


def send_daily_digest():
    if not SMTP_PASSWORD:
        print("Email not configured. Set SMTP_PASSWORD in emailer.py with a Gmail App Password to activate daily digests.")
        return False

    signals = logger.get_active_signals()
    macro = logger.get_latest_macro()
    html = _build_html_email(signals, macro)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Stock Signals — {len(signals)} flagged ({datetime.now().strftime('%m/%d')})"
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
        print(f"Stock digest sent to {EMAIL_TO}")
        return True
    except Exception as exc:
        print(f"Email send failed: {exc}")
        return False


if __name__ == "__main__":
    send_daily_digest()
