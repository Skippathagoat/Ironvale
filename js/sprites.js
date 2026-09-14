// Ironvale — sprites.js
// Original pixel art generated procedurally at load time (no asset files).
// Style goal: the classic early-2000s isometric MMO look — small big-headed
// characters, 2-frame walk cycles, blob-canopy trees, front-facing village
// houses, flat colors with one shadow tone. All art is original.

export const S = {}; // filled by buildSprites()

function makeSprite(rows, pal, scale = 4) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cv = document.createElement('canvas');
  cv.width = w * scale;
  cv.height = h * scale;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  // white silhouette for hit-flash
  const fc = document.createElement('canvas');
  fc.width = cv.width; fc.height = cv.height;
  const f = fc.getContext('2d');
  f.drawImage(cv, 0, 0);
  f.globalCompositeOperation = 'source-in';
  f.fillStyle = '#ffffff';
  f.fillRect(0, 0, fc.width, fc.height);
  return { cv, flash: fc, w: cv.width, h: cv.height };
}

// ---------- humanoid (classic proportion: big head, 2-frame walk) ----------

const HUM_A = [
  '..HHHHHH..',
  '.HHHHHHHH.',
  '.HSSSSSSH.',
  '.SSESSESS.',
  '.HSSSSSSH.',
  '..SSSSSS..',
  '..TTTTTT..',
  '.TTTTTTTT.',
  '.STTTTTTS.',
  '.TTTTTTTT.',
  '..TTTTTT..',
  '..LL..LL..',
  '..LL..LL..',
  '..LL..LL..',
  '.BBB..BBB.'
];
const HUM_B = [
  '..HHHHHH..',
  '.HHHHHHHH.',
  '.HSSSSSSH.',
  '.SSESSESS.',
  '.HSSSSSSH.',
  '..SSSSSS..',
  '..TTTTTT..',
  '.TTTTTTTT.',
  '.STTTTTTS.',
  '.TTTTTTTT.',
  '..TTTTTT..',
  '.LL....LL.',
  '..LL...LL.',
  '..LL..LL..',
  '.BBB..BBB.'
];

function humanoid(pal, frame) {
  return makeSprite(frame === 'A' ? HUM_A : HUM_B, pal);
}

const NPC_PALS = {
  // default player: the classic blue tunic & brown breeches
  player: { H: '#4a3018', S: '#e0a878', E: '#1a1a1a', T: '#3a6ab5', L: '#7a5230', B: '#4a2f1a' },
  bram:   { H: '#c8c8c8', S: '#e0a878', E: '#1a1a1a', T: '#7a5a2e', L: '#5a4626', B: '#3a2c18' },
  greta:  { H: '#8a3030', S: '#e0a878', E: '#1a1a1a', T: '#7a3a8a', L: '#55355f', B: '#33203c' },
  torin:  { H: '#8a8f96', S: '#e0a878', E: '#1a1a1a', T: '#4a4f56', L: '#3a3e44', B: '#26292e' },
  vill1:  { H: '#6b4423', S: '#e0a878', E: '#1a1a1a', T: '#5a7a3a', L: '#4e5e3a', B: '#333d28' },
  vill2:  { H: '#3a3a3a', S: '#e0a878', E: '#1a1a1a', T: '#7a4a3a', L: '#5e3a3a', B: '#3a2626' }
};

// ---------- trees ----------

const TREE_OAK = [
  '....GGGGGG....',
  '..GGGGGGGGGG..',
  '.GGGLGGGGDGGG.',
  '.GGGGGGGDGGGG.',
  '.GDLGGGGGGGDL.',
  'GGGGGGGGDGGGGG',
  'GGGDGGGLGGGGGG',
  '.GGGGGGGGDGGG.',
  '.GDLGGGGGGGGG.',
  '..GGGGGDGGGG..',
  '....GGGGGG....',
  '......TT......',
  '......TT......',
  '......TT......'
];
const TREE_PINE = [
  '......P......',
  '.....PPP.....',
  '.....PPP.....',
  '....PPPPP....',
  '....PPDPP....',
  '...PPPPPPP...',
  '...PPDPPDPP..',
  '..PPPPPPPPP..',
  '..PPDPPDPPP..',
  '.PPPPPPPPPPP.',
  '.PPDPPDPPDPP.',
  '......TT.....',
  '......TT.....'
];
const STUMP = [
  '..TTTTTT..',
  '.TTLTTTLD.',
  '.TTTTTTTT.',
  '..TTTDTT..',
  '..TTTTTT..'
];

