export interface MastersFieldEntry {
  id: string               // Stable DB ID (e.g. "g1") — never derived from array position
  name: string
  odds: string            // American format: "+400"
  oddsFractional: string  // Fractional format: "4/1"
  oddsNumeric: number     // Fractional numerator (4 for 4/1, lower = better)
  worldRank: number | null
  withdrawn?: boolean     // true if golfer has withdrawn from tournament
}

/**
 * Convert fractional odds numerator to American format.
 * For positive fractional odds (e.g. 4/1), American = numerator * 100.
 */
function toAmerican(numerator: number): string {
  return `+${numerator * 100}`
}

function entry(id: string, name: string, numerator: number, denominator = 1): MastersFieldEntry {
  return {
    id,
    name,
    odds: toAmerican(numerator),
    oddsFractional: `${numerator}/${denominator}`,
    oddsNumeric: numerator / denominator,
    worldRank: null,
  }
}

function wd(id: string, name: string, numerator: number, denominator = 1): MastersFieldEntry {
  return { ...entry(id, name, numerator, denominator), withdrawn: true }
}

export const MASTERS_2026_FIELD: MastersFieldEntry[] = [
  entry('g1', 'Scottie Scheffler', 4),
  entry('g2', 'Rory McIlroy', 7),
  entry('g3', 'Bryson DeChambeau', 10),
  entry('g4', 'Jon Rahm', 12),
  entry('g5', 'Ludvig Aberg', 16),
  entry('g6', 'Xander Schauffele', 18),
  entry('g7', 'Tommy Fleetwood', 18),
  entry('g8', 'Collin Morikawa', 22),
  entry('g9', 'Cameron Young', 27),
  entry('g10', 'Justin Rose', 30),
  entry('g11', 'Matt Fitzpatrick', 30),
  entry('g12', 'Patrick Reed', 30),
  entry('g13', 'Chris Gotterup', 35),
  entry('g14', 'Hideki Matsuyama', 35),
  entry('g15', 'Viktor Hovland', 35),
  entry('g16', 'Brooks Koepka', 38),
  entry('g17', 'Robert MacIntyre', 40),
  entry('g18', 'Justin Thomas', 40),
  entry('g19', 'Tyrrell Hatton', 40),
  entry('g20', 'Jordan Spieth', 40),
  entry('g21', 'Shane Lowry', 45),
  entry('g22', 'Patrick Cantlay', 50),
  entry('g23', 'Ben Griffin', 55),
  entry('g24', 'Akshay Bhatia', 60),
  entry('g25', 'Si Woo Kim', 60),
  entry('g26', 'Corey Conners', 60),
  entry('g27', 'Cameron Smith', 66),
  entry('g28', 'Adam Scott', 66),
  entry('g29', 'Max Homa', 66),
  entry('g30', 'Jason Day', 66),
  entry('g31', 'Min Woo Lee', 66),
  entry('g32', 'Russell Henley', 66),
  entry('g33', 'Sam Burns', 70),
  entry('g34', 'Sepp Straka', 70),
  entry('g35', 'Wyndham Clark', 80),
  entry('g36', 'Sungjae Im', 80),
  entry('g37', 'Marco Penge', 80),
  entry('g38', 'Gary Woodland', 80),
  entry('g39', 'Jake Knapp', 80),
  entry('g40', 'Harris English', 90),
  entry('g41', 'J.J. Spaun', 90),
  entry('g42', 'Jacob Bridgeman', 90),
  entry('g43', 'Dustin Johnson', 90),
  entry('g44', 'Daniel Berger', 90),
  entry('g45', 'Alexander Noren', 100),
  entry('g46', 'Sergio Garcia', 100),
  entry('g47', 'Matt McCarty', 100),
  entry('g48', 'Maverick McNealy', 110),
  entry('g49', 'Ryan Gerard', 110),
  entry('g50', 'Keegan Bradley', 120),
  entry('g51', 'Nicolai Hojgaard', 120),
  entry('g52', 'Ryan Fox', 120),
  entry('g53', 'Aaron Rai', 130),
  entry('g54', 'Harry Hall', 130),
  entry('g55', 'Rasmus Neergaard-Petersen', 130),
  entry('g56', 'Johnny Keefer', 130),
  entry('g57', 'Tom McKibbin', 140),
  entry('g58', 'Brian Harman', 150),
  entry('g59', 'Kurt Kitayama', 150),
  entry('g60', 'Nicolas Echavarria', 150),
  entry('g61', 'Sam Stevens', 150),
  entry('g62', 'Rasmus Hojgaard', 150),
  entry('g63', 'Casey Jarvis', 150),
  wd('g64', 'Tiger Woods', 150),
  entry('g65', 'Carlos Ortiz', 150),
  wd('g66', 'Phil Mickelson', 200),
  entry('g67', 'Aldrich Potgieter', 200),
  entry('g68', 'Andrew Novak', 200),
  entry('g69', 'Michael Kim', 200),
  entry('g70', 'Hao-Tong Li', 250),
  entry('g71', 'Max Greyserman', 250),
  entry('g72', 'Nick Taylor', 250),
  entry('g73', 'Bubba Watson', 250),
  entry('g74', 'Sami Valimaki', 300),
  entry('g75', 'Kristoffer Reitan', 300),
  entry('g76', 'Davis Riley', 300),
  wd('g77', 'Thomas Detry', 350),
  entry('g78', 'Charl Schwartzel', 350),
  entry('g79', 'Michael Brennan', 400),
  entry('g80', 'Brian Campbell', 400),
  entry('g81', 'Zach Johnson', 400),
  entry('g82', 'Danny Willett', 500),
  entry('g83', 'Angel Cabrera', 500),
  entry('g84', 'Jackson Herrington', 1000),
  entry('g85', 'Naoyuki Kataoka', 1000),
  entry('g86', 'Mike Weir', 1000),
  entry('g87', 'Brandon Holtz', 1000),
  entry('g88', 'Fifa Laopakdee', 1000),
  entry('g89', 'Mateo Pulcini', 1000),
  entry('g90', 'Fred Couples', 1000),
  entry('g91', 'Vijay Singh', 1000),
  entry('g92', 'Mason Howell', 1000),
  entry('g93', 'Ethan Fang', 1000),
  entry('g94', 'Jose Maria Olazabal', 2000),
]
