from jinja2 import Template
from datetime import datetime

import config
import logger

TEMPLATE = Template("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Divergence Detector</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0f1117;color:#fff;min-height:100vh;padding:20px}
.header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:24px 32px;background:#1a1d2e;border-radius:16px;margin-bottom:24px;border:1px solid #2a2d3e}
.header h1{font-size:24px;font-weight:900;letter-spacing:2px;color:#00d4ff}
.header-stats{display:flex;gap:32px;flex-wrap:wrap}
.stat{text-align:center}
.stat-value{font-size:28px;font-weight:700;color:#fff}
.stat-label{font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.meta{color:#8b8fa8;font-size:12px;text-align:right}
.meta span{display:block}
#countdown{color:#00d4ff;font-weight:600}
.cards{display:flex;flex-direction:column;gap:16px;margin-bottom:32px}
.card{background:#1a1d2e;border-radius:12px;padding:24px 28px;border:1px solid #2a2d3e;position:relative;transition:box-shadow .2s}
.card.glow-high{border-color:#00d4ff;box-shadow:0 0 20px rgba(0,212,255,.15)}
.card.glow-high.negative{border-color:#ff6b35;box-shadow:0 0 20px rgba(255,107,53,.15)}
.card.glow-mid{border-left:4px solid #00d4ff}
.card.glow-mid.negative{border-left-color:#ff6b35}
.badge{position:absolute;top:16px;right:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 10px;border-radius:4px;background:rgba(0,212,255,.15);color:#00d4ff}
.badge.negative{background:rgba(255,107,53,.15);color:#ff6b35}
.card-headline{font-size:18px;font-weight:700;margin-bottom:8px;padding-right:140px}
.card-summary{font-size:14px;color:#ccc;margin-bottom:16px;line-height:1.5}
.numbers{display:grid;grid-template-columns:1fr 1fr auto;gap:24px;align-items:center;margin-bottom:16px}
.num-block label{font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:2px}
.num-block .value{font-size:20px;font-weight:700}
.divergence-value{font-size:32px;font-weight:900}
.divergence-value.pos{color:#00d4ff}
.divergence-value.neg{color:#ff6b35}
.interpretation{font-size:13px;color:#ccc;margin-bottom:12px;line-height:1.5;padding:10px 14px;background:rgba(255,255,255,.03);border-radius:8px}
.details{font-size:12px;color:#8b8fa8;line-height:1.7}
.details strong{color:#ccc}
.empty{text-align:center;padding:80px 20px;color:#8b8fa8;font-size:16px}
.section-title{font-size:16px;font-weight:700;margin-bottom:12px;color:#8b8fa8;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;font-size:12px;background:#1a1d2e;border-radius:8px;overflow:hidden}
th{background:#22263a;color:#8b8fa8;text-transform:uppercase;letter-spacing:.5px;padding:10px 12px;text-align:left;cursor:pointer;user-select:none}
th:hover{color:#fff}
td{padding:8px 12px;border-top:1px solid #2a2d3e;color:#ccc}
tr:hover td{background:rgba(255,255,255,.02)}
.health{display:flex;gap:16px;flex-wrap:wrap;margin-top:16px}
.health-item{display:flex;align-items:center;gap:6px;font-size:12px;color:#8b8fa8}
.dot{width:8px;height:8px;border-radius:50%}
.dot.green{background:#22c55e}
.dot.red{background:#ef4444}
.dot.gray{background:#6b7280}
.quota{margin-top:8px;font-size:12px;color:#8b8fa8}
</style>
</head>
<body>
<div class="header">
  <h1>DIVERGENCE DETECTOR</h1>
  <div class="header-stats">
    <div class="stat"><div class="stat-value">{{ total_events }}</div><div class="stat-label">Events Scanned</div></div>
    <div class="stat"><div class="stat-value">{{ flagged_count }}</div><div class="stat-label">Opportunities</div></div>
    <div class="stat"><div class="stat-value">{{ "%.1f"|format(max_divergence) }}%</div><div class="stat-label">Max Divergence</div></div>
  </div>
  <div class="meta">
    <span>Updated: <strong id="updated">{{ updated_at }}</strong></span>
    <span>Next refresh: <strong id="countdown">--:--</strong></span>
  </div>
</div>

<div class="cards">
{% if opportunities %}
{% for opp in opportunities %}
{% set abs_div = opp.divergence_pct|abs %}
{% set is_neg = opp.divergence_pct < 0 %}
<div class="card {{ 'glow-high' if abs_div >= 10 else ('glow-mid' if abs_div >= 5 else '') }} {{ 'negative' if is_neg else '' }}">
  <div class="badge {{ 'negative' if is_neg else '' }}">{{ 'SPORTSBOOKS FAVOR' if is_neg else 'PREDICTION MARKET FAVORS' }}</div>
  <div class="card-headline">{{ opp.sport|upper|replace('_',' ') }} &mdash; {{ opp.event_name }}</div>
  <div class="card-summary">
    The betting sites think {{ opp.outcome }} has a {{ "%.0f"|format(opp.consensus_sportsbook_prob * 100) }}% chance.
    The prediction market gives them {{ "%.0f"|format(opp.prediction_market_prob * 100) }}%.
    That's a {{ "%.1f"|format(abs_div) }}-point gap.
  </div>
  <div class="numbers">
    <div class="num-block">
      <label>Sportsbooks say</label>
      <div class="value">{{ "%.1f"|format(opp.consensus_sportsbook_prob * 100) }}%</div>
      <div style="font-size:11px;color:#8b8fa8">avg across {{ opp.sportsbook_count }} books</div>
    </div>
    <div class="num-block">
      <label>{{ opp.prediction_market_source|capitalize }} says</label>
      <div class="value">{{ "%.1f"|format(opp.prediction_market_prob * 100) }}%</div>
      {% if opp.prediction_market_volume %}<div style="font-size:11px;color:#8b8fa8">${{ "{:,.0f}".format(opp.prediction_market_volume) }} volume</div>{% endif %}
    </div>
    <div class="num-block" style="text-align:center">
      <label>Divergence</label>
      <div class="divergence-value {{ 'neg' if is_neg else 'pos' }}">{{ "%.1f"|format(abs_div) }}pp</div>
    </div>
  </div>
  <div class="interpretation">
    {% if is_neg %}
    The prediction market is pricing {{ opp.outcome }} LOWER than the sportsbooks. If the prediction market is right, {{ opp.outcome }} may be overpriced at sportsbooks.
    {% else %}
    The prediction market is pricing {{ opp.outcome }} HIGHER than the sportsbooks. If the prediction market is right, {{ opp.outcome }} may be underpriced at sportsbooks.
    {% endif %}
  </div>
  <div class="details">
    <strong>Game time:</strong> <span class="local-time">{{ opp.event_commence_time or 'TBD' }}</span><br>
    <strong>Source:</strong> {{ opp.prediction_market_source|capitalize }}<br>
    <strong>Match confidence:</strong> {{ "%.0f"|format((opp.match_confidence or 0) * 100) }}%<br>
    {% if opp.espn_injury_flag %}<strong>Injury alert:</strong> {{ opp.espn_injury_notes }}<br>{% endif %}
  </div>
</div>
{% endfor %}
{% else %}
<div class="empty">
  No divergences above {{ threshold }}% detected in this cycle.<br>
  Markets look efficiently priced right now. Check back next refresh.
</div>
{% endif %}
</div>

<div class="section-title">Recent Log (Last 50)</div>
<div style="overflow-x:auto;margin-bottom:24px">
<table id="log-table">
<thead><tr>
<th data-col="0">Time</th><th data-col="1">Sport</th><th data-col="2">Event</th><th data-col="3">Outcome</th><th data-col="4">Sportsbook</th><th data-col="5">Pred Mkt</th><th data-col="6">Div%</th><th data-col="7">Source</th>
</tr></thead>
<tbody>
{% for r in recent %}
<tr>
<td class="local-time">{{ r.detected_at }}</td>
<td>{{ r.sport }}</td>
<td>{{ r.event_name }}</td>
<td>{{ r.outcome }}</td>
<td>{{ "%.1f"|format((r.consensus_sportsbook_prob or 0) * 100) }}%</td>
<td>{{ "%.1f"|format((r.prediction_market_prob or 0) * 100) }}%</td>
<td style="color:{{ '#ff6b35' if (r.divergence_pct or 0) < 0 else '#00d4ff' }}">{{ "%.1f"|format(r.divergence_pct or 0) }}</td>
<td>{{ r.prediction_market_source }}</td>
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
{% if quota_remaining %}
<div class="quota">Odds API quota remaining: {{ quota_remaining }}</div>
{% endif %}

<script>
// Countdown timer
(function(){
  var interval = {{ refresh_minutes }} * 60;
  var el = document.getElementById('countdown');
  var start = new Date('{{ updated_at_iso }}').getTime();
  function tick(){
    var elapsed = Math.floor((Date.now() - start) / 1000);
    var remain = Math.max(0, interval - elapsed);
    var m = Math.floor(remain / 60);
    var s = remain % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    if(remain > 0) requestAnimationFrame(tick);
    else el.textContent = 'Refreshing...';
  }
  tick();
})();

// Convert UTC times to local
document.querySelectorAll('.local-time').forEach(function(el){
  var t = el.textContent.trim();
  if(t && t !== 'TBD'){
    try{ el.textContent = new Date(t).toLocaleString(); }catch(e){}
  }
});

// Table sort
document.querySelectorAll('#log-table th').forEach(function(th){
  th.addEventListener('click', function(){
    var col = parseInt(this.dataset.col);
    var tbody = document.querySelector('#log-table tbody');
    var rows = Array.from(tbody.querySelectorAll('tr'));
    var asc = this.dataset.asc !== 'true';
    this.dataset.asc = asc;
    rows.sort(function(a,b){
      var av = a.children[col].textContent.trim();
      var bv = b.children[col].textContent.trim();
      var an = parseFloat(av), bn = parseFloat(bv);
      if(!isNaN(an) && !isNaN(bn)) return asc ? an-bn : bn-an;
      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    rows.forEach(function(r){ tbody.appendChild(r); });
  });
});
</script>
</body>
</html>""")


def generate_dashboard(total_events=0, opportunities=None, quota_remaining=None):
    if opportunities is None:
        opportunities = logger.get_active_opportunities()

    recent = logger.get_recent_opportunities(50)
    health = logger.get_api_health_latest()

    flagged_count = len(opportunities)
    max_divergence = max((abs(o.get("divergence_pct", 0)) for o in opportunities), default=0)
    now = datetime.utcnow()

    html = TEMPLATE.render(
        total_events=total_events,
        flagged_count=flagged_count,
        max_divergence=max_divergence,
        updated_at=now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        updated_at_iso=now.isoformat() + "Z",
        refresh_minutes=config.REFRESH_INTERVAL_MINUTES,
        threshold=config.DIVERGENCE_THRESHOLD_PERCENTAGE,
        opportunities=opportunities,
        recent=recent,
        health=health,
        quota_remaining=quota_remaining,
    )

    with open(config.DASHBOARD_OUTPUT_PATH, "w") as f:
        f.write(html)


if __name__ == "__main__":
    sample = [{
        "sport": "basketball_nba",
        "event_name": "Boston Celtics vs New York Knicks",
        "event_commence_time": "2025-11-15T19:30:00Z",
        "outcome": "Boston Celtics",
        "consensus_sportsbook_prob": 0.62,
        "sportsbook_count": 8,
        "prediction_market_source": "polymarket",
        "prediction_market_prob": 0.51,
        "prediction_market_volume": 125000,
        "divergence_pct": -11.0,
        "divergence_direction": "sportsbook_higher",
        "match_confidence": 0.95,
        "espn_injury_flag": True,
        "espn_injury_notes": "Jaylen Brown (BOS) - questionable (knee)",
    }]
    generate_dashboard(total_events=42, opportunities=sample)
    print(f"Dashboard generated: {config.DASHBOARD_OUTPUT_PATH}")