// ---------- rocks ----------

const ROCK_BASE = [
  '....RRRR....',
  '..RRRRRRRR..',
  '.RLLRRRRRRR.',
  '.RLLRRRRDRR.',
  'RRRRRRRRDRRR',
  'RRRRDRRRDRRR',
  '.RRDRRRRDRR.',
  '..RRRRRRRR..',
  '...DDDDDD...'
];
const ROCK_ORE = [
  '....RRRR....',
  '..RRRXXRRR..',
  '.RLLRXXRRRR.',
  '.RLLRRXDRRR.',
  'RRRRXXRRDRRR',
  'RRDRRRXDRXRR',
  '.RRDRXXRDRR.',
  '..RRRRRRRR..',
  '...DDDDDD...'
];
const BARE_ROCK = [
  '..RRRR..',
  '.RRKKRR.',
  '.RRRRRR.',
  '..RRRR..'
];

// ---------- buildings (front-facing, RS-village style) ----------

const HOUSE = [
  '...........RRRR...........',
  '..........RRRRRR..........',
  '.........RRRRRRRR.........',
  '........RRRRRRRRRR........',
  '.......RRRRRRRRRRRR.......',
  '......RRRRRRRRRRRRRR......',
  '.....RRRRRRRRRRRRRRRR.....',
  '....RRRRRRRRRRRRRRRRRR....',
  '...WWWWWWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWWWWWW...',
  '...WWWYWWWWWWWWWWWWYWWW...',
  '...WWWYWWWWWWWWWWWWYWWW...',
  '...WWWWWWWWWWWWWWWWWWWW...',
  '...WWWWWWDDWWWWWWWWWWWW...',
  '...WWWWWWDDWWWWWWWWWWWW...',
  '...WWWWWWDDWWWWWWWWWWWW...',
  '...WWWWWWDDWWWWWWWWWWWW...'
];

const HALL = [
  '...............RRRR...............',
  '.............RRRRRRRR.............',
  '...........RRRRRRRRRRRR...........',
  '.........RRRRRRRRRRRRRRRR.........',
  '.......RRRRRRRRRRRRRRRRRRRR.......',
  '.....RRRRRRRRRRRRRRRRRRRRRRRR.....',
  '...RRRRRRRRRRRRRRRRRRRRRRRRRRRR...',
  '..RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR..',
  '....WWWWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WWWYWWWWWWWWWWWWWWWWWWYWWW....',
  '....WWWYWWWWWWWWWWWWWWWWWWYWWW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WWWWWDDWWWWWDDWWWWWDDWWWWW....',
  '....WWWWWDDWWWWWDDWWWWWDDWWWWW....',
  '....WWWWWDDWWWWWDDWWWWWDDWWWWW....',
  '....WWWWWDDWWWWWDDWWWWWDDWWWWW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWWWW....'
];

const WELL = [
  '....KKKK....',
  '...KLLLLK...',
  '..KLLLLLLK..',
  '...K....K...',
  '...K....K...',
  '..SSSSSSSS..',
  '.SSDDDDDDSS.',
  '.SSDDDDDDSS.',
  '..SSSSSSSS..',
  '...SSSSSS...'
];

const FURNACE = [
  '..KKKKKKKK..',
  '.KKKKKKKKKK.',
  '.KKOOOOOOKK.',
  '.KKOYYOOOKK.',
  '.KKOYRYOYOK.',
  '.KKOYRYOYOK.',
  '.KKOOYYYOOK.',
  '.KKKYYYYKKK.',
  '.KKKKKKKKKK.'
];

