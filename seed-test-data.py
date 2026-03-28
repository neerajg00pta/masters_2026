#!/usr/bin/env python3
"""
Seed test data for Masters Pool QC:
1. Replace golfers with current Houston Open field (135 players with live scores)
2. Create 50 fake players with 50 teams (1 each)
3. Each team picks 5 golfers from the top 115 (reserving bottom 20 for randoms)
4. Assign randoms from the reserved 20
5. QC: verify rules
"""

import json
import random
import time
import requests

SUPABASE_URL = "https://fjvtfwjqyqcgrzmahqym.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnRmd2pxeXFjZ3J6bWFocXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTE3NDcsImV4cCI6MjA5MDIyNzc0N30.NY6spOQi6MjdClXIANGlq8MDCdZf4nnJJN-GArRXLEM"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def api(method, table, data=None, params=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    r = getattr(requests, method)(url, headers=HEADERS, json=data)
    if r.status_code >= 400:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
    return r

def clear_all():
    print("Clearing existing data...")
    api("delete", "selections", params={"id": "neq."})
    api("delete", "score_snapshots", params={"id": "neq."})
    api("delete", "teams", params={"id": "neq."})
    # Keep admin user u1, delete others
    api("delete", "users", params={"id": "neq.u1"})
    api("delete", "golfers", params={"id": "neq."})
    # Reset config
    api("patch", "config", {"pool_locked": False, "randoms_assigned": False, "live_scoring": False}, params={"id": "eq.1"})
    print("  Done")

def fetch_espn_field():
    print("Fetching ESPN Houston Open field...")
    r = requests.get("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard")
    d = r.json()
    event = d["events"][0]
    print(f"  Tournament: {event['name']}")
    comp = event["competitions"][0]
    competitors = comp["competitors"]

    golfers = []
    for c in competitors:
        ath = c.get("athlete", {})
        name = ath.get("displayName", "")
        if not name:
            continue
        score = c.get("score", 0)
        if isinstance(score, str):
            score = 0 if score == "E" else int(score) if score.lstrip("+-").isdigit() else 0
        order = c.get("order", 999)

        # Derive thru from linescores
        thru = ""
        current_round = comp.get("status", {}).get("period", 0)
        linescores = c.get("linescores", [])
        if current_round > 0:
            for ls in linescores:
                if ls.get("period") == current_round:
                    val = ls.get("value")
                    disp = ls.get("displayValue", "")
                    if val and val > 0:
                        thru = "F"
                    elif disp and disp != "-":
                        thru = disp
                    break
        if not thru:
            completed = sum(1 for ls in linescores if ls.get("value") and ls["value"] > 0)
            if completed >= current_round and current_round > 0:
                thru = "F"
            else:
                thru = "--"

        status_desc = c.get("status", {}).get("type", {}).get("description", "").lower()
        status = "active"
        if "cut" in status_desc:
            status = "cut"
        elif "wd" in status_desc or "withdrawn" in status_desc:
            status = "withdrawn"

        golfers.append({
            "name": name,
            "espn_name": name,  # exact match since we're using ESPN names
            "score_to_par": score,
            "today": 0,
            "thru": thru,
            "status": status,
            "sort_order": order,
            "odds_numeric": order,  # use position as odds proxy
            "odds": f"+{order * 100}",
        })

    print(f"  Found {len(golfers)} golfers")
    return golfers

def seed_golfers(golfers):
    print("Seeding golfers...")
    rows = []
    for i, g in enumerate(golfers):
        rows.append({
            "id": f"g{i+1}",
            "name": g["name"],
            "espn_name": g["espn_name"],
            "odds": g["odds"],
            "odds_numeric": g["odds_numeric"],
            "score_to_par": g["score_to_par"],
            "today": g["today"],
            "thru": g["thru"],
            "status": g["status"],
            "sort_order": g["sort_order"],
            "score_locked": False,
        })

    # Batch insert (supabase handles up to 1000)
    r = api("post", "golfers", rows)
    print(f"  Inserted {len(rows)} golfers")
    return rows

def create_fake_players(n=50):
    print(f"Creating {n} fake players...")
    first_names = ["Alex", "Ben", "Chris", "Dan", "Emma", "Frank", "Grace", "Hank",
                   "Ivy", "Jack", "Kate", "Leo", "Mia", "Nick", "Olivia", "Pat",
                   "Quinn", "Rob", "Sam", "Tom", "Uma", "Vince", "Wendy", "Xander",
                   "Yuki", "Zoe", "Aaron", "Beth", "Cal", "Dee", "Ed", "Fay",
                   "Gus", "Helen", "Ian", "Jill", "Ken", "Liz", "Max", "Nina",
                   "Oscar", "Pam", "Ray", "Sue", "Tim", "Val", "Walt", "Xena",
                   "Yuri", "Zack"]

    users = []
    for i in range(n):
        name = first_names[i] if i < len(first_names) else f"Player{i+1}"
        uid = f"u{int(time.time()*1000) + i}"
        user = {
            "id": uid,
            "name": name[:8],
            "full_name": f"{name} TestUser",
            "email": f"{name.lower()}{i}@test.com",
            "admin": False,
            "paid": random.random() > 0.2,  # 80% paid
        }
        users.append(user)
        time.sleep(0.001)  # ensure unique IDs

    api("post", "users", users)
    print(f"  Created {len(users)} users")
    return users

def create_teams_and_picks(users, golfers, reserve_count=20):
    print(f"Creating teams and picks (reserving {reserve_count} golfers for randoms)...")

    # Golfers available for manual picks (top N - reserve_count)
    pickable = golfers[:len(golfers) - reserve_count]
    reserved = golfers[len(golfers) - reserve_count:]
    print(f"  Pickable: {len(pickable)}, Reserved for randoms: {len(reserved)}")

    all_teams = []
    all_selections = []

    team_names = [
        "Eagle Eyes", "Birdie Brigade", "Par Stars", "Bogey Boys", "Albatross Club",
        "Green Jackets", "Fairway Kings", "Sand Trap", "Iron Will", "Putter Perfect",
        "Ace Squad", "Double Eagle", "Chip Shot", "Driving Force", "Back Nine",
        "Front Nine", "Pin Seekers", "Hole in One", "The Caddies", "Rough Riders",
        "Tee Time", "The Mulligans", "Wedge Warriors", "Hook Shot", "Slice of Life",
        "Bunker Busters", "Fore Play", "Happy Gilmore", "Tin Cup", "The Links",
        "Augusta Aces", "Amen Corner", "Tiger's Cubs", "Palmer's Army", "Hogan's Heroes",
        "Nicklaus Nines", "Player's Club", "Watson's Way", "Faldo's Finest", "Seve's Spirit",
        "The Sharks", "Lefty's Gang", "DJ's Crew", "Speith Stars", "Rory's Rorys",
        "JT's Jacks", "Koepka's Crew", "Rahm's Raiders", "Hovland's Heroes", "Aberg's Aces"
    ]

    for i, user in enumerate(users):
        tid = f"t{int(time.time()*1000) + i}"
        team = {
            "id": tid,
            "user_id": user["id"],
            "team_name": team_names[i] if i < len(team_names) else f"Team {i+1}",
        }
        all_teams.append(team)

        # Pick 5 random golfers from pickable pool
        picks = random.sample(pickable, 5)
        for j, g in enumerate(picks):
            sel = {
                "id": f"s{int(time.time()*1000) + i*10 + j}",
                "team_id": tid,
                "golfer_id": g["id"],
                "is_random": False,
            }
            all_selections.append(sel)

        time.sleep(0.001)

    # Give first 5 users a second team
    for i in range(5):
        user = users[i]
        tid2 = f"t2{int(time.time()*1000) + i}"
        team2 = {
            "id": tid2,
            "user_id": user["id"],
            "team_name": f"{team_names[i]} B",
        }
        all_teams.append(team2)

        picks2 = random.sample(pickable, 5)
        for j, g in enumerate(picks2):
            sel = {
                "id": f"s2{int(time.time()*1000) + i*10 + j}",
                "team_id": tid2,
                "golfer_id": g["id"],
                "is_random": False,
            }
            all_selections.append(sel)
        time.sleep(0.001)

    api("post", "teams", all_teams)
    print(f"  Created {len(all_teams)} teams (50 primary + 5 second teams)")

    api("post", "selections", all_selections)
    print(f"  Created {len(all_selections)} selections (5 per team)")

    return all_teams, all_selections, reserved

def assign_randoms(teams, golfers_rows, selections, reserved_golfers):
    print("Assigning randoms...")

    # Get IDs of all golfers already selected
    used_ids = set(s["golfer_id"] for s in selections)

    # Available = reserved golfers not already picked (should be all of them)
    available = [g for g in reserved_golfers if g["id"] not in used_ids and g.get("status", "active") == "active"]
    available.sort(key=lambda g: g["sort_order"])

    print(f"  Available for random: {len(available)}")
    print(f"  Teams needing random: {len(teams)}")

    # Shuffle teams
    shuffled = list(teams)
    random.shuffle(shuffled)

    assignments = []
    if len(available) >= len(shuffled):
        # Unique assignment
        for i, team in enumerate(shuffled):
            assignments.append({
                "id": f"sr{int(time.time()*1000) + i}",
                "team_id": team["id"],
                "golfer_id": available[i]["id"],
                "is_random": True,
            })
    else:
        # Round-robin
        for i, team in enumerate(shuffled):
            assignments.append({
                "id": f"sr{int(time.time()*1000) + i}",
                "team_id": team["id"],
                "golfer_id": available[i % len(available)]["id"],
                "is_random": True,
            })

    api("post", "selections", assignments)

    # Mark config
    api("patch", "config", {"randoms_assigned": True}, params={"id": "eq.1"})

    print(f"  Assigned {len(assignments)} randoms")

    # Check for duplicates
    random_golfer_ids = [a["golfer_id"] for a in assignments]
    unique_randoms = set(random_golfer_ids)
    if len(unique_randoms) < len(random_golfer_ids):
        dup_count = len(random_golfer_ids) - len(unique_randoms)
        print(f"  NOTE: {dup_count} duplicate random assignments (expected if teams > available)")
    else:
        print(f"  All {len(unique_randoms)} random assignments are unique")

    return assignments

def qc(golfers_rows, teams, selections, random_assignments):
    print("\n=== QC REPORT ===\n")

    golfer_map = {g["id"]: g for g in golfers_rows}

    # 1. Every team has exactly 6 golfers (5 picks + 1 random)
    all_sels = selections + random_assignments
    team_sels = {}
    for s in all_sels:
        tid = s["team_id"]
        if tid not in team_sels:
            team_sels[tid] = []
        team_sels[tid].append(s)

    print(f"Total teams: {len(teams)}")

    errors = []
    for t in teams:
        sels = team_sels.get(t["id"], [])
        picks = [s for s in sels if not s["is_random"]]
        randoms = [s for s in sels if s["is_random"]]
        if len(picks) != 5:
            errors.append(f"  Team '{t['team_name']}' has {len(picks)} picks (expected 5)")
        if len(randoms) != 1:
            errors.append(f"  Team '{t['team_name']}' has {len(randoms)} randoms (expected 1)")
        if len(sels) != 6:
            errors.append(f"  Team '{t['team_name']}' has {len(sels)} total (expected 6)")

    if errors:
        print("ERRORS:")
        for e in errors:
            print(e)
    else:
        print("✓ Every team has exactly 5 picks + 1 random = 6 golfers")

    # 2. Dup penalty check
    golfer_team_count = {}
    for s in all_sels:
        if not s["is_random"]:
            gid = s["golfer_id"]
            golfer_team_count[gid] = golfer_team_count.get(gid, 0) + 1

    duped = {gid: count for gid, count in golfer_team_count.items() if count > 1}
    print(f"\n✓ Golfers on multiple teams (dup penalty): {len(duped)}")
    for gid, count in sorted(duped.items(), key=lambda x: -x[1])[:10]:
        g = golfer_map.get(gid, {})
        print(f"    {g.get('name', gid)}: on {count} teams, dup penalty = {count - 1}")

    # 3. Random golfers should have 0 dup penalty
    random_gids = set(a["golfer_id"] for a in random_assignments)
    random_dups = [gid for gid in random_gids if golfer_team_count.get(gid, 0) > 0]
    if random_dups:
        print(f"\n⚠ {len(random_dups)} random golfers are also on teams as manual picks")
        for gid in random_dups[:5]:
            g = golfer_map.get(gid, {})
            print(f"    {g.get('name', gid)}: manual picks = {golfer_team_count[gid]}")
        print("  (These get 0 dup penalty when scored as random)")
    else:
        print(f"\n✓ All {len(random_gids)} random golfers are unique to the random pool")

    # 4. Score a sample team
    print(f"\n--- Sample Team Scoring ---")
    sample_team = teams[0]
    sels = team_sels[sample_team["id"]]
    print(f"Team: {sample_team['team_name']}")

    scored = []
    for s in sels:
        g = golfer_map[s["golfer_id"]]
        is_random = s["is_random"]
        dup_count = golfer_team_count.get(s["golfer_id"], 0)
        dup_penalty = 0 if is_random else max(0, dup_count - 1)
        adj = g["score_to_par"] + dup_penalty
        scored.append((g["name"], g["score_to_par"], dup_penalty, adj, is_random, g["status"]))

    scored.sort(key=lambda x: x[3])  # sort by adj
    for i, (name, masters, dups, adj, is_rand, status) in enumerate(scored):
        badge = " [RND]" if is_rand else ""
        cut = " [CUT]" if status == "cut" else ""
        counting = " *" if i < 4 and status == "active" else ""
        print(f"  {adj:+3d} = {masters:+3d} masters + {dups} dups  {name}{badge}{cut}{counting}")

    active_scores = [adj for (_, _, _, adj, _, st) in scored if st == "active"]
    if len(active_scores) >= 4:
        team_score = sum(sorted(active_scores)[:4])
        print(f"  Best 4 = {team_score:+d}")
    else:
        print(f"  DISQUALIFIED (only {len(active_scores)} active golfers)")

    print(f"\n=== QC COMPLETE ===")

# Run it
if __name__ == "__main__":
    clear_all()
    espn_golfers = fetch_espn_field()
    golfer_rows = seed_golfers(espn_golfers)
    users = create_fake_players(50)
    teams, selections, reserved = create_teams_and_picks(users, golfer_rows, reserve_count=20)
    random_assignments = assign_randoms(teams, golfer_rows, selections, reserved)
    qc(golfer_rows, teams, selections, random_assignments)
