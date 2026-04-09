import styles from './Rules.module.css'

export function RulesPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Masters Fantasy Golf Pool</h1>
      <p className={styles.subtitle}>Official Rules</p>

      {/* Entry */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Entry</h2>
        <div className={styles.cardBody}>
          <p>
            <span className={styles.em}>$20 per person</span>. Each team drafts <span className={styles.em}>5 golfers</span> from the Masters field.
          </p>
        </div>
      </div>

      {/* Random Golfer */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Random Golfer</h2>
        <div className={styles.cardBody}>
          <p>
            After the draft locks, each team is assigned <span className={styles.em}>1 random golfer</span> from
            undrafted players. Better-ranked undrafted golfers are preferred.
          </p>
          <p>
            This gives every team a 6th golfer as insurance against cuts.
          </p>
        </div>
      </div>

      {/* Scoring */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Scoring</h2>
        <ul className={styles.ruleList}>
          <li className={styles.ruleItem}>
            Each golfer&apos;s <span className={styles.em}>Adjusted Score</span> = Masters Score (to par) + Dup Penalty
          </li>
          <li className={styles.ruleItem}>
            <span className={styles.em}>Dup Penalty</span> = (number of teams with that golfer) &minus; 1.
            Random golfers have <span className={styles.em}>0</span> dup penalty.
          </li>
          <li className={styles.ruleItem}>
            Your team score = sum of your <span className={styles.em}>best 4</span> golfers&apos; adjusted scores (lowest is best).
          </li>
          <li className={styles.ruleItem}>
            Cut/withdrawn golfers are excluded from scoring.
            Need at least <span className={styles.em}>4 active golfers</span> or the team is disqualified.
          </li>
        </ul>

        <div className={styles.divider} />

        <div className={styles.cardBody}>
          <p>
            <span className={styles.formula}>
              Team Score = Best 4 of (Score + Dup Penalty)
            </span>
          </p>
        </div>
      </div>

      {/* Score Display */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Score Display</h2>
        <div className={styles.cardBody}>
          <p>Scores are shown relative to par, just like real golf:</p>
        </div>
        <div className={styles.scoreExample}>
          <span>
            <span className={styles.scoreLabel}>Under par: </span>
            <span className={styles.scoreGood}>&minus;5</span>
          </span>
          <span>
            <span className={styles.scoreLabel}>Even par: </span>
            <span className={styles.scoreEven}>&minus;</span>
          </span>
          <span>
            <span className={styles.scoreLabel}>Over par: </span>
            <span className={styles.scoreBad}>3</span>
          </span>
        </div>
        <div className={styles.cardBody}>
          <p>Negative scores (under par) are good. Lower is better, just like real golf.</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Leaderboard</h2>
        <div className={styles.cardBody}>
          <p>
            Teams are ranked by aggregate score &mdash; <span className={styles.em}>lowest wins</span>, like golf.
            Ties are shown with a T-prefix (e.g., T3).
          </p>
        </div>
      </div>

      {/* Payouts */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Payouts</h2>
        <div className={styles.cardBody}>
          <p>Among all non-disqualified teams:</p>
        </div>
        <div className={styles.payoutGrid}>
          <div className={styles.payoutItem}>
            <span className={`${styles.payoutMedal} ${styles.medalGold}`}>1</span>
            <span className={`${styles.payoutPlace} ${styles.payoutFirst}`}>1st Place</span>
            <span className={styles.payoutPct}>50%</span>
          </div>
          <div className={styles.payoutItem}>
            <span className={`${styles.payoutMedal} ${styles.medalSilver}`}>2</span>
            <span className={`${styles.payoutPlace} ${styles.payoutSecond}`}>2nd Place</span>
            <span className={styles.payoutPct}>25%</span>
          </div>
          <div className={styles.payoutItem}>
            <span className={`${styles.payoutMedal} ${styles.medalBronze}`}>M</span>
            <span className={`${styles.payoutPlace} ${styles.payoutMiddle}`}>Middle</span>
            <span className={styles.payoutPct}>12.5%</span>
          </div>
          <div className={styles.payoutItem}>
            <span className={`${styles.payoutMedal} ${styles.medalBronze}`}>L</span>
            <span className={`${styles.payoutPlace} ${styles.payoutLast}`}>Last Place</span>
            <span className={styles.payoutPct}>12.5%</span>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.cardBody}>
          <p>
            In the event of a tie for 1st place, the 2nd place prize is eliminated
            and added to the winners&apos; purse, divided equally among those tied for 1st.
          </p>
          <p>
            If there is a tie at 2nd, Last, or Middle, winnings at that level
            are divided equally among those tied.
          </p>
        </div>
      </div>
    </div>
  )
}