const POT = [
  '....SSSS....',
  '.TTTTTTTTTT.',
  'TTTTTTTTTTTT',
  'TSSSSSSSSSST',
  'TTTTTTTTTTTT',
  'TTKKKKKKKTTT',
  '.TTKKKKKTT..'
];

// ---------- monsters ----------

const RAT_A = [
  '..B........B....',
  '.BBB......BBB...',
  '.BBBBBBBBBBBBB..',
  '.BREBBBBBBBBBB..',
  '.BBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBT.',
  '..BBBBBBBBBBBTT.',
  '...BBBBBBBBTTT..',
  '....BBBBBB......'
];
const RAT_B = [
  '..B........B....',
  '.BBB......BBB...',
  '.BBBBBBBBBBBBB..',
  '.BREBBBBBBBBBB..',
  '.BBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBT.',
  '...BBBBBBBBBTTT.',
  '....BBBBBBBTT...',
  '.....BBBBB......'
];

const SLIME_A = [
  '................',
  '....GGGGGGGG....',
  '..GGGGGGGGGGGG..',
  '.GGGGGGGGGGGGGG.',
  '.GGWGGGGGGWGGGG.',
  '.GGWGEGGGWGEGGG.',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGDDDDGGGGGG',
  '.GGGGGGGGGGGGGG.',
  '..GGGGGGGGGGGG..'
];
const SLIME_B = [
  '................',
  '......GGGG......',
  '....GGGGGGGG....',
  '..GGGGGGGGGGGG..',
  '.GGWGGGGGGWGGGG.',
  '.GGWGEGGGWGEGGG.',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGDDDDGGGGGG',
  '.GGGGGGGGGGGGGG.',
  'GGGGGGGGGGGGGGGG'
];

const WOLF_A = [
  'WW..................',
  'WWWW......WWWWWWWW..',
  'WWWWWW...WWWWWWWWWW.',
  'WWRRWWWWWWWWWWWWWWW.',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWW.',
  '.WWW.WWWW..WWWW..WW.',
  '.WW..WWWW..WWWW..WW.',
  '.KK..KKKK..KKKK..KK.'
];
const WOLF_B = [
  'WW..................',
  'WWWW......WWWWWWWW..',
  'WWWWWW...WWWWWWWWWW.',
  'WWRRWWWWWWWWWWWWWWW.',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWWWW.',
  '..WW..WWWW..WWWW.WW.',
  '..KK..KKKK..KKKK..WW',
  '..........KKKK..KK..'
];

const BEAR_A = [
  '...BB........BB.....',
  '..BBBB......BBBB....',
  '..BBBBBBBBBBBBBB....',
  '.BBBBBBBBBBBBBBBB...',
  '.BBEEBBBBBBBBBBBB...',
  '.BBBBBBBBBBBBBBBBB..',
  'BBBLLLLBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBB..',
  '.BBBBBBBBBBBBBBBB...',
  '.BBB.BBBB.BBBB.BBB..',
  '.KKK.KKKK.KKKK.KKK..'
];
const BEAR_B = [
  '...BB........BB.....',
  '..BBBB......BBBB....',
  '..BBBBBBBBBBBBBB....',
  '.BBBBBBBBBBBBBBBB...',
  '.BBEEBBBBBBBBBBBB...',
  '.BBBBBBBBBBBBBBBBB..',
  'BBBLLLLBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBB..',
  '...BBBBBBBBBBBBBB...',
  '....BBB.BBBB.BBBB...',
  '....KKK.KKKK.KKKK...'
];

