export interface MastersFieldEntry {
  name: string
  odds: string            // American format: "+400"
  oddsFractional: string  // Fractional format: "4/1"
  oddsNumeric: number     // Fractional numerator (4 for 4/1, lower = better)
  worldRank: number | null
}

/**
 * Convert fractional odds numerator to American format.
 * For positive fractional odds (e.g. 4/1), American = numerator * 100.
 */
function toAmerican(numerator: number): string {
  return `+${numerator * 100}`
}

function entry(name: string, numerator: number, denominator = 1): MastersFieldEntry {
  return {
    name,
    odds: toAmerican(numerator),
    oddsFractional: `${numerator}/${denominator}`,
    oddsNumeric: numerator / denominator,
    worldRank: null,
  }
}

export const MASTERS_2026_FIELD: MastersFieldEntry[] = [
  entry('Scottie Scheffler', 4),
  entry('Rory McIlroy', 7),
  entry('Bryson DeChambeau', 10),
  entry('Jon Rahm', 12),
  entry('Ludvig Aberg', 16),
  entry('Xander Schauffele', 18),
  entry('Tommy Fleetwood', 18),
  entry('Collin Morikawa', 22),
  entry('Cameron Young', 27),
  entry('Justin Rose', 30),
  entry('Matt Fitzpatrick', 30),
  entry('Patrick Reed', 30),
  entry('Chris Gotterup', 35),
  entry('Hideki Matsuyama', 35),
  entry('Viktor Hovland', 35),
  entry('Brooks Koepka', 38),
  entry('Robert MacIntyre', 40),
  entry('Justin Thomas', 40),
  entry('Tyrrell Hatton', 40),
  entry('Jordan Spieth', 40),
  entry('Shane Lowry', 45),
  entry('Patrick Cantlay', 50),
  entry('Ben Griffin', 55),
  entry('Akshay Bhatia', 60),
  entry('Si Woo Kim', 60),
  entry('Corey Conners', 60),
  entry('Cameron Smith', 66),
  entry('Adam Scott', 66),
  entry('Max Homa', 66),
  entry('Jason Day', 66),
  entry('Min Woo Lee', 66),
  entry('Russell Henley', 66),
  entry('Sam Burns', 70),
  entry('Sepp Straka', 70),
  entry('Wyndham Clark', 80),
  entry('Sungjae Im', 80),
  entry('Marco Penge', 80),
  entry('Harris English', 90),
  entry('J.J. Spaun', 90),
  entry('Jacob Bridgeman', 90),
  entry('Dustin Johnson', 90),
  entry('Alexander Noren', 100),
  entry('Sergio Garcia', 100),
  entry('Maverick McNealy', 110),
  entry('Ryan Gerard', 110),
  entry('Keegan Bradley', 120),
  entry('Ryan Fox', 120),
  entry('Aaron Rai', 130),
  entry('Harry Hall', 130),
  entry('Rasmus Neergaard-Petersen', 130),
  entry('John Keefer', 130),
  entry('Tom McKibbin', 140),
  entry('Brian Harman', 150),
  entry('Kurt Kitayama', 150),
  entry('Nicolas Echavarria', 150),
  entry('Sam Stevens', 150),
  entry('Rasmus Hojgaard', 150),
  entry('Casey Jarvis', 150),
  entry('Tiger Woods', 150),
  entry('Carlos Ortiz', 150),
  entry('Phil Mickelson', 200),
  entry('Aldrich Potgieter', 200),
  entry('Andrew Novak', 200),
  entry('Michael Kim', 200),
  entry('Hao-Tong Li', 250),
  entry('Max Greyserman', 250),
  entry('Nick Taylor', 250),
  entry('Bubba Watson', 250),
  entry('Sami Valimaki', 300),
  entry('Kristoffer Reitan', 300),
  entry('Davis Riley', 300),
  entry('Charl Schwartzel', 350),
  entry('Michael Brennan', 400),
  entry('Brian Campbell', 400),
  entry('Zach Johnson', 400),
  entry('Danny Willett', 500),
  entry('Angel Cabrera', 500),
  entry('Jackson Herrington', 1000),
  entry('Naoyuki Kataoka', 1000),
  entry('Mike Weir', 1000),
  entry('Brandon Holtz', 1000),
  entry('Fifa Laopakdee', 1000),
  entry('Mateo Pulcini', 1000),
  entry('Fred Couples', 1000),
  entry('Vijay Singh', 1000),
  entry('Mason Howell', 1000),
  entry('Ethan Fang', 1000),
  entry('Jose Maria Olazabal', 2000),
]
