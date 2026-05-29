from jinja2 import Template
from datetime import datetime

import config
import logger

TEMPLATE = Template("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Stock Divergence Detector</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0f1117;color:#fff;min-height:100vh;padding:20px}
.header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:24px 32px;background:#1a1d2e;border-radius:16px;margin-bottom:16px;border:1px solid #2a2d3e}
.header h1{font-size:22px;font-weight:900;letter-spacing:2px;color:#00d4ff}
.header-stats{display:flex;gap:28px;flex-wrap:wrap}
.stat{text-align:center}
.stat-value{font-size:26px;font-weight:700;color:#fff}
.stat-label{font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.meta{color:#8b8fa8;font-size:12px;text-align:right}
#countdown{color:#00d4ff;font-weight:600}
.macro-bar{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px}
.macro-item{background:#1a1d2e;border-radius:10px;padding:14px 20px;border:1px solid #2a2d3e;flex:1;min-width:120px;text-align:center}
.macro-item.warn{border-color:#ff6b35;background:rgba(255,107,53,.05)}
.macro-item .val{font-size:20px;font-weight:700}
.macro-item .lbl{font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.cards{display:flex;flex-direction:column;gap:14px;margin-bottom:28px}
.card{background:#1a1d2e;border-radius:12px;padding:22px 26px;border:1px solid #2a2d3e;position:relative}
.card.glow{box-shadow:0 0 18px rgba(0,212,255,.12)}
.card.glow-neg{box-shadow:0 0 18px rgba(255,107,53,.12)}
.card.accent-left{border-left:4px solid #00d4ff}
.card.accent-left-neg{border-left:4px solid #ff6b35}
.badge{position:absolute;top:14px;right:18px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:4px 10px;border-radius:4px}
.badge.cyan{background:rgba(0,212,255,.12);color:#00d4ff}
.badge.orange{background:rgba(255,107,53,.12);color:#ff6b35}
.badge.purple{background:rgba(168,85,247,.12);color:#a855f7}
.card-ticker{font-size:20px;font-weight:900;color:#fff;margin-bottom:2px}
.card-name{font-size:12px;color:#8b8fa8;margin-bottom:10px}
.card-summary{font-size:14px;color:#ddd;line-height:1.6;margin-bottom:14px}
.nums{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:12px}
.num-block .lbl{font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:.5px}
.num-block .val{font-size:22px;font-weight:700}
.num-block .sub{font-size:11px;color:#8b8fa8}
.big-num{font-size:30px;font-weight:900}
.big-num.cyan{color:#00d4ff}
.big-num.orange{color:#ff6b35}
.big-num.purple{color:#a855f7}
.confidence{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;letter-spacing:.5px}
.confidence.HIGH{background:rgba(34,197,94,.15);color:#22c55e}
.confidence.MEDIUM{background:rgba(234,179,8,.15);color:#eab308}
.confidence.LOW{background:rgba(168,85,247,.15);color:#a855f7}
.injury{background:rgba(255,107,53,.08);border-left:3px solid #ff6b35;padding:8px 12px;border-radius:4px;margin-top:8px;font-size:12px;color:#ff6b35}
.details{font-size:12px;color:#8b8fa8;line-height:1.7;margin-top:8px}
.details strong{color:#ccc}
.empty{text-align:center;padding:70px 20px;color:#8b8fa8;font-size:15px}
.section-title{font-size:14px;font-weight:700;margin-bottom:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;font-size:11px;background:#1a1d2e;border-radius:8px;overflow:hidden}
th{background:#22263a;color:#8b8fa8;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;cursor:pointer;user-select:none}
th:hover{color:#fff}
td{padding:7px 10px;border-top:1px solid #2a2d3e;color:#ccc}
tr:hover td{background:rgba(255,255,255,.02)}
.health{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px}
.health-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#8b8fa8}
.dot{width:7px;height:7px;border-radius:50%}
.dot.green{background:#22c55e}
.dot.red{background:#ef4444}
.dot.gray{background:#6b7280}
.disclaimer{text-align:center;color:#555;font-size:11px;margin-top:20px;padding:16px;border-top:1px solid #2a2d3e}
</style>
</head>
<body>
<div class="header">
  <h1>STOCK DIVERGENCE DETECTOR</h1>
  <div class="header-stats">
    <div class="stat"><div class="stat-value">{{ tickers_scanned }}</div><div class="stat-label">Tickers Scanned</div></div>
    <div class="stat"><div class="stat-value">{{ signal_count }}</div><div class="stat-label">Signals</div></div>
    <div class="stat"><div class="stat-value">{{ strongest }}</div><div class="stat-label">Strongest</div></div>
  </div>
  <div class="meta">
    <span>Updated: <strong id="updated">{{ updated_at }}</strong></span><br>
    <span>Next: <strong id="countdown">--:--</strong></span>
  </div>
</div>

<div class="macro-bar">
  <div class="macro-item{{ ' warn' if vix_elevated else '' }}">
    <div class="val" style="color:{{ '#ff6b35' if vix_elevated else '#fff' }}">{{ '%.1f'|format(vix or 0) }}</div>
    <div class="lbl">VIX</div>
  </div>
  <div class="macro-item{{ ' warn' if yield_inverted else '' }}">
    <div class="val" style="color:{{ '#ff6b35' if yield_inverted else '#fff' }}">{{ '%.2f'|format(yield_spread or 0) }}%</div>
    <div class="lbl">Yield Curve (10Y-2Y)</div>
  </div>
  <div class="macro-item">
    <div class="val">{{ '%.2f'|format(treasury_10y or 0) }}%</div>
    <div class="lbl">10Y Treasury</div>
  </div>
  <div class="macro-item">
    <div class="val">{{ market_status }}</div>
    <div class="lbl">Market</div>
  </div>
</div>

<div class="cards">
{% if signals %}
{% for s in signals %}
{% set is_bullish = s.signal_label in ['UNDERVALUED vs ANALYSTS', 'INSIDER BUYING INTO WEAKNESS', 'POTENTIAL SHORT SQUEEZE SETUP'] %}
{% set is_bearish = s.signal_label in ['OVERVALUED vs ANALYSTS', 'INSIDER SELLING INTO STRENGTH', 'HEAVY PUT ACTIVITY'] %}
{% set color_class = 'cyan' if is_bullish else ('orange' if is_bearish else 'purple') %}
{% set gap = s.gap_pct|default(0)|abs %}
<div class="card {{ 'glow' if (is_bullish and gap >= 25) else ('glow-neg' if (is_bearish and gap >= 25) else ('accent-left' if is_bullish else ('accent-left-neg' if is_bearish else ''))) }}">
  <div class="badge {{ color_class }}">{{ s.signal_label }}</div>
  <div class="card-ticker">{{ s.ticker }}</div>
  <div class="card-name">{{ s.company_name }} &nbsp; <span class="confidence {{ s.confidence }}">{{ s.confidence }}</span></div>
  <div class="card-summary">
  {% if s.signal_type == 'PRICE_GAP' %}
    Wall Street analysts target ${{ '%.2f'|format(s.analyst_target or 0) }} for {{ s.ticker }}, but it's trading at ${{ '%.2f'|format(s.current_price or 0) }}. That's a {{ '%.1f'|format(gap) }}% gap — analysts think it's {{ 'undervalued' if (s.gap_pct or 0) > 0 else 'overvalued' }}.
  {% elif s.signal_type == 'INSIDER_DIVERGENCE' and 'BUYING' in s.signal_label %}
    Corporate insiders have net purchased ${{ '{:,.0f}'.format((s.net_insider_value or 0)|abs) }} of {{ s.ticker }} in the last 30 days, even though the stock has dropped {{ '%.1f'|format((s.price_change_30d_pct or 0)|abs) }}%. They're buying while the market sells.
  {% elif s.signal_type == 'INSIDER_DIVERGENCE' and 'SELLING' in s.signal_label %}
    Corporate insiders have net sold ${{ '{:,.0f}'.format((s.net_insider_value or 0)|abs) }} of {{ s.ticker }} in the last 30 days, while the stock is up {{ '%.1f'|format(s.price_change_30d_pct or 0) }}%. They're cashing out into strength.
  {% elif s.signal_type == 'SHORT_INTEREST' %}
    {{ '%.1f'|format(s.short_float_pct or 0) }}% of {{ s.ticker }}'s tradable shares are sold short. {% if 'SQUEEZE' in s.signal_label %}Meanwhile the stock is up {{ '%.1f'|format(s.price_change_30d_pct or 0) }}% this month — shorts may be getting squeezed.{% else %}That's high short interest indicating significant bearish positioning.{% endif %}
  {% elif 'BIG MOVE' in (s.signal_label or '') %}
    Options on {{ s.ticker }} are pricing {{ '%.1f'|format((s.implied_vol or 0) * 100) }}% annualized volatility, but the stock has only moved at {{ '%.1f'|format((s.realized_vol or 0) * 100) }}% historically. The options market is expecting something big.
  {% elif 'PUT' in (s.signal_label or '') %}
    Put/call ratio on {{ s.ticker }} is {{ '%.2f'|format(s.put_call_ratio or 0) }} — significantly more puts than calls. Heavy bearish options positioning.
  {% elif s.signal_type == 'RATING_SPLIT' %}
    Data sources disagree on {{ s.ticker }}: one rates it "{{ s.get('av_consensus', 'N/A') }}" while another says "{{ s.get('yf_recommendation', 'N/A') }}". Mixed signals from the analyst community.
  {% endif %}
  </div>
  <div class="nums">
    <div class="num-block"><div class="lbl">Price</div><div class="val">${{ '%.2f'|format(s.current_price or 0) }}</div></div>
    {% if s.analyst_target %}<div class="num-block"><div class="lbl">Target</div><div class="val">${{ '%.2f'|format(s.analyst_target) }}</div></div>{% endif %}
    {% if s.gap_pct %}<div class="num-block"><div class="lbl">Gap</div><div class="big-num {{ color_class }}">{{ '%.1f'|format(gap) }}%</div></div>{% endif %}
    {% if s.short_float_pct %}<div class="num-block"><div class="lbl">Short Float</div><div class="big-num {{ color_class }}">{{ '%.1f'|format(s.short_float_pct) }}%</div></div>{% endif %}
    {% if s.net_insider_value %}<div class="num-block"><div class="lbl">Insider Net</div><div class="big-num {{ color_class }}">${{ '{:,.0f}'.format((s.net_insider_value or 0)|abs) }}</div></div>{% endif %}
    {% if s.implied_vol %}<div class="num-block"><div class="lbl">IV/RV Ratio</div><div class="big-num {{ color_class }}">{{ '%.1fx'|format((s.implied_vol or 0) / max(s.realized_vol or 0.01, 0.01)) }}</div></div>{% endif %}
    {% if s.put_call_ratio %}<div class="num-block"><div class="lbl">Put/Call</div><div class="big-num {{ color_class }}">{{ '%.2f'|format(s.put_call_ratio) }}</div></div>{% endif %}
  </div>
  <div class="details">
    {% if s.price_change_30d_pct %}<strong>30d change:</strong> {{ '%.1f'|format(s.price_change_30d_pct) }}% &nbsp;|&nbsp;{% endif %}
    <strong>Signal:</strong> {{ s.signal_type }} &nbsp;|&nbsp;
    <strong>Confidence:</strong> {{ s.confidence }}
  </div>
</div>
{% endfor %}
{% else %}
<div class="empty">
  No divergences above threshold detected across {{ tickers_scanned }} tickers.<br>
  All watchlist stocks look consistently priced across sources. Check back next refresh.
</div>
{% endif %}
</div>

<div class="section-title">Signal Log (Last 100)</div>
<div style="overflow-x:auto;margin-bottom:20px">
<table id="log-table">
<thead><tr>
<th data-col="0">Time</th><th data-col="1">Ticker</th><th data-col="2">Signal</th><th data-col="3">Price</th><th data-col="4">Target</th><th data-col="5">Gap%</th><th data-col="6">Confidence</th>
</tr></thead>
<tbody>
{% for r in recent %}
<tr>
<td class="local-time">{{ r.detected_at }}</td>
<td style="font-weight:700">{{ r.ticker }}</td>
<td>{{ r.signal_label }}</td>
<td>${{ '%.2f'|format(r.current_price or 0) }}</td>
<td>{{ ('$%.2f'|format(r.analyst_target)) if r.analyst_target else '—' }}</td>
<td style="color:{{ '#00d4ff' if (r.gap_pct or 0) > 0 else '#ff6b35' }}">{{ '%.1f'|format(r.gap_pct or 0) if r.gap_pct else '—' }}</td>
<td>{{ r.confidence or '—' }}</td>
</tr>
{% endfor %}
</tbody>
</table>
</div>

<div class="section-title">API Health</div>
<div class="health">
{% for h in health %}
<div class="health-item">
  <div class="dot {{ 'green' if h.status_code and h.status_code < 400 else ('red' if h.status_code else 'gray') }}"></div>
  {{ h.source }} ({{ h.response_time_ms or 0 }}ms)
</div>
{% endfor %}
</div>

<div class="disclaimer">This is market data only. Not financial advice. Not a recommendation to buy or sell any security.</div>

<script>
(function(){
  var interval={{ refresh_minutes }}*60;var el=document.getElementById('countdown');
  var start=new Date('{{ updated_at_iso }}').getTime();
  function tick(){var e=Math.floor((Date.now()-start)/1000);var r=Math.max(0,interval-e);
  var m=Math.floor(r/60);var s=r%60;el.textContent=m+':'+(s<10?'0':'')+s;
  if(r>0)requestAnimationFrame(tick);else el.textContent='Refreshing...';}tick();
})();
document.querySelectorAll('.local-time').forEach(function(el){
  var t=el.textContent.trim();if(t&&t!=='TBD'){try{el.textContent=new Date(t).toLocaleString();}catch(e){}}
});
document.querySelectorAll('#log-table th').forEach(function(th){
  th.addEventListener('click',function(){var col=parseInt(this.dataset.col);
  var tbody=document.querySelector('#log-table tbody');var rows=Array.from(tbody.querySelectorAll('tr'));
  var asc=this.dataset.asc!=='true';this.dataset.asc=asc;
  rows.sort(function(a,b){var av=a.children[col].textContent.trim();var bv=b.children[col].textContent.trim();
  var an=parseFloat(av.replace('$','')),bn=parseFloat(bv.replace('$',''));
  if(!isNaN(an)&&!isNaN(bn))return asc?an-bn:bn-an;return asc?av.localeCompare(bv):bv.localeCompare(av);});
  rows.forEach(function(r){tbody.appendChild(r);});});
});
</script>
</body>
</html>""")


def _market_status():
    now = datetime.utcnow()
    hour_et = (now.hour - 4) % 24
    weekday = now.weekday()
    if weekday >= 5:
        return "CLOSED"
    if 9 <= hour_et < 9.5:
        return "PRE-MARKET"
    if 9.5 <= hour_et < 16:
        return "OPEN"
    if 16 <= hour_et < 20:
        return "AFTER-HOURS"
    return "CLOSED"


def generate_dashboard(tickers_scanned=0, signals=None, macro=None):
    if signals is None:
        signals = logger.get_active_signals()
    if macro is None:
        macro = logger.get_latest_macro()

    recent = logger.get_recent_signals(100)
    health = logger.get_api_health_latest()

    strongest = "—"
    if signals:
        best = max(signals, key=lambda s: abs(s.get("gap_pct") or s.get("short_float_pct") or 0))
        strongest = best.get("ticker", "—")

    now = datetime.utcnow()
    html = TEMPLATE.render(
        tickers_scanned=tickers_scanned,
        signal_count=len(signals),
        strongest=strongest,
        updated_at=now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        updated_at_iso=now.isoformat() + "Z",
        refresh_minutes=config.REFRESH_INTERVAL_MINUTES,
        vix=macro.get("vix"),
        vix_elevated=macro.get("vix_elevated") or (macro.get("vix") and macro["vix"] > 25),
        yield_spread=macro.get("yield_curve_spread"),
        yield_inverted=macro.get("yield_curve_inverted") or (macro.get("yield_curve_spread") is not None and macro["yield_curve_spread"] < 0),
        treasury_10y=macro.get("treasury_10y"),
        market_status=_market_status(),
        signals=signals,
        recent=recent,
        health=health,
    )

    with open(config.DASHBOARD_OUTPUT_PATH, "w") as f:
        f.write(html)
