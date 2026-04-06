/**
 * ESPN ID → Masters ID mapping for 2026 Masters field.
 * Used to build player profile links on masters.com.
 */
export const ESPN_TO_MASTERS: Map<string, string> = new Map([
  ['9478', '46046'],     // Scottie Scheffler
  ['3470', '28237'],     // Rory McIlroy
  ['10046', '47959'],    // Bryson DeChambeau
  ['9780', '46970'],     // Jon Rahm
  ['4375972', '52955'],  // Ludvig Åberg
  ['10140', '48081'],    // Xander Schauffele
  ['5539', '30911'],     // Tommy Fleetwood
  ['10592', '50525'],    // Collin Morikawa
  ['4425906', '57366'],  // Cameron Young
  ['569', '22405'],      // Justin Rose
  ['9037', '40098'],     // Matt Fitzpatrick
  ['5579', '34360'],     // Patrick Reed
  ['5860', '32839'],     // Hideki Matsuyama
  ['4364873', '46717'],  // Viktor Hovland
  ['6798', '36689'],     // Brooks Koepka
  ['11378', '52215'],    // Robert MacIntyre
  ['4848', '33448'],     // Justin Thomas
  ['5553', '34363'],     // Tyrrell Hatton
  ['5467', '34046'],     // Jordan Spieth
  ['4587', '33204'],     // Shane Lowry
  ['6007', '35450'],     // Patrick Cantlay
  ['4419142', '56630'],  // Akshay Bhatia
  ['4686830', '37455'],  // Si Woo Kim
  ['9126', '39997'],     // Corey Conners
  ['9131', '35891'],     // Cameron Smith
  ['388', '24502'],      // Adam Scott
  ['8973', '39977'],     // Max Homa
  ['1680', '28089'],     // Jason Day
  ['4410932', '37378'],  // Min Woo Lee
  ['5409', '34098'],     // Russell Henley
  ['9938', '47504'],     // Sam Burns
  ['8961', '49960'],     // Sepp Straka
  ['9025', '40026'],     // Daniel Berger
  ['11119', '51766'],    // Wyndham Clark
  ['11382', '39971'],    // Sungjae Im
  ['3550', '31323'],     // Gary Woodland
  ['9843', '111651'],    // Jake Knapp
  ['5408', '34099'],     // Harris English
  ['10166', '39324'],    // J.J. Spaun
  ['3448', '30925'],     // Dustin Johnson
  ['5285', '27349'],     // Alexander Noren
  ['158', '21209'],      // Sergio Garcia
  ['4901368', '59141'],  // Matt McCarty
  ['9530', '46442'],     // Maverick McNealy
  ['4513', '33141'],     // Keegan Bradley
  ['11250', '52453'],    // Nicolai Højgaard
  ['4251', '29936'],     // Ryan Fox
  ['10906', '46414'],    // Aaron Rai
  ['4589438', '57975'],  // Harry Hall
  ['10576', '50823'],    // Tom McKibbin
  ['1225', '27644'],     // Brian Harman
  ['10364', '48117'],    // Kurt Kitayama
  ['4408316', '51349'],  // Nicolas Echavarria
  ['4426181', '55893'],  // Sam Stevens
  ['11253', '52686'],    // Rasmus Højgaard
  ['5209210', '57688'],  // Casey Jarvis
  ['462', '8793'],       // Tiger Woods
  ['6020', '33667'],     // Carlos Ortiz
  ['308', '1810'],       // Phil Mickelson
  ['5080439', '63343'],  // Aldrich Potgieter
  ['8974', '39975'],     // Michael Kim
  ['9221', '35296'],     // Haotong Li
  ['11101', '51977'],    // Max Greyserman
  ['3792', '25493'],     // Nick Taylor
  ['780', '25804'],      // Bubba Watson
  ['10916', '52666'],    // Sami Valimaki
  ['10058', '47995'],    // Davis Riley
  ['1097', '26331'],     // Charl Schwartzel
  ['4920078', '60004'],  // Jacob Bridgeman
  ['9525', '46443'],     // Brian Campbell
  ['686', '24024'],      // Zach Johnson
  ['4304', '32139'],     // Danny Willett
  ['65', '20848'],       // Angel Cabrera
  ['91', '1226'],        // Fred Couples
  ['401', '6567'],       // Vijay Singh
  ['453', '10423'],      // Mike Weir
  ['329', '6373'],       // José María Olazábal
  ['10054', '47993'],    // Denny McCarthy
  ['4690755', '59095'],  // Chris Gotterup
  ['4404992', '54591'],  // Ben Griffin
  ['4921329', '61522'],  // Michael Brennan
  ['11332', '51997'],    // Andrew Novak
  ['4585549', '51003'],  // Marco Penge
  ['5076021', '59018'],  // Ryan Gerard
  ['5217048', '63454'],  // Johnny Keefer
  ['4858859', '52689'],  // Rasmus Neergaard-Petersen
  ['4348470', '49855'],  // Kristoffer Reitan
  ['4837226', '46879'],  // Naoyuki Kataoka
  ['5289811', '68607'],  // Mason Howell (a)
  ['5293232', '68932'],  // Ethan Fang (a)
  ['5327297', '70146'],  // Fifa Laopakdee (a)
  ['5344766', '70148'],  // Jackson Herrington (a)
  ['2201886', '70147'],  // Brandon Holtz (a)
  ['5344763', '70145'],  // Mateo Pulcini (a)
])

export function getMastersUrl(mastersId: string): string {
  return `https://www.masters.com/en_US/players/player_${mastersId}.html`
}
