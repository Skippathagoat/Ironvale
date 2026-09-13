// Ironvale — sprites.js
// All art is original pixel art generated procedurally at load time (no asset files).
// Each sprite is defined as rows of characters mapped through a palette.

export const S = {}; // filled by buildSprites()

function makeSprite(rows, pal, scale = 2) {
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

// ---------- humanoid (2 walk frames) ----------

const HUM_A = [
  '.....HHHH.....',
  '....HHHHHH....',
  '....HSSSSH....',
  '....SESSES....',
  '....HSSSSH....',
  '.....SSSS.....',
  '....TTTTTT....',
  '...TTTTTTTT...',
  '..TSTTTTTTST..',
  '..TTTTTTTTTT..',
  '...TTTTTTTT...',
  '....TTTTTT....',
  '....LL..LL....',
  '....LL..LL....',
  '....LL..LL....',
  '....LL..LL....',
  '...BBB..BBB...',
  '...BBB..BBB...'
];
const HUM_B = [
  '.....HHHH.....',
  '....HHHHHH....',
  '....HSSSSH....',
  '....SESSES....',
  '....HSSSSH....',
  '.....SSSS.....',
  '....TTTTTT....',
  '...TTTTTTTT...',
  '..TSTTTTTTST..',
  '..TTTTTTTTTT..',
  '...TTTTTTTT...',
  '....TTTTTT....',
  '....LL.LL.....',
  '...LLL..LL....',
  '....LL..LL....',
  '.....LL.LL....',
  '...BBB..BBB...',
  '.....BBB..BB..'
];

function humanoid(pal, frame) {
  return makeSprite(frame === 'A' ? HUM_A : HUM_B, pal);
}

const NPC_PALS = {
  player: { H: '#5b3a1e', S: '#e8b88a', E: '#222222', T: '#3d6db5', L: '#4a4a55', B: '#2b2b33' },
  bram:   { H: '#d8d8d8', S: '#e8b88a', E: '#222222', T: '#8a6a3a', L: '#5a4a30', B: '#3a2f20' },
  greta:  { H: '#a03030', S: '#e8b88a', E: '#222222', T: '#7a3a8a', L: '#55355f', B: '#33203c' },
  torin:  { H: '#8a8f96', S: '#e8b88a', E: '#222222', T: '#4a4f56', L: '#3a3e44', B: '#26292e' },
  vill1:  { H: '#7a4a1f', S: '#e8b88a', E: '#222222', T: '#6a8a4a', L: '#4e5e3a', B: '#333d28' },
  vill2:  { H: '#3a3a3a', S: '#e8b88a', E: '#222222', T: '#8a4a4a', L: '#5e3a3a', B: '#3a2626' }
};

// ---------- world objects ----------

const TREE_OAK = [
  '.....GGGGGG.....',
  '...GGGGGGGGGG...',
  '..GGDGGGGGGDGG..',
  '.GGGGGGDDGGGGGG.',
  '.GDDGGGGGGGGDGG.',
  '.GGGGGGGGGGGGGG.',
  '..GGGDDGGGGDGG..',
  '...GGGGGGGGGG...',
  '.....GGGGGG.....',
  '......GGGG......',
  '.......TT.......',
  '......TTTT......',
  '......TDDT......',
  '......TTTT......'
];
const TREE_PINE = [
  '.......P........',
  '......PPP.......',
  '......PPP.......',
  '.....PPPPPP.....',
  '.....PPDPPP.....',
  '....PPPPPPPP....',
  '....PPDPPDPP....',
  '...PPPPPPPPPP...',
  '...PPPPDDPPPP...',
  '..PPPPPPPPPPPP..',
  '..PPDPPPPDPPP...',
  '...PPPPPPPP.....',
  '......TT........',
  '......TT........',
  '......DD........'
];
const STUMP = [
  '..TTTTTT..',
  '.TTLTTTLD.',
  '.TTTTTTTT.',
  '..TTTDTT..',
  '..TTTTTT..'
];

const ROCK_BASE = [
  '....RRRR....',
  '..RRRRRRRR..',
  '.RRRRRRRRRR.',
  '.RRKRRRRKRR.',
  'RRRRRRRRRRRR',
  'RRKRRRRRRKRR',
  '.RRRRRRRRRR.',
  '..RRRRRRRR..'
];

function rock(speck) {
  return makeSprite(ROCK_BASE, { R: '#7d7f85', K: '#565860', X: speck }, 2);
}

const BARE_ROCK = [
  '..RRRR..',
  '.RRKKRR.',
  '.RRRRRR.',
  '..RRRR..'
];

const HOUSE = [
  '..........RR..........',
  '.........RRRR.........',
  '........RRRRRR........',
  '.......RRRRRRRR.......',
  '......RRDDRRDDRR......',
  '.....RRRRRRRRRRRR.....',
  '....RRRRRRRRRRRRRR....',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWWW..',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWW...',
  '...WWWWWWDDWWWWWWWW...',
  '...WWWWWWDDWWWWWWWW...',
  '...WWWWWWDDWWWWWWWW...'
];

function building(pal, rows) { return makeSprite(rows, pal, 2); }

const HALL = [
  '...........RRRR...........RRRR..........',
  '..........RRRRRR........RRRRRR..........',
  '.........RRRRRRRR.....RRRRRRRR..........',
  '........RRDDRRRRRR..RRRRDDRRRR..........',
  '.......RRRRRRRRRRRRRRRRRRRRRRRR.........',
  '......RRRRDDRRRRRRRRRRDDRRRRRRRR........',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
  '.....WWWWWDDWWWWWWWWWWWWDDWWWWWWWW......',
  '.....WWWWWDDWWWWWWWWWWWWDDWWWWWWWW......',
  '.....WWWWWDDWWWWDDWWWWWWDDWWWWWWWW......',
  '.....WWWWWDDWWWWDDWWWWWWDDWWWWWWWW......',
  '.....WWWWWDDWWWWDDWWWWWWDDWWWWWWWW......'
];

const WELL = [
  '....KKKK....',
  '...KSSSSK...',
  '..KSSSSSSK..',
  '..KSSSSSSK..',
  '..KKKKKKKK..',
  '.KKKKKKKKKK.',
  '.KSKKKKKKSK.',
  '.KKKKKKKKKK.'
];

const FURNACE = [
  '..KKKKKKKK..',
  '.KKKKKKKKKK.',
  '.KKOOOOOOKK.',
  '.KKOOOOOOKK.',
  '.KKOYOOYOKK.',
  '.KKOYOOYOKK.',
  '.KKOOYYOOOK.',
  '.KKOOYYOOOK.',
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
  '......BBBBB......',
  '.....BBBBBBB.....',
  '....BBBWBWBBB....',
  '....BBBBBBBBB....',
  '...BBBBBBBBBBB...',
  '...BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB...',
  '...BBBRRBBBBBB...'
];
const RAT_B = [
  '......BBBBB......',
  '.....BBBBBBB.....',
  '....BBBWBWBBB....',
  '....BBBBBBBBB....',
  '...BBBBBBBBBBB...',
  '...BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB...',
  '....BBRBBBBBBB...'
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
  '....WW............WW....',
  '...WWWW..........WWWW...',
  '...WWWWW........WWWWW...',
  '...WWWWWWWWWWWWWWWWWW...',
  '..WWWWWWWWWWWWWWWWWWWW..',
  '..WWEEWWWWWWWWWWEEWWWW..',
  '..WWWWWWWWWWWWWWWWWWWW..',
  '...WWWWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWWWW...',
  '....WW.WW....WW....WW...',
  '....KK.KK....KK....KK...'
];
const WOLF_B = [
  '....WW............WW....',
  '...WWWW..........WWWW...',
  '...WWWWW........WWWWW...',
  '...WWWWWWWWWWWWWWWWWW...',
  '..WWWWWWWWWWWWWWWWWWWW..',
  '..WWEEWWWWWWWWWWEEWWWW..',
  '..WWWWWWWWWWWWWWWWWWWW..',
  '...WWWWWWWWWWWWWWWWWW...',
  '...WWWWWWWWWWWWWWWWWW...',
  '.....WW..WW..WW...WW....',
  '.....KK..KK..KK...KK....'
];

const BEAR_A = [
  '....BB..........BB....',
  '...BBBB........BBBB...',
  '...BBBBBBBBBBBBBBBB...',
  '..BBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '.BBBBEEBBBBBBBEEBBBB..',
  '.BBBBBBBBBBBBBBBBBBBB.',
  '.BBBLLLLLLLLLLLLBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '...BBBBBBBBBBBBBBBB...',
  '...BBB.BBBB.BBBB.BBB..',
  '...KKK.KKKK.KKKK.KKK..'
];
const BEAR_B = [
  '....BB..........BB....',
  '...BBBB........BBBB...',
  '...BBBBBBBBBBBBBBBB...',
  '..BBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '.BBBBEEBBBBBBBEEBBBB..',
  '.BBBBBBBBBBBBBBBBBBBB.',
  '.BBBLLLLLLLLLLLLBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBB..',
  '...BBBBBBBBBBBBBBBB...',
  '....BBB.BBBB.BBBB.....',
  '....KKK.KKKK.KKKK.....'
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
    '.BBBBBBBBBB.',
    'BB........BB',
    'B..........B',
    '.B........B.',
    '...WWWWWW...',
    '....WWWW....',
    '....WWWW....',
    '....WWWW....',
    '....WWWW....',
    '....WWWW....',
    '...WWWWWW...',
    '...WWWWWW...'
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
    '....BBBB....',
    '..BBBBBBBB..',
    '.BBWWBBWBBB.',
    'BBBBBBBBBBBB',
    'BBBBBBBBBBBB',
    '.BBBBBBBBBB.',
    '..BBBBBBBB..',
    '....BBBB....',
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
    '...BBBBBB...',
    '..BBBBBBBB..',
    '.BBKBBBBKBB.',
    '.BBBBBBBBBB.',
    'BBBBBBBBBBBB',
    'BBBBBBBBBBBB',
    '.BBBBBBBBBB.',
    '.BBBBBBBBBB.',
    '..BBBBBBBB..',
    '...BBBBBB...',
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
    '..UUUUUUUU..',
    '.UUUCCCCUUU.',
    '.UUCCUUCCUU.',
    'UUUUCCUUUUUU',
    'UUUUUUCCUUUU',
    '.UUUUUUUUUU.',
    '..UUUUUUUU..',
    '....UUUU....',
    '............',
    '............'
  ],
  ore_tin: [
    '............',
    '....UUUU....',
    '..UUUUUUUU..',
    '.UUUWWWWUUU.',
    '.UUWUUUUWUU.',
    'UUUUWUUUUUUU',
    'UUUUUUUUWUUU',
    '.UUUUUUUUUU.',
    '..UUUUUUUU..',
    '....UUUU....',
    '............',
    '............'
  ],
  ore_iron: [
    '............',
    '....UUUU....',
    '..UUUUUUUU..',
    '.UUUIIIIIUU.',
    '.UUIIUUIIUUU',
    'UUUUIIUUUUUU',
    'UUUUUUUIIUUU',
    '.UUUUUUUUUU.',
    '..UUUUUUUU..',
    '....UUUU....',
    '............',
    '............'
  ],
  ore_gold: [
    '............',
    '....UUUU....',
    '..UUUUUUUU..',
    '.UUUOOOOUUU.',
    '.UUOUUUUOOUU',
    'UUUUOOUUUUUU',
    'UUUUUUUOOUUU',
    '.UUUUUUUUUU.',
    '..UUUUUUUU..',
    '....UUUU....',
    '............',
    '............'
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
  S.tree_oak  = makeSprite(TREE_OAK,  { G: '#4e8f3a', D: '#356b28', T: '#7a5230' });
  S.tree_pine = makeSprite(TREE_PINE, { P: '#2f6b3a', D: '#24522c', T: '#6b4a2a' });
  S.stump     = makeSprite(STUMP,     { T: '#8a6a40', D: '#5a4228', L: '#c9a86a' });
  S.rock_copper = rock('#c47a3d');
  S.rock_tin    = rock('#d8dde0');
  S.rock_iron   = rock('#8f959c');
  S.rock_gold   = rock('#f2d06b');
  S.bare_rock   = makeSprite(BARE_ROCK, { R: '#9a9c92', K: '#6e706a' });
  S.house = building({ R: '#7a4a3a', D: '#5a352a', W: '#b09a70' }, HOUSE);
  S.hall  = building({ R: '#8a3a3a', D: '#642828', W: '#a8905e' }, HALL);
  S.shop  = building({ R: '#4a6a8a', D: '#33506e', W: '#c0a878' }, HOUSE);
  S.smithy = building({ R: '#5a5e66', D: '#3e424a', W: '#8a8578' }, HOUSE);
  S.well    = makeSprite(WELL,    { K: '#7d7f85', S: '#a9adb5' });
  S.furnace = makeSprite(FURNACE, { K: '#4a4440', O: '#2a1f18', Y: '#e88a2a' });
  S.pot     = makeSprite(POT,     { K: '#2a2a30', T: '#3a3a44', S: '#55555f' });
  // monsters
  S.rat_A   = makeSprite(RAT_A,   { B: '#8a7a6a', W: '#ffffff', E: '#222222', R: '#c9a8a8' });
  S.rat_B   = makeSprite(RAT_B,   { B: '#8a7a6a', W: '#ffffff', E: '#222222', R: '#c9a8a8' });
  S.slime_A = makeSprite(SLIME_A, { G: '#4fae4f', D: '#357a35', W: '#ffffff', E: '#143314' });
  S.slime_B = makeSprite(SLIME_B, { G: '#4fae4f', D: '#357a35', W: '#ffffff', E: '#143314' });
  S.wolf_A  = makeSprite(WOLF_A,  { W: '#9aa0a8', E: '#222222', K: '#5c6168' });
  S.wolf_B  = makeSprite(WOLF_B,  { W: '#9aa0a8', E: '#222222', K: '#5c6168' });
  S.bear_A  = makeSprite(BEAR_A,  { B: '#7a5230', E: '#222222', L: '#d8c0a0', K: '#4e3520' });
  S.bear_B  = makeSprite(BEAR_B,  { B: '#7a5230', E: '#222222', L: '#d8c0a0', K: '#4e3520' });
  S.troll_A = makeSprite(TROLL_A, { G: '#7a8a6a', E: '#ffd24a', K: '#4a5644' });
  S.troll_B = makeSprite(TROLL_B, { G: '#7a8a6a', E: '#ffd24a', K: '#4a5644' });
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
