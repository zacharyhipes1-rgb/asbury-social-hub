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


def _build_html_email(opportunities):
    now_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    if not opportunities:
        return f"""
        <div style="font-family:Inter,-apple-system,sans-serif;background:#0f1117;color:#fff;padding:40px;border-radius:16px;max-width:700px;margin:0 auto;">
            <h1 style="color:#00d4ff;margin-bottom:8px;font-size:22px;">DIVERGENCE DETECTOR</h1>
            <p style="color:#8b8fa8;font-size:13px;margin-bottom:32px;">{now_str}</p>
            <div style="text-align:center;padding:60px 20px;background:#1a1d2e;border-radius:12px;">
                <p style="color:#8b8fa8;font-size:16px;margin:0;">Markets look efficiently priced right now.</p>
                <p style="color:#555;font-size:13px;margin-top:8px;">No pricing gaps above threshold detected. Nothing actionable today.</p>
            </div>
        </div>
        """

    # Sort by absolute divergence descending
    opportunities = sorted(opportunities, key=lambda x: abs(x.get("divergence_pct", 0)), reverse=True)

    cards = ""
    for i, opp in enumerate(opportunities[:15]):
        div_pct = opp.get("divergence_pct", 0)
        abs_div = abs(div_pct)
        sb_prob = opp.get("consensus_sportsbook_prob", 0) * 100
        pm_prob = opp.get("prediction_market_prob", 0) * 100
        source = (opp.get("prediction_market_source") or "").capitalize()
        sport = (opp.get("sport") or "").upper().replace("_", " ").replace("AMERICANFOOTBALL", "FOOTBALL")
        outcome = opp.get("outcome", "")
        event = opp.get("event_name", "")
        books = opp.get("sportsbook_count", 0)
        volume = opp.get("prediction_market_volume")
        confidence = (opp.get("match_confidence") or 0) * 100
        injury_flag = opp.get("espn_injury_flag", False)
        injury_notes = opp.get("espn_injury_notes", "")

        # Determine the signal
        if div_pct > 0:
            # Prediction market prices this outcome HIGHER than books
            signal_color = "#00d4ff"
            tag = "UNDERVALUED AT SPORTSBOOKS"
            explanation = f"Prediction markets price {outcome} at {pm_prob:.0f}% but sportsbooks only give them {sb_prob:.0f}%. The books may be undervaluing this side by {abs_div:.1f} points."
        else:
            # Prediction market prices this outcome LOWER than books
            signal_color = "#ff6b35"
            tag = "OVERVALUED AT SPORTSBOOKS"
            explanation = f"Sportsbooks price {outcome} at {sb_prob:.0f}% but the prediction market only gives them {pm_prob:.0f}%. The books may be overvaluing this side by {abs_div:.1f} points."

        volume_str = f"${volume:,.0f} volume" if volume else "volume N/A"
        injury_html = f'<div style="background:rgba(255,107,53,.1);border-left:3px solid #ff6b35;padding:8px 12px;border-radius:4px;margin-top:10px;font-size:12px;color:#ff6b35;">INJURY FLAG: {injury_notes}</div>' if injury_flag and injury_notes else ""

        border_style = f"border-left:5px solid {signal_color};" if abs_div >= 5 else f"border-left:3px solid #2a2d3e;"
        glow = f"box-shadow:0 0 15px rgba({'0,212,255' if div_pct > 0 else '255,107,53'},.12);" if abs_div >= 8 else ""

        cards += f"""
        <div style="background:#1a1d2e;border-radius:12px;padding:20px 24px;margin-bottom:16px;{border_style}{glow}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                <span style="font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;">{sport}</span>
                <span style="font-size:10px;font-weight:700;color:{signal_color};background:rgba({'0,212,255' if div_pct > 0 else '255,107,53'},.12);padding:3px 8px;border-radius:4px;letter-spacing:.5px;">{tag}</span>
            </div>
            <div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:12px;">{event}</div>
            <div style="font-size:14px;color:#ddd;line-height:1.6;margin-bottom:14px;">{explanation}</div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #2a2d3e;">
                        <span style="color:#8b8fa8;font-size:11px;text-transform:uppercase;">Sportsbooks ({books} books)</span><br>
                        <span style="color:#fff;font-size:20px;font-weight:700;">{sb_prob:.1f}%</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #2a2d3e;">
                        <span style="color:#8b8fa8;font-size:11px;text-transform:uppercase;">{source} ({volume_str})</span><br>
                        <span style="color:#fff;font-size:20px;font-weight:700;">{pm_prob:.1f}%</span>
                    </td>
                    <td style="padding:8px 0;border-bottom:1px solid #2a2d3e;text-align:center;">
                        <span style="color:#8b8fa8;font-size:11px;text-transform:uppercase;">Gap</span><br>
                        <span style="color:{signal_color};font-size:24px;font-weight:900;">{abs_div:.1f}pp</span>
                    </td>
                </tr>
            </table>
            <div style="font-size:11px;color:#8b8fa8;">Match confidence: {confidence:.0f}% &nbsp;|&nbsp; Outcome: <strong style="color:#ccc;">{outcome}</strong></div>
            {injury_html}
        </div>
        """

    body = f"""
    <div style="font-family:Inter,-apple-system,sans-serif;background:#0f1117;color:#fff;padding:40px;border-radius:16px;max-width:700px;margin:0 auto;">
        <h1 style="color:#00d4ff;margin-bottom:4px;font-size:22px;letter-spacing:1px;">DIVERGENCE DETECTOR</h1>
        <p style="color:#8b8fa8;font-size:13px;margin-bottom:24px;">{now_str}</p>

        <div style="background:#1a1d2e;border-radius:12px;padding:20px 24px;margin-bottom:24px;display:flex;justify-content:space-around;text-align:center;">
            <div>
                <div style="font-size:28px;font-weight:900;color:#fff;">{len(opportunities)}</div>
                <div style="font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;">Mismatches</div>
            </div>
            <div>
                <div style="font-size:28px;font-weight:900;color:#00d4ff;">{max(abs(o.get('divergence_pct',0)) for o in opportunities):.1f}pp</div>
                <div style="font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;">Largest Gap</div>
            </div>
            <div>
                <div style="font-size:28px;font-weight:900;color:#fff;">{sum(1 for o in opportunities if o.get('divergence_pct',0) > 0)}</div>
                <div style="font-size:10px;color:#00d4ff;text-transform:uppercase;letter-spacing:1px;">Undervalued</div>
            </div>
            <div>
                <div style="font-size:28px;font-weight:900;color:#fff;">{sum(1 for o in opportunities if o.get('divergence_pct',0) < 0)}</div>
                <div style="font-size:10px;color:#ff6b35;text-transform:uppercase;letter-spacing:1px;">Overvalued</div>
            </div>
        </div>

        <div style="margin-bottom:12px;padding:12px 16px;background:rgba(0,212,255,.05);border-radius:8px;border:1px solid #2a2d3e;">
            <p style="color:#8b8fa8;font-size:12px;margin:0;line-height:1.6;">
                <strong style="color:#00d4ff;">HOW TO READ THIS:</strong> Each card shows where sportsbooks and prediction markets disagree on an outcome's probability.
                <strong style="color:#00d4ff;">UNDERVALUED</strong> = prediction market thinks this side is more likely than the books do.
                <strong style="color:#ff6b35;">OVERVALUED</strong> = prediction market thinks this side is less likely than the books do.
                Larger gaps = bigger disagreement between market types.
            </p>
        </div>

        {cards}

        <div style="margin-top:24px;padding:16px;background:#1a1d2e;border-radius:8px;text-align:center;">
            <p style="color:#8b8fa8;font-size:12px;margin:0;">Data sourced from {len(set(o.get('prediction_market_source','') for o in opportunities))} prediction market(s) and up to 10 US sportsbooks via The Odds API.<br>This is market data only. Not financial advice. Not a recommendation.</p>
        </div>
    </div>
    """
    return body


def send_daily_digest():
    if not SMTP_PASSWORD:
        print("Email not configured. Set SMTP_PASSWORD in emailer.py (Gmail App Password).")
        return False

    opportunities = logger.get_active_opportunities()
    html = _build_html_email(opportunities)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Divergence Report — {len(opportunities)} flagged ({datetime.now().strftime('%m/%d')})"
    msg["From"] = EMAIL_FROM
    msg["To"] = EMAIL_TO
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, EMAIL_TO, msg.as_string())
        print(f"Daily digest sent to {EMAIL_TO}")
        return True
    except Exception as exc:
        print(f"Email send failed: {exc}")
        return False


if __name__ == "__main__":
    send_daily_digest()