const TROLL_A = [
  '......GGGGGG......',
  '....GGGGGGGGGG....',
  '...GGGEEGGGEEGGG..',
  '...GGGGGGGGGGGGG..',
  '..GGGGGKKKGGGGGG..',
  '..GGGGGGGGGGGGGG..',
  '.GGGGGGGGGGGGGGGG.',
  '.GGGGGGGGGGGGGGGG.',
  'GGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGG',
  'GGGGGKKKKKKKGGGGGG',
  'GGGGGKKKKKKKGGGGGG',
  '....GGG....GGG....',
  '....GGG....GGG....',
  '...KKKK....KKKK...'
];
const TROLL_B = [
  '......GGGGGG......',
  '....GGGGGGGGGG....',
  '...GGGEEGGGEEGGG..',
  '...GGGGGGGGGGGGG..',
  '..GGGGGKKKGGGGGG..',
  '..GGGGGGGGGGGGGG..',
  '.GGGGGGGGGGGGGGGG.',
  '.GGGGGGGGGGGGGGGG.',
  'GGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGG',
  'GGGGGKKKKKKKGGGGGG',
  'GGGGGKKKKKKKGGGGGG',
  '....GGG....GGG....',
  '.....GGG..GGG.....',
  '....KKKK..KKKK....'
];

// ---------- items / icons (12x12) ----------

function sword(blade, hilt) {
  return makeSprite([
    '.........BBB.',
    '........BBBB.',
    '.......BBBB..',
    '......BBBB...',
    '.....BBBB....',
    '....BBBB.....',
    '...BBBB......',
    '..BBBB.......',
    '..HHHHHH.....',
    '...HHH.......',
    '...HHH.......',
    '....H........'
  ], { B: blade, H: hilt });
}

