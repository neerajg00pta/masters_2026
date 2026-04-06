export interface MastersFieldEntry {
  id: string               // Stable DB ID (e.g. "g1") — never derived from array position
  name: string
  odds: string            // American format: "+400"
  oddsFractional: string  // Fractional format: "4/1"
  oddsNumeric: number     // Fractional numerator (4 for 4/1, lower = better)
  worldRank: number | null
  espnId: string | null    // ESPN player ID for live scoring match
  mastersId: string | null // Masters.com player ID for profile links
  withdrawn?: boolean     // true if golfer has withdrawn from tournament
}

/**
 * Convert fractional odds numerator to American format.
 * For positive fractional odds (e.g. 4/1), American = numerator * 100.
 */
function toAmerican(numerator: number): string {
  return `+${numerator * 100}`
}

function entry(
  id: string, name: string, numerator: number,
  espnId: string | null, mastersId: string | null,
): MastersFieldEntry {
  return {
    id, name,
    odds: toAmerican(numerator),
    oddsFractional: `${numerator}/1`,
    oddsNumeric: numerator,
    worldRank: null,
    espnId, mastersId,
  }
}

function wd(
  id: string, name: string, numerator: number,
  espnId: string | null, mastersId: string | null,
): MastersFieldEntry {
  return { ...entry(id, name, numerator, espnId, mastersId), withdrawn: true }
}

