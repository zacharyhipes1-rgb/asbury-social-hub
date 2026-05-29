import requests

ENDPOINTS = {
    "americanfootball_nfl": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    "americanfootball_ncaaf": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
    "basketball_nba": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    "basketball_ncaab": "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DivergenceAgent/1.0)"}


def _parse_events(data):
    events = []
    for ev in data.get("events", []):
        comp = ev.get("competitions", [{}])[0]
        teams = []
        injury_notes = []
        for t in comp.get("competitors", []):
            team_info = t.get("team", {})
            teams.append({
                "name": team_info.get("displayName", ""),
                "abbreviation": team_info.get("abbreviation", ""),
                "home_away": t.get("homeAway", ""),
            })
            for inj in t.get("injuries", []):
                for entry in inj.get("entries", []):
                    athlete = entry.get("athlete", {})
                    injury_notes.append(
                        f"{athlete.get('displayName', '?')} ({team_info.get('abbreviation', '?')}) - {entry.get('description', 'unknown')}"
                    )

        status = comp.get("status", {}).get("type", {}).get("name", "")
        events.append({
            "id": ev.get("id"),
            "name": ev.get("name", ""),
            "short_name": ev.get("shortName", ""),
            "start_time": ev.get("date"),
            "status": status,
            "teams": teams,
            "has_injuries": len(injury_notes) > 0,
            "injury_notes": injury_notes,
        })
    return events


def fetch_scoreboard(sport_key):
    url = ENDPOINTS.get(sport_key)
    if not url:
        return [], 0, 0
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        events = _parse_events(resp.json())
        return events, resp.status_code, resp.elapsed.total_seconds() * 1000
    except requests.RequestException:
        return [], 0, 0


def fetch_all():
    all_events = []
    for sport_key in ENDPOINTS:
        events, _, _ = fetch_scoreboard(sport_key)
        for e in events:
            e["sport_key"] = sport_key
        all_events.extend(events)
    return all_events


if __name__ == "__main__":
    events = fetch_all()
    print(f"Found {len(events)} ESPN events across all sports")
    for e in events[:5]:
        inj = f" [INJURIES: {len(e['injury_notes'])}]" if e["has_injuries"] else ""
        print(f"  {e['sport_key']}: {e['name']} ({e['status']}){inj}")
        for note in e["injury_notes"][:2]:
            print(f"    - {note}")
