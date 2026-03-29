# Masters Fantasy Golf Pool — Gameplay Rules

## Overview

A fantasy pool game for the Masters Tournament at Augusta National. Participants build teams of golfers before the tournament, then score points based on those golfers' real performance across all four rounds. **Lower scores win**, just like real golf.

---

## Participants & Teams

- Each participant can create **1 or more teams**.
- Each team has a **team name** chosen by the participant.
- A single participant may have multiple teams; teams are the unit of competition, not participants.

---

## The Draft (Pre-Tournament)

- Each team selects **5 golfers** from the Masters field.
- Golfers are presented ranked by betting odds (favorites first) to help with selection.
- **Golfers are not exclusive** — multiple teams can draft the same golfer. However, doing so incurs a duplication penalty (see Scoring below).
- Picks can be changed freely by the participant (or by an admin) at any time **before the pool is locked**.
- The pool is locked before the tournament begins. No changes after lock.

---

## Random Golfer Assignment (Post-Lock)

After the pool is locked, each team receives **1 additional random golfer** (bringing the roster to 6):

- The random golfer is drawn from golfers **not drafted by any team**.
- Higher-ranked undrafted golfers are preferred (better players assigned first).
- If the number of teams is less than the number of undrafted golfers, each team gets a **unique** random golfer (no duplicates).
- If there are more teams than undrafted golfers, duplicates are allowed but minimized.
- Random golfers serve as insurance against cuts — they give every team a 6th golfer.

---

## Scoring

### Golfer Adjusted Score

Each golfer's **Adjusted Score** is calculated as:

```
Adjusted Score = Masters Score (relative to par) + Dup Penalty
```

- **Masters Score** is the golfer's actual tournament score relative to par (e.g., -5 means 5 under par).
- **Dup Penalty** = (number of teams that drafted that golfer) − 1.
  - A golfer on 1 team has a dup penalty of 0.
  - A golfer on 3 teams has a dup penalty of +2.
  - **Random golfers always have a dup penalty of 0**, regardless of how many teams they appear on.

### Team Score

```
Team Score = Sum of the best 4 Adjusted Scores among active golfers
```

- Only the **top 4** (lowest-scoring) golfers on each team count toward the team score.
- The remaining golfer(s) are benched — they provide a cushion if someone misses the cut.
- **Lower team scores are better**, just like real golf.

### Score Display

Scores are shown relative to par:

| Display | Meaning |
|---------|---------|
| −5 | 5 under par (good) |
| E | Even par |
| +3 | 3 over par (bad) |

---

## The Cut & Disqualification

- After Round 2 (Friday), golfers who miss the cut are **excluded from scoring** — they cannot count toward a team's top 4.
- Withdrawn (WD) golfers are also excluded.
- A team must have **at least 4 active golfers** (not cut/withdrawn) to remain in contention.
- Teams with fewer than 4 active golfers are **disqualified** and drop to the bottom of the leaderboard.

---

## Leaderboard

### Team Leaderboard

- Teams are ranked by aggregate team score — **lowest wins**.
- Ties use a T-prefix (e.g., T3 means tied for 3rd).
- Each team row can be expanded to show its golfers:
  - Golfers are sorted best-to-worst (lowest adjusted score first).
  - A line is drawn after the 4th golfer (the scoring cutoff).
  - Cut/withdrawn golfers are greyed out.
  - Random golfers are marked with a badge.
- **Rank change arrows** show movement from the previous day (green up-arrow, red down-arrow, with number of places moved).
- Disqualified teams are pushed to the bottom.
- The logged-in participant's own teams are **pinned to the top**.
- Participants can **star** other teams to pin them to the top as well.

### Field Leaderboard

- Shows all golfers in the Masters field, ranked by total score.
- Columns: Player Name, Actual Score (to par), Dup Penalty, Adjusted Score.
- Random golfers are marked with a badge.

---

## Payouts

Four payout positions among non-disqualified teams (ties split the payout):

| Position | Description |
|----------|-------------|
| **1st Place** | Best (lowest) team score |
| **2nd Place** | Second-best team score |
| **Last Place** | Worst (highest) team score among non-disqualified teams |
| **Middle Place** | The team in the exact middle of the standings (round down if even number of teams) |

Payout positions are highlighted on the leaderboard with distinct colors (gold, silver, and bronze tones). Ties at a payout position split that payout.

---

## Timeline

| Phase | When | What Happens |
|-------|------|-------------|
| **Draft** | Before tournament | Participants create teams, pick 5 golfers each |
| **Lock** | Just before Round 1 | Pool locks, random golfers assigned |
| **Round 1** (Thursday) | Tournament day 1 | Scores update live, leaderboard active |
| **Round 2** (Friday) | Tournament day 2 | Cut applied after this round |
| **Round 3** (Saturday) | Tournament day 3 | "Moving Day" — scores continue |
| **Round 4** (Sunday) | Tournament day 4 | Final scores determine winners |
| **Settle** | After tournament | Payouts distributed |

---

## Key Strategy Notes

- **Duplication penalty creates a dilemma**: picking the obvious favorites (e.g., Scottie Scheffler) is tempting, but if many teams pick the same golfer, the +N dup penalty erodes the advantage.
- **Random golfers are penalty-free**: your random assignment carries no dup penalty even if other teams also received that golfer randomly. This makes them potentially high-value.
- **6 golfers, count 4**: you have a 2-golfer cushion against cuts. Picking 5 golfers likely to make the cut is safer than going all-in on longshots.
- **Multiple teams per participant**: you can hedge by building teams with different strategies (favorites-heavy, value picks, balanced, etc.).

---

## Glossary

| Term | Definition |
|------|-----------|
| **Adjusted Score** | A golfer's Masters score-to-par plus their duplication penalty |
| **Dup Penalty** | Extra strokes added per golfer based on how many teams drafted them (−1). Zero for randoms. |
| **Random Golfer** | A 6th golfer auto-assigned from the undrafted pool after lock |
| **Team Score** | Sum of the best 4 adjusted scores on a team |
| **The Cut** | After Round 2, the bottom half of the field is eliminated from the tournament |
| **Disqualified Team** | A team with fewer than 4 active golfers — cannot win |
| **Pinned** | A team stuck to the top of the leaderboard for easy tracking |
| **Field Leaderboard** | Leaderboard showing individual golfer scores (not team scores) |
