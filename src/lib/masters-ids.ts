/**
 * ESPN ID → Masters ID mapping for 2026 Masters field.
 * Used to build player profile links on masters.com.
 */
export const ESPN_TO_MASTERS: Map<string, string> = new Map([
  ['5285', '33948'],     // Byeong Hun An
  ['5152205', '60165'],  // Jose Luis Ballester
  ['10559', '45618'],    // Evan Beck
  ['9025', '40026'],     // Daniel Berger
  ['9243', '45522'],     // Christiaan Bezuidenhout
  ['4419142', '56630'],  // Akshay Bhatia
  ['4513', '33141'],     // Keegan Bradley
  ['9938', '47504'],     // Sam Burns
  ['65', '20848'],       // Angel Cabrera
  ['9525', '46443'],     // Brian Campbell
  ['3683', '32070'],     // Rafael Campos
  ['5550', '34362'],     // Laurie Canter
  ['6007', '35450'],     // Patrick Cantlay
  ['11119', '51766'],    // Wyndham Clark
  ['9126', '39997'],     // Corey Conners
  ['91', '1226'],        // Fred Couples
  ['10863', '45157'],    // Cameron Davis
  ['1680', '28089'],     // Jason Day
  ['10046', '47959'],    // Bryson DeChambeau
  ['4837', '33653'],     // Thomas Detry
  ['4832046', '59866'],  // Nick Dunlap
  ['4408316', '51349'],  // Nicolas Echavarria
  ['4425898', '57362'],  // Austin Eckroat
  ['5408', '34099'],     // Harris English
  ['2230', '29725'],     // Tony Finau
  ['9037', '40098'],     // Matt Fitzpatrick
  ['5539', '30911'],     // Tommy Fleetwood
  ['158', '21209'],      // Sergio Garcia
  ['676', '25900'],      // Lucas Glover
  ['11101', '51977'],    // Max Greyserman
  ['1225', '27644'],     // Brian Harman
  ['5203536', '66248'],  // Justin Hastings
  ['5553', '34363'],     // Tyrrell Hatton
  ['5409', '34098'],     // Russell Henley
  ['4868733', '60067'],  // Joe Highsmith
  ['6086', '35532'],     // Tom Hoge
  ['8973', '39977'],     // Max Homa
  ['1651', '29420'],     // Billy Horschel
  ['4364873', '46717'],  // Viktor Hovland
  ['11250', '52453'],    // Nicolai Højgaard
  ['11253', '52686'],    // Rasmus Højgaard
  ['11382', '39971'],    // Sungjae Im
  ['6937', '36799'],     // Stephan Jaeger
  ['686', '24024'],      // Zach Johnson
  ['3448', '30925'],     // Dustin Johnson
  ['5276688', '68084'],  // Noah Kent
  ['8974', '39975'],     // Michael Kim
  ['4602673', '55182'],  // Tom Kim
  ['3449', '30926'],     // Chris Kirk
  ['3980', '32757'],     // Patton Kizzire
  ['6798', '36689'],     // Brooks Koepka
  ['261', '1666'],       // Bernhard Langer
  ['9240', '45523'],     // Thriston Lawrence
  ['4410932', '37378'],  // Min Woo Lee
  ['4587', '33204'],     // Shane Lowry
  ['11378', '52215'],    // Robert MacIntyre
  ['5860', '32839'],     // Hideki Matsuyama
  ['10054', '47993'],    // Denny McCarthy
  ['4901368', '59141'],  // Matt McCarty
  ['3470', '28237'],     // Rory McIlroy
  ['9530', '46442'],     // Maverick McNealy
  ['308', '1810'],       // Phil Mickelson
  ['10592', '50525'],    // Collin Morikawa
  ['11099', '45486'],    // Joaquín Niemann
  ['329', '6373'],       // José María Olazábal
  ['10596', '48153'],    // Matthieu Pavon
  ['9658', '40250'],     // Taylor Pendrith
  ['10505', '49771'],    // J.T. Poston
  ['9780', '46970'],     // Jon Rahm
  ['10906', '46414'],    // Aaron Rai
  ['5579', '34360'],     // Patrick Reed
  ['10058', '47995'],    // Davis Riley
  ['569', '22405'],      // Justin Rose
  ['10140', '48081'],    // Xander Schauffele
  ['9478', '46046'],     // Scottie Scheffler
  ['10372', '47347'],    // Adam Schenk
  ['1097', '26331'],     // Charl Schwartzel
  ['388', '24502'],      // Adam Scott
  ['9131', '35891'],     // Cameron Smith
  ['10166', '39324'],    // J.J. Spaun
  ['5467', '34046'],     // Jordan Spieth
  ['8961', '49960'],     // Sepp Straka
  ['5214992', '55741'],  // Hiroshi Tai
  ['3792', '25493'],     // Nick Taylor
  ['10980', '51634'],    // Sahith Theegala
  ['4848', '33448'],     // Justin Thomas
  ['4602218', '58168'],  // Davis Thompson
  ['1030', '27064'],     // Jhonattan Vegas
  ['780', '25804'],      // Bubba Watson
  ['453', '10423'],      // Mike Weir
  ['4304', '32139'],     // Danny Willett
  ['4425906', '57366'],  // Cameron Young
  ['4349547', '45242'],  // Kevin Yu
  ['9877', '47483'],     // Will Zalatoris
  ['4375972', '52955'],  // Ludvig Åberg
])

export function getMastersUrl(mastersId: string): string {
  return `https://www.masters.com/en_US/players/player_${mastersId}.html`
}