const ITEMS_ART = {
  axe: [
    '....BBBB....',
    '...BBBBBB...',
    '..BBBBBBBB..',
    '.BBBBBB.....',
    '.BB.........',
    '....WW......',
    '....WW......',
    '....WW......',
    '....WW......',
    '....WW......',
    '...WWWW.....',
    '...WWWW.....'
  ],
  pickaxe: [
    '............',
    'BBBB....BBBB',
    'BBBBB..BBBBB',
    '.BBBBBBBBBB.',
    '..BBBBBBBB..',
    '.....WW.....',
    '.....WW.....',
    '.....WW.....',
    '.....WW.....',
    '.....WW.....',
    '....WWWW....',
    '....WWWW....'
  ],
  log_oak: [
    '............',
    '............',
    '...TTT......',
    '..TTTTTT....',
    '.TTKKTTTTT..',
    'TTTKKTTTTTT.',
    '.TTKKTTTTT..',
    '..TTTTTT....',
    '...TTT......',
    '............',
    '............',
    '............'
  ],
  log_pine: [
    '............',
    '............',
    '...PPP......',
    '..PPPPPP....',
    '.PPKKPPPPP..',
    'PPPKKPPPPPP.',
    '.PPKKPPPPP..',
    '..PPPPPP....',
    '...PPP......',
    '............',
    '............',
    '............'
  ],
  bar_copper: [
    '............',
    '............',
    '............',
    '....CCCC....',
    '..CCCCCCCC..',
    '.CCCCCCCCCC.',
    '.CCCCCCCCCC.',
    '..CCCCCCCC..',
    '....CCCC....',
    '............',
    '............',
    '............'
  ],
  bar_iron: [
    '............',
    '............',
    '............',
    '....IIII....',
    '..IIIIIIII..',
    '.IIIIIIIIII.',
    '.IIIIIIIIII.',
    '..IIIIIIII..',
    '....IIII....',
    '............',
    '............',
    '............'
  ],
  bar_steel: [
    '............',
    '............',
    '............',
    '....SSSS....',
    '..SSSSSSSS..',
    '.SSSSSSSSSS.',
    '.SSSSSSSSSS.',
    '..SSSSSSSS..',
    '....SSSS....',
    '............',
    '............',
    '............'
  ],
  meat_raw: [
    '............',
    '............',
    '....RRRR....',
    '..RRRRRRRR..',
    '.RRWWRRWRRR.',
    'RRRRRRRRRRRR',
    'RRRRRRRRRRRR',
    '.RRRRRRRRRR.',
    '..RRRRRRRR..',
    '....RRRR....',
    '............',
    '............'
  ],
  meat_cooked: [
    '............',
    '............',
    '....TTTT....',
    '..TTTTTTTT..',
    '.TTDDTTDDTT.',
    'TTTTTTTTTTTT',
    'TTTTTTTTTTTT',
    '.TTTTTTTTTT.',
    '..TTTTTTTT..',
    '....TTTT....',
    '............',
    '............'
  ],
  potion_heal: [
    '....KKKK....',
    '....KKKK....',
    '...KKKKKK...',
    '...KWWWWK...',
    '..KWWWWWWK..',
    '..KWWRRRK...',
    '.KWWRRRRRK..',
    '.KWWRRRRRK..',
    '.KKWWRRRKK..',
    '..KKWWRRKK..',
    '...KKKKKK...',
    '............'
  ],
  pelt_wolf: [
    '............',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWKWWWWKWW.',
    '.WWWWWWWWWW.',
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    '.WWWWWWWWWW.',
    '.WWWWWWWWWW.',
    '..WWWWWWWW..',
    '...WWWWWW...',
    '............'
  ],
  pelt_bear: [
    '............',
    '...TTTTTT...',
    '..TTTTTTTT..',
    '.TTKTTTTKTT.',
    '.TTTTTTTTTT.',
    'TTTTTTTTTTTT',
    'TTTTTTTTTTTT',
    '.TTTTTTTTTT.',
    '.TTTTTTTTTT.',
    '..TTTTTTTT..',
    '...TTTTTT...',
    '............'
  ],
  helm_leather: [
    '............',
    '....LLLL....',
    '...LLLLLL...',
    '..LLLLLLLL..',
    '..LLLLLLLL..',
    '.LLLLLLLLLL.',
    '.LLKKKKKKLL.',
    '.LLLLLLLLLL.',
    '.LLLLLLLLLL.',
    '..LLLLLLLL..',
    '............',
    '............'
  ],
  chest_leather: [
    '............',
    '.LL......LL.',
    'LLLL....LLLL',
    'LLLLLLLLLLLL',
    'LLLLLLLLLLLL',
    'LLLLLLLLLLLL',
    'LLLLLLLLLLLL',
    'LLLLLLLLLLLL',
    '.LLLLLLLLLL.',
    '..LLLLLLLL..',
    '............',
    '............'
  ],
  legs_leather: [
    '............',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '.LLLL..LLLL.',
    '............'
  ],
  boots_leather: [
    '............',
    '............',
    '............',
    '............',
    '............',
    '.LLLL.LLLL..',
    '.LLLL.LLLL..',
    '.LLLL.LLLL..',
    '.LLLLL.LLLL.',
    '.LLLLL.LLLL.',
    '.LLLLL.LLLL.',
    '............'
  ],
  helm_iron: [
    '............',
    '....IIII....',
    '...IIIIII...',
    '..IIIIIIII..',
    '..IIIIIIII..',
    '.IIIIIIIIII.',
    '.IIKKKKKKII.',
    '.IIIIIIIIII.',
    '.IIIIIIIIII.',
    '..IIIIIIII..',
    '............',
    '............'
  ],
  chest_iron: [
    '............',
    '.III....III.',
    'IIIII..IIIII',
    'IIIIIIIIIIII',
    'IIIIIIIIIIII',
    'IIIIIIIIIIII',
    'IIIIIIIIIIII',
    'IIIIIIIIIIII',
    '.IIIIIIIIII.',
    '..IIIIIIII..',
    '............',
    '............'
  ],
  legs_iron: [
    '............',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '.IIII..IIII.',
    '............'
  ],
  chest_steel: [
    '............',
    '.SSS....SSS.',
    'SSSSS..SSSSS',
    'SSSSSSSSSSSS',
    'SSSSSSSSSSSS',
    'SSSSSSSSSSSS',
    'SSSSSSSSSSSS',
    'SSSSSSSSSSSS',
    '.SSSSSSSSSS.',
    '..SSSSSSSS..',
    '............',
    '............'
  ],
  ore_copper: [
    '............',
    '....UUUU....',
    '..UUSUUUUUU.',
    '.UUSUCXUUUU.',
    'UUUUUUCCUUUU',
    'UUUSUUCCUUUU',
    '.UUUUUCCUUU.',
    '..UUUUUUUU..',
    '...SSSSSS...'
  ],
  ore_tin: [
    '............',
    '....UUUU....',
    '..UUSUUUUUU.',
    '.UUSUWWUUUU.',
    'UUUUUWWWUUUU',
    'UUUSUWWWUUUU',
    '.UUUUUWWWUU.',
    '..UUUUUUUU..',
    '...SSSSSS...'
  ],
  ore_iron: [
    '............',
    '....UUUU....',
    '..UUSUUUUUU.',
    '.UUSUIIUUUU.',
    'UUUUUUIIUUUU',
    'UUUSUUIIUUUU',
    '.UUUUUIIUUU.',
    '..UUUUUUUU..',
    '...SSSSSS...'
  ],
  ore_gold: [
    '............',
    '....UUUU....',
    '..UUSUUUUUU.',
    '.UUSUOOUUUU.',
    'UUUUUUOOUUUU',
    'UUUSUOOOUUUU',
    '.UUUUUOOUUU.',
    '..UUUUUUUU..',
    '...SSSSSS...'
  ],
  coin: [
    '............',
    '............',
    '.....GG.....',
    '....GGGG....',
    '...GGYYGG...',
    '...GYGGYG...',
    '...GYGGYG...',
    '...GGYYGG...',
    '....GGGG....',
    '.....GG.....',
    '............',
    '............'
  ],
  icon_attack: [
    '..........WW',
    '.........WW.',
    '........WW..',
    '.......WW...',
    '......WW....',
    '.....WW.....',
    '....WW......',
    '...WW.......',
    '..HHHH......',
    '..HH........',
    '..HH........',
    '...H........'
  ],
  icon_chop: [
    '....WWWW....',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWWWWW.....',
    '.WW.........',
    '....HH......',
    '....HH......',
    '....HH......',
    '....HH......',
    '....HH......',
    '...HHHH.....',
    '...HHHH.....'
  ],
  icon_mine: [
    '.WWWWWWWWWW.',
    'WW........WW',
    'W..........W',
    '.W........W.',
    '...HHHHHH...',
    '....HHHH....',
    '....HHHH....',
    '....HHHH....',
    '....HHHH....',
    '....HHHH....',
    '...HHHHHH...',
    '...HHHHHH...'
  ],
  icon_talk: [
    '............',
    '..TTTTTTTT..',
    '.TTTTTTTTTT.',
    'TTT..TT..TTT',
    'TTTTTTTTTTTT',
    '.TTTTTTTTTT.',
    '..TTTTTTTT..',
    '....TTTT....',
    '...TT..TT...',
    '..TT......T.',
    '.T..........',
    '............'
  ],
  icon_move: [
    '............',
    '.....BB.....',
    '....BBBB....',
    '.....BB.....',
    '..BB..BB..B.',
    '.BB....BB.B.',
    '.BB....BB.B.',
    '.BB....BB.B.',
    '.BBB...BB.B.',
    '.BBB...BBB..',
    '.BBBB..BBBB.',
    '............'
  ]
};