export const MASTERS_2026_FIELD: MastersFieldEntry[] = [
  //  id       name                          odds  espnId     mastersId
  entry('g1',  'Scottie Scheffler',            4,  '9478',    '46046'),
  entry('g2',  'Rory McIlroy',                 7,  '3470',    '28237'),
  entry('g3',  'Bryson DeChambeau',            10,  '10046',   '47959'),
  entry('g4',  'Jon Rahm',                     12,  '9780',    '46970'),
  entry('g5',  'Ludvig Aberg',                 16,  '4375972', '52955'),
  entry('g6',  'Xander Schauffele',            18,  '10140',   '48081'),
  entry('g7',  'Tommy Fleetwood',              18,  '5539',    '30911'),
  entry('g8',  'Collin Morikawa',              22,  '10592',   '50525'),
  entry('g9',  'Cameron Young',                27,  '4425906', '57366'),
  entry('g10', 'Justin Rose',                  30,  '569',     '22405'),
  entry('g11', 'Matt Fitzpatrick',             30,  '9037',    '40098'),
  entry('g12', 'Patrick Reed',                 30,  '5579',    '34360'),
  entry('g13', 'Chris Gotterup',               35,  '4690755', '59095'),
  entry('g14', 'Hideki Matsuyama',             35,  '5860',    '32839'),
  entry('g15', 'Viktor Hovland',               35,  '4364873', '46717'),
  entry('g16', 'Brooks Koepka',                38,  '6798',    '36689'),
  entry('g17', 'Robert MacIntyre',             40,  '11378',   '52215'),
  entry('g18', 'Justin Thomas',                40,  '4848',    '33448'),
  entry('g19', 'Tyrrell Hatton',               40,  '5553',    '34363'),
  entry('g20', 'Jordan Spieth',                40,  '5467',    '34046'),
  entry('g21', 'Shane Lowry',                  45,  '4587',    '33204'),
  entry('g22', 'Patrick Cantlay',              50,  '6007',    '35450'),
  entry('g23', 'Ben Griffin',                  55,  '4404992', '54591'),
  entry('g24', 'Akshay Bhatia',               60,  '4419142', '56630'),
  entry('g25', 'Si Woo Kim',                  60,  '4686830', '37455'),
  entry('g26', 'Corey Conners',               60,  '9126',    '39997'),
  entry('g27', 'Cameron Smith',               66,  '9131',    '35891'),
  entry('g28', 'Adam Scott',                  66,  '388',     '24502'),
  entry('g29', 'Max Homa',                    66,  '8973',    '39977'),
  entry('g30', 'Jason Day',                   66,  '1680',    '28089'),
  entry('g31', 'Min Woo Lee',                 66,  '4410932', '37378'),
  entry('g32', 'Russell Henley',              66,  '5409',    '34098'),
  entry('g33', 'Sam Burns',                   70,  '9938',    '47504'),
  entry('g34', 'Sepp Straka',                 70,  '8961',    '49960'),
  entry('g35', 'Wyndham Clark',               80,  '11119',   '51766'),
  entry('g36', 'Sungjae Im',                  80,  '11382',   '39971'),
  entry('g37', 'Marco Penge',                 80,  '4585549', '51003'),
  entry('g38', 'Gary Woodland',               80,  '3550',    '31323'),
  entry('g39', 'Jake Knapp',                  80,  '9843',    '111651'),
  entry('g40', 'Harris English',              90,  '5408',    '34099'),
  entry('g41', 'J.J. Spaun',                 90,  '10166',   '39324'),
  entry('g42', 'Jacob Bridgeman',             90,  '4920078', '60004'),
  entry('g43', 'Dustin Johnson',              90,  '3448',    '30925'),
  entry('g44', 'Daniel Berger',               90,  '9025',    '40026'),
  entry('g45', 'Alexander Noren',            100,  '5285',    '27349'),
  entry('g46', 'Sergio Garcia',              100,  '158',     '21209'),
  entry('g47', 'Matt McCarty',               100,  '4901368', '59141'),
  entry('g48', 'Maverick McNealy',           110,  '9530',    '46442'),
  entry('g49', 'Ryan Gerard',                110,  '5076021', '59018'),
  entry('g50', 'Keegan Bradley',             120,  '4513',    '33141'),
  entry('g51', 'Nicolai Hojgaard',           120,  '11250',   '52453'),
  entry('g52', 'Ryan Fox',                   120,  '4251',    '29936'),
  entry('g53', 'Aaron Rai',                  130,  '10906',   '46414'),
  entry('g54', 'Harry Hall',                 130,  '4589438', '57975'),
  entry('g55', 'Rasmus Neergaard-Petersen',  130,  '4858859', '52689'),
  entry('g56', 'Johnny Keefer',              130,  '5217048', '63454'),
  entry('g57', 'Tom McKibbin',               140,  '10576',   '50823'),
  entry('g58', 'Brian Harman',               150,  '1225',    '27644'),
  entry('g59', 'Kurt Kitayama',              150,  '10364',   '48117'),
  entry('g60', 'Nicolas Echavarria',         150,  '4408316', '51349'),
  entry('g61', 'Sam Stevens',                150,  '4426181', '55893'),
  entry('g62', 'Rasmus Hojgaard',            150,  '11253',   '52686'),
  entry('g63', 'Casey Jarvis',               150,  '5209210', '57688'),
  wd(  'g64', 'Tiger Woods',                 150,  '462',     '8793'),
  entry('g65', 'Carlos Ortiz',               150,  '6020',    '33667'),
  wd(  'g66', 'Phil Mickelson',              200,  '308',     '1810'),
  entry('g67', 'Aldrich Potgieter',          200,  '5080439', '63343'),
  entry('g68', 'Andrew Novak',               200,  '11332',   '51997'),
  entry('g69', 'Michael Kim',                200,  '8974',    '39975'),
  entry('g70', 'Hao-Tong Li',               250,  '9221',    '35296'),
  entry('g71', 'Max Greyserman',             250,  '11101',   '51977'),
  entry('g72', 'Nick Taylor',                250,  '3792',    '25493'),
  entry('g73', 'Bubba Watson',               250,  '780',     '25804'),
  entry('g74', 'Sami Valimaki',              300,  '10916',   '52666'),
  entry('g75', 'Kristoffer Reitan',          300,  '4348470', '49855'),
  entry('g76', 'Davis Riley',                300,  '10058',   '47995'),
  wd(  'g77', 'Thomas Detry',               350,  '4837',    '33653'),
  entry('g78', 'Charl Schwartzel',           350,  '1097',    '26331'),
  entry('g79', 'Michael Brennan',            400,  '4921329', '61522'),
  entry('g80', 'Brian Campbell',             400,  '9525',    '46443'),
  entry('g81', 'Zach Johnson',               400,  '686',     '24024'),
  entry('g82', 'Danny Willett',              500,  '4304',    '32139'),
  entry('g83', 'Angel Cabrera',              500,  '65',      '20848'),
  entry('g84', 'Jackson Herrington',        1000,  '5344766', '70148'),
  entry('g85', 'Naoyuki Kataoka',           1000,  '4837226', '46879'),
  entry('g86', 'Mike Weir',                 1000,  '453',     '10423'),
  entry('g87', 'Brandon Holtz',             1000,  '2201886', '70147'),
  entry('g88', 'Fifa Laopakdee',            1000,  '5327297', '70146'),
  entry('g89', 'Mateo Pulcini',             1000,  '5344763', '70145'),
  entry('g90', 'Fred Couples',              1000,  '91',      '1226'),
  entry('g91', 'Vijay Singh',               1000,  '401',     '6567'),
  entry('g92', 'Mason Howell',              1000,  '5289811', '68607'),
  entry('g93', 'Ethan Fang',                1000,  '5293232', '68932'),
  entry('g94', 'Jose Maria Olazabal',       2000,  '329',     '6373'),
]
