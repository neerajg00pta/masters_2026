Build a spec for a masters fantasy golf game:

Participant:  Name, email, one or more teams (each with a team name)

For each team:
- Participant picks any 5 golfers from the masters field (system will have to provide a selecton screen, fuzzy match, that shows players and odds, ranked by odds).  
- Can be changed as much as they want by the participant (or admin) until locked.

Once locked, admin will have ability to "assign random golfers":
- When op selects this button, system will determine which golfers are not on any team
- Each team will have one random unused golfer assigned
- If # teams < # randoms, no duplicate assignements.  Else, duplicates random usage is allowed, trying to minimize.
- Prefer to assign higher ranked randoms than lower ranked ones

Game play:
- Each team gets aggregate score of their top 4 golfers
- Each golfer's score is their current score-to-par + "dup penalty"
- Dup penalty = # of teams that golfer is on - 1, Randoms always have 0 dup penalty
- Players missing the cut after friday are excluded, a team must have at least 4 remaining players to remain in contention.

Two leaderboards side by side on one page (each can be fully collapsed)

Team Leaderboard
- Teams, ranked by aggregate score desc as defined above
  - collapsed to one row per team
  - team exapnsion
    - each team row can be opened to see their golfers (if cut, grey them out).  badge for randoms.
    - best scoring golfer first.  line after 4th golfer
  - disqualified teams slot to bottom
  - Shows Rank (1, 2, T3, T3, 5, ... )
  - Showw change in rank from yesterday (green:up arrow with places moved, red:down arrow with places moved).
- Participants own teams are pinned to top
- Participants can star other teams to pin to top

Player Leaderboard: order by total score, desc
  - Player, actual score, dups pentaly, total score
  - Randoms badge


Payout highlighting (in all cases including ties)
  - Top team highlighted: (best color)
  - Second team highlighted: (second best color)
  - Last qualifying team highlited (third color)
  - Middle qualifying team highlited (also the third color, round down if required)
  

Colors:
  - Light mode
  - Masters green, black, gold, masters color pallete
  
 