const ITEM_PAL = {
  W: '#c9cdd3', B: '#cfd6dd', H: '#8a5a2a', T: '#8a5a2a', K: '#5a3a1a',
  P: '#5a8a4a', D: '#3e6633', S: '#9aa4ad', I: '#8f959c', C: '#c47a3d',
  R: '#b5483c', L: '#8a6a3a', E: '#222222', G: '#d9a93c', Y: '#f2d06b',
  O: '#f2d06b', U: '#6f7278'
};

// ---------- build ----------

export function buildSprites() {
  // humanoids
  for (const [key, pal] of Object.entries(NPC_PALS)) {
    S[key + '_A'] = humanoid(pal, 'A');
    S[key + '_B'] = humanoid(pal, 'B');
  }
  // world objects
  S.tree_oak  = makeSprite(TREE_OAK,  { G: '#4a8a34', D: '#33662a', L: '#5c9c44', T: '#6b4423' });
  S.tree_pine = makeSprite(TREE_PINE, { P: '#2a5c30', D: '#1e4526', T: '#5a3a22' });
  S.stump     = makeSprite(STUMP,     { T: '#8a6a40', D: '#5a4228', L: '#c9a86a' });
  const rockPal = { R: '#8a8a8a', L: '#a5a5a5', D: '#5f5f5f' };
  S.rock_copper = makeSprite(ROCK_ORE, Object.assign({}, rockPal, { X: '#c47a3d' }));
  S.rock_tin    = makeSprite(ROCK_ORE, Object.assign({}, rockPal, { X: '#d8dde0' }));
  S.rock_iron   = makeSprite(ROCK_ORE, Object.assign({}, rockPal, { X: '#b8bfc7' }));
  S.rock_gold   = makeSprite(ROCK_ORE, Object.assign({}, rockPal, { X: '#f2d06b' }));
  S.bare_rock   = makeSprite(BARE_ROCK, { R: '#9a9c92', K: '#6e706a' });
  // buildings
  S.house = makeSprite(HOUSE, { R: '#5a3a22', W: '#8a6a42', Y: '#c9a83c', D: '#3a2414' });
  S.hall  = makeSprite(HALL,  { R: '#6a2a2a', W: '#9a8560', Y: '#c9a83c', D: '#3a2414' });
  S.shop  = makeSprite(HOUSE, { R: '#3a5a7a', W: '#a08a5a', Y: '#c9a83c', D: '#3a2414' });
  S.smithy = makeSprite(HOUSE, { R: '#3a3e44', W: '#7a7568', Y: '#e88a2a', D: '#3a2414' });
  S.well    = makeSprite(WELL,    { K: '#4a3018', L: '#8a5a2a', S: '#a0a0a0', D: '#1a1a1a' });
  S.furnace = makeSprite(FURNACE, { K: '#4a4038', O: '#241a14', Y: '#e88a2a', R: '#f2d06b' });
  S.pot     = makeSprite(POT,     { K: '#2a2a30', T: '#4a4a55', S: '#6a6a78' });
  // monsters
  S.rat_A   = makeSprite(RAT_A,   { B: '#8a7a68', E: '#b5483c', T: '#9a8a78' });
  S.rat_B   = makeSprite(RAT_B,   { B: '#8a7a68', E: '#b5483c', T: '#9a8a78' });
  S.slime_A = makeSprite(SLIME_A, { G: '#4fae4f', D: '#357a35', W: '#ffffff', E: '#143314' });
  S.slime_B = makeSprite(SLIME_B, { G: '#4fae4f', D: '#357a35', W: '#ffffff', E: '#143314' });
  S.wolf_A  = makeSprite(WOLF_A,  { W: '#9aa0a8', E: '#222222', R: '#b5483c', K: '#5c6168' });
  S.wolf_B  = makeSprite(WOLF_B,  { W: '#9aa0a8', E: '#222222', R: '#b5483c', K: '#5c6168' });
  S.bear_A  = makeSprite(BEAR_A,  { B: '#7a5230', E: '#222222', L: '#d8c0a0', K: '#4e3520' });
  S.bear_B  = makeSprite(BEAR_B,  { B: '#7a5230', E: '#222222', L: '#d8c0a0', K: '#4e3520' });
  S.troll_A = makeSprite(TROLL_A, { G: '#8a9478', E: '#ffd24a', K: '#5a6450' });
  S.troll_B = makeSprite(TROLL_B, { G: '#8a9478', E: '#ffd24a', K: '#5a6450' });
  // swords
  S.sword_wooden  = sword('#c9b08a', '#8a5a2a');
  S.sword_copper  = sword('#d88a4a', '#8a5a2a');
  S.sword_iron    = sword('#b8bfc7', '#8a5a2a');
  S.sword_steel   = sword('#d8dee6', '#6a4a2a');
  S.sword_valiant = sword('#f0d878', '#8a3a3a');
  // item icons
  for (const [id, rows] of Object.entries(ITEMS_ART)) {
    S[id] = makeSprite(rows, ITEM_PAL, 2);
  }
}

export function getSprite(name) { return S[name] || null; }
