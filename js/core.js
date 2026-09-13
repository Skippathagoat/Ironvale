// Ironvale — core: seeded RNG, noise, world generation, pathfinding, game data.
// Pure module: no DOM/canvas access (safe to import in node for tests).

export const SIZE = 640; // world is SIZE x SIZE tiles
export const TILE_W = 32;
export const TILE_H = 16;

export const T = {
  OCEAN: 0, SHALLOW: 1, SAND: 2, GRASS: 3, TALL: 4, HILLS: 5, MOUNT: 6, SNOW: 7,
  OAK: 8, PINE: 9, COPPER: 10, TIN: 11, IRON: 12, GOLD: 13,
  BARE: 14, STUMP: 15, ROAD: 16, PLAZA: 17
};

export const BLOCKED_TILES = new Set([
  T.OCEAN, T.SHALLOW, T.OAK, T.PINE, T.COPPER, T.TIN, T.IRON, T.GOLD, T.STUMP
]);

// ---------- deterministic RNG / noise ----------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y, seed) {
  let h = Math.imul(x + 0x1f1, 374761393) + Math.imul(y + 0x9e37, 668265263) + Math.imul(seed | 0, 974634211);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

export function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = smoothstep(xf), v = smoothstep(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, seed, octaves = 4) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * freq, y * freq, seed + i * 1013);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

// ---------- XP / levels (original curve) ----------

export const MAX_LEVEL = 99;

export const XP_TABLE = (() => {
  const t = new Array(MAX_LEVEL + 1).fill(0);
  let total = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    total += Math.round(25 * Math.pow(l, 1.75));
    t[l + 1] = total;
  }
  return t;
})();

export function levelFromXp(xp) {
  let l = 1;
  while (l < MAX_LEVEL && XP_TABLE[l + 1] <= xp) l++;
  return l;
}

export function xpForLevel(l) { return XP_TABLE[l]; }

export const SKILLS = [
  { id: 'attack',   name: 'Attack' },
  { id: 'strength', name: 'Strength' },
  { id: 'defence',  name: 'Defence' },
  { id: 'woodcut',  name: 'Woodcutting' },
  { id: 'mining',   name: 'Mining' },
  { id: 'smithing', name: 'Smithing' },
  { id: 'cooking',  name: 'Cooking' }
];

// ---------- items ----------

export const EQUIP_SLOTS = ['helm', 'chest', 'legs', 'boots', 'weapon'];

export const ITEMS = {
  // resources
  log_oak:    { name: 'Oak Log',      stack: true, sell: 4 },
  log_pine:   { name: 'Pine Log',     stack: true, sell: 6 },
  ore_copper: { name: 'Copper Ore',   stack: true, sell: 6 },
  ore_tin:    { name: 'Tin Ore',      stack: true, sell: 7 },
  ore_iron:   { name: 'Iron Ore',     stack: true, sell: 12 },
  ore_gold:   { name: 'Gold Ore',     stack: true, sell: 45 },
  bar_copper: { name: 'Copper Bar',   stack: true, sell: 16 },
  bar_iron:   { name: 'Iron Bar',     stack: true, sell: 40 },
  bar_steel:  { name: 'Steel Bar',    stack: true, sell: 95 },
  // food / consumables
  meat_raw:     { name: 'Raw Meat',       stack: true, sell: 3 },
  meat_cooked:  { name: 'Cooked Meat',    stack: true, sell: 9, heals: 8 },
  potion_heal:  { name: 'Healing Potion', stack: true, sell: 30, heals: 15 },
  // pelts
  pelt_wolf: { name: 'Wolf Pelt', stack: true, sell: 22 },
  pelt_bear: { name: 'Bear Pelt', stack: true, sell: 55, desc: 'Thick fur. An old man would pay well for this...' },
  // tools
  axe:     { name: 'Iron Axe',     desc: 'For chopping wood.' },
  pickaxe: { name: 'Iron Pickaxe', desc: 'For mining ore.' },
  // weapons
  sword_wooden:  { name: 'Wooden Sword',  weapon: true, atk: 1, str: 1, sell: 25 },
  sword_copper:  { name: 'Copper Sword',  weapon: true, atk: 2, str: 2, sell: 60 },
  sword_iron:    { name: 'Iron Sword',    weapon: true, atk: 3, str: 3, sell: 150 },
  sword_steel:   { name: 'Steel Sword',   weapon: true, atk: 5, str: 5, sell: 320 },
  sword_valiant: { name: 'Valiant Blade', weapon: true, atk: 8, str: 8, desc: 'A blade blessed by the elders of Oldgate.' },
  // armor
  helm_leather:  { name: 'Leather Coif',     armor: 'helm',  def: 1, sell: 60 },
  chest_leather: { name: 'Leather Vest',     armor: 'chest', def: 2, sell: 120 },
  legs_leather:  { name: 'Leather Tassets',  armor: 'legs',  def: 1, sell: 90 },
  boots_leather: { name: 'Leather Boots',    armor: 'boots', def: 1, sell: 50 },
  helm_iron:     { name: 'Iron Helm',        armor: 'helm',  def: 3, sell: 180 },
  chest_iron:    { name: 'Iron Platebody',   armor: 'chest', def: 5, sell: 350 },
  legs_iron:     { name: 'Iron Platelegs',   armor: 'legs',  def: 4, sell: 260 },
  chest_steel:   { name: 'Steel Platebody',  armor: 'chest', def: 8, sell: 700 }
};

// ---------- monsters ----------
// drops: [itemId, chance, minQty, maxQty]

export const MONSTERS = {
  rat: {
    name: 'Giant Rat', level: 1, hp: 6, atk: 2, str: 1, def: 0, xp: 10,
    speed: 3.0, passive: true,
    drops: [['coin', 1, 2, 6], ['meat_raw', 0.15, 1, 1]]
  },
  slime: {
    name: 'Slime', level: 3, hp: 10, atk: 3, str: 2, def: 0, xp: 16,
    speed: 2.4, passive: true,
    drops: [['coin', 1, 2, 8]]
  },
  wolf: {
    name: 'Wolf', level: 6, hp: 16, atk: 6, str: 4, def: 2, xp: 26,
    speed: 4.2, passive: true,
    drops: [['meat_raw', 1, 1, 2], ['pelt_wolf', 0.4, 1, 1], ['coin', 1, 1, 5]]
  },
  bear: {
    name: 'Brown Bear', level: 10, hp: 26, atk: 10, str: 8, def: 4, xp: 42,
    speed: 3.6, passive: false, aggro: 5,
    drops: [['meat_raw', 1, 1, 2], ['pelt_bear', 0.6, 1, 1], ['coin', 1, 2, 10]]
  },
  troll: {
    name: 'Rock Troll', level: 15, hp: 42, atk: 15, str: 13, def: 8, xp: 70,
    speed: 3.0, passive: false, aggro: 6,
    drops: [['coin', 1, 5, 30], ['ore_gold', 0.2, 1, 2], ['ore_iron', 0.5, 1, 2]]
  }
};

// ---------- crafting / shop ----------

export const SMITH_RECIPES = [
  { id: 'bar_copper',   name: 'Copper Bar',      level: 1,  needs: { ore_copper: 4 }, xp: 8 },
  { id: 'bar_iron',     name: 'Iron Bar',        level: 1,  needs: { ore_iron: 4 },   xp: 8 },
  { id: 'bar_steel',    name: 'Steel Bar',       level: 20, needs: { bar_iron: 2 },   xp: 16 },
  { id: 'sword_copper', name: 'Copper Sword',    level: 5,  needs: { bar_copper: 2 }, xp: 10 },
  { id: 'sword_iron',   name: 'Iron Sword',      level: 10, needs: { bar_iron: 2 },   xp: 12 },
  { id: 'sword_steel',  name: 'Steel Sword',     level: 25, needs: { bar_steel: 2 },  xp: 20 },
  { id: 'helm_iron',    name: 'Iron Helm',       level: 8,  needs: { bar_iron: 1 },   xp: 10 },
  { id: 'chest_iron',   name: 'Iron Platebody',  level: 12, needs: { bar_iron: 2 },   xp: 14 },
  { id: 'legs_iron',    name: 'Iron Platelegs',  level: 15, needs: { bar_iron: 2 },   xp: 16 },
  { id: 'chest_steel',  name: 'Steel Platebody', level: 30, needs: { bar_steel: 2 },  xp: 26 }
];

export const SHOP_STOCK = {
  buy: {
    sword_wooden: 50, axe: 75, pickaxe: 75,
    helm_leather: 90, chest_leather: 180, legs_leather: 140, boots_leather: 80,
    sword_iron: 220, sword_steel: 450, chest_steel: 950,
    meat_cooked: 18, potion_heal: 35
  },
  sell: {
    log_oak: 4, log_pine: 6, ore_copper: 6, ore_tin: 7, ore_iron: 12, ore_gold: 40,
    bar_copper: 16, bar_iron: 40, bar_steel: 95,
    pelt_wolf: 22, pelt_bear: 55, meat_cooked: 9, meat_raw: 3
  }
};

// ---------- quests ----------

export const QUESTS = [
  {
    id: 'rats', name: 'The Cellar Rats',
    intro: 'Rats have taken up in the fields around town. Slay three giant rats and the fields will rest easy.',
    goal: 'Slay 3 Giant Rats', count: 3, target: 'rat',
    rewardText: '100 XP to Attack, Strength and Defence, plus 50 coins',
    reward: { xp: { attack: 100, strength: 100, defence: 100 }, coins: 50 }
  },
  {
    id: 'iron', name: 'Fuel for the Forge',
    intro: 'My forge is hungry. Bring me 6 iron ore from the mountains and I will make it worth your while.',
    goal: 'Bring 6 Iron Ore to Torin', count: 6, item: 'ore_iron',
    rewardText: '300 Mining XP and an Iron Sword',
    reward: { xp: { mining: 300 }, item: 'sword_iron' }
  },
  {
    id: 'bear', name: "The Bear's Treasure",
    intro: 'A great brown bear has hoarded the village savings in a hill cave. Slay two bears and bring me their pelts, hero.',
    goal: 'Bring 2 Bear Pelts to Elder Bram', count: 2, item: 'pelt_bear',
    rewardText: '2,500 coins, 800 XP to all combat skills, and the title "Hero of Ironvale"',
    reward: { xp: { attack: 800, strength: 800, defence: 800 }, coins: 2500, title: 'Hero of Ironvale' }
  }
];

// ---------- world generation ----------

export function tileAt(w, x, y) {
  if (x < 0 || y < 0 || x >= w.size || y >= w.size) return T.OCEAN;
  return w.terrain[y * w.size + x];
}

export function isWalkable(w, x, y) {
  if (x < 0 || y < 0 || x >= w.size || y >= w.size) return false;
  const i = y * w.size + x;
  const t = w.terrain[i];
  if (BLOCKED_TILES.has(t)) return false;
  if (w.bldMask[i] || w.objMask[i]) return false;
  return true;
}

function terrainRow(world, y, size, seed) {
  const cx = size >> 1, cy = size >> 1;
  for (let x = 0; x < size; x++) {
    let h = fbm(x * 0.006, y * 0.006, seed);
    const d = Math.hypot(x - cx, y - cy) / (size * 0.55);
    // keep the town area land, then fade to ocean toward the map edges
    const boost = Math.max(0, 0.18 - d * 0.55);
    h += boost;
    const excess = (d - 0.55) / 0.45;
    const mult = 1 - (excess > 0 ? Math.pow(excess, 1.8) * 1.15 : 0);
    h *= mult;
    const m = fbm(x * 0.016 + 400, y * 0.016 + 400, (seed ^ 0x51ab) | 0);
    let t;
    if (h < 0.30) t = T.OCEAN;
    else if (h < 0.33) t = T.SHALLOW;
    else if (h < 0.355) t = T.SAND;
    else if (h < 0.55) t = m > 0.56 && hash2(x, y, seed + 31) < 0.55 ? T.TALL : T.GRASS;
    else if (h < 0.70) t = T.HILLS;
    else if (h < 0.80) t = T.MOUNT;
    else t = T.SNOW;
    world.terrain[y * size + x] = t;
  }
}

function addFeatures(world, seed, onProgress) {
  const { size, terrain, bldMask, objMask } = world;
  const cx = size >> 1, cy = size >> 1;
  const inTown = (x, y) => Math.hypot(x - cx, y - cy) < 17;

  // trees & ore veins
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const t = terrain[i];
      if (inTown(x, y)) continue;
      if (t === T.GRASS || t === T.TALL) {
        const m = fbm(x * 0.016 + 400, y * 0.016 + 400, (seed ^ 0x51ab) | 0);
        if (m > 0.5 && hash2(x, y, seed + 77) < 0.16) terrain[i] = T.OAK;
      } else if (t === T.HILLS && hash2(x, y, seed + 131) < 0.055) {
        terrain[i] = hash2(x, y, seed + 132) < 0.5 ? T.COPPER : T.TIN;
      } else if (t === T.MOUNT) {
        // cold noise patches some peaks in snow
        const cold = fbm(x * 0.02 + 900, y * 0.02 + 900, (seed ^ 0x77b2) | 0);
        if (cold > 0.58) {
          terrain[i] = T.SNOW;
        } else if (hash2(x, y, seed + 133) < 0.05) {
          terrain[i] = T.IRON;
        }
      } else if (t === T.SNOW && hash2(x, y, seed + 134) < 0.04) {
        terrain[i] = T.GOLD;
      }
    }
    if (onProgress && (y & 63) === 0) onProgress(0.6 + (y / size) * 0.25);
  }

  // ---- town of Oldgate ----
  const buildings = [];
  const objects = [];
  function mark(x, y, mask) {
    if (x >= 0 && y >= 0 && x < size && y < size) mask[y * size + x] = 1;
  }
  // clear a meadow around town
  for (let y = cy - 16; y <= cy + 16; y++) {
    for (let x = cx - 16; x <= cx + 16; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      if (Math.hypot(x - cx, y - cy) < 17) {
        const t = terrain[y * size + x];
        if (t === T.OCEAN || t === T.SHALLOW) terrain[y * size + x] = T.SAND;
        else terrain[y * size + x] = T.GRASS;
      }
    }
  }
  // plaza
  for (let y = cy - 4; y <= cy + 4; y++)
    for (let x = cx - 7; x <= cx + 7; x++)
      terrain[y * size + x] = T.PLAZA;
  // roads
  const setRoad = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const t = terrain[y * size + x];
    if (t === T.GRASS || t === T.TALL || t === T.SAND || t === T.HILLS || t === T.MOUNT) terrain[y * size + x] = T.ROAD;
  };
  for (let k = -56; k <= 56; k++) { setRoad(cx + k, cy); setRoad(cx, cy + k); }

  function addBuilding(x, y, w, h, type) {
    buildings.push({ x, y, w, h, type });
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) mark(x + i, y + j, bldMask);
  }
  addBuilding(cx - 13, cy - 9, 6, 4, 'hall');
  addBuilding(cx + 8,  cy - 10, 5, 4, 'shop');
  addBuilding(cx + 8,  cy + 6,  5, 4, 'smithy');
  addBuilding(cx - 12, cy + 6,  4, 3, 'house');
  addBuilding(cx - 5,  cy + 6,  4, 3, 'house');
  addBuilding(cx + 1,  cy - 10, 4, 3, 'house');
  addBuilding(cx - 8,  cy - 5,  4, 3, 'house');
  addBuilding(cx + 11, cy - 1,  4, 3, 'house');

  function addObject(x, y, type) {
    objects.push({ x, y, type });
    mark(x, y, objMask);
  }
  addObject(cx - 1, cy + 3, 'well');
  addObject(cx + 8, cy + 5, 'furnace');
  addObject(cx - 7, cy + 5, 'pot');

  // ---- NPCs ----
  const npcs = [
    { id: 'bram',  name: 'Elder Bram', role: 'elder',    x: cx - 4, y: cy + 2, pal: 'bram' },
    { id: 'greta', name: 'Greta',      role: 'merchant', x: cx + 10, y: cy - 5, pal: 'greta' },
    { id: 'torin', name: 'Torin',      role: 'smith',    x: cx + 10, y: cy + 4, pal: 'torin' },
    { id: 'v1',    name: 'Villager',   role: 'villager', x: cx + 3, y: cy - 2, pal: 'vill1' },
    { id: 'v2',   name: 'Villager',   role: 'villager', x: cx - 2, y: cy - 3, pal: 'vill2' }
  ];

  // ---- monster spawns ----
  const monsters = [];
  const rng = mulberry32((seed ^ 0x77aa55) | 0);
  const dist = (x, y) => Math.hypot(x - cx, y - cy);
  function nearTree(x, y) {
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
      const t = terrain[yy * size + xx];
      if (t === T.OAK || t === T.PINE) return true;
    }
    return false;
  }
  function spawnType(type, count, valid) {
    let tries = 0, placed = 0;
    while (placed < count && tries < count * 300) {
      tries++;
      const x = (rng() * size) | 0, y = (rng() * size) | 0;
      const i = y * size + x;
      const t = terrain[i];
      if (!valid(t, x, y)) continue;
      if (bldMask[i] || objMask[i]) continue;
      if (dist(x, y) < 20) continue;
      monsters.push({ id: monsters.length, type, x, y, homeX: x, homeY: y });
      placed++;
    }
  }
  spawnType('rat', 30, (t, x, y) => (t === T.GRASS || t === T.SAND || t === T.TALL) && dist(x, y) > 16 && dist(x, y) < 50);
  spawnType('slime', 80, (t) => t === T.GRASS || t === T.TALL || t === T.SAND);
  spawnType('wolf', 90, (t, x, y) => (t === T.GRASS || t === T.TALL) && nearTree(x, y));
  spawnType('bear', 50, (t) => t === T.HILLS);
  spawnType('troll', 35, (t) => t === T.MOUNT || t === T.SNOW);

  world.buildings = buildings;
  world.objects = objects;
  world.npcs = npcs;
  world.monsters = monsters;
  world.town = { x: cx, y: cy };
  if (onProgress) onProgress(0.9);
}

export function generateWorld(seed, size = SIZE, onProgress) {
  const world = {
    size,
    seed,
    terrain: new Uint8Array(size * size),
    bldMask: new Uint8Array(size * size),
    objMask: new Uint8Array(size * size),
    buildings: [],
    objects: [],
    npcs: [],
    monsters: [],
    town: { x: size >> 1, y: size >> 1 }
  };
  for (let y = 0; y < size; y++) {
    terrainRow(world, y, size, seed);
    if (onProgress && (y & 63) === 0) onProgress(y / size * 0.6);
  }
  addFeatures(world, seed, onProgress);
  if (onProgress) onProgress(1);
  return world;
}

export async function generateWorldAsync(seed, size = SIZE, onProgress) {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const world = {
    size,
    seed,
    terrain: new Uint8Array(size * size),
    bldMask: new Uint8Array(size * size),
    objMask: new Uint8Array(size * size),
    buildings: [],
    objects: [],
    npcs: [],
    monsters: [],
    town: { x: size >> 1, y: size >> 1 }
  };
  for (let y = 0; y < size; y += 64) {
    const end = Math.min(size, y + 64);
    for (let yy = y; yy < end; yy++) terrainRow(world, yy, size, seed);
    if (onProgress) onProgress((end / size) * 0.6);
    await tick();
  }
  if (onProgress) onProgress(0.62);
  await tick();
  addFeatures(world, seed, (p) => onProgress && onProgress(p));
  return world;
}

// ---------- A* pathfinding ----------

class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      const tmp = a[p]; a[p] = a[i]; a[i] = tmp;
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        const tmp = a[m]; a[m] = a[i]; a[i] = tmp;
        i = m;
      }
    }
    return top;
  }
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
];

let _pfG = null, _pfFrom = null, _pfClosed = null, _pfN = 0;

export function pathfind(w, sx, sy, tx, ty, maxExpansions = 6000) {
  if (sx === tx && sy === ty) return [];
  if (!isWalkable(w, tx, ty)) return null;
  const N = w.size;
  if (N !== _pfN) {
    _pfG = new Float32Array(N * N);
    _pfFrom = new Int32Array(N * N);
    _pfClosed = new Uint8Array(N * N);
    _pfN = N;
  }
  const g = _pfG, from = _pfFrom, closed = _pfClosed;
  const start = sy * N + sx, goal = ty * N + tx;
  let touches = -1;
  for (let i = 0; i < N * N; i++) {
    if (g[i] !== touches) g[i] = Infinity;
    from[i] = -1;
    closed[i] = 0;
  }
  const h = (i) => {
    const x = i % N, y = (i / N) | 0;
    const dx = Math.abs(x - tx), dy = Math.abs(y - ty);
    return Math.max(dx, dy) + Math.min(dx, dy) * 0.414;
  };
  g[start] = 0;
  const heap = new MinHeap();
  heap.push({ i: start, f: h(start) });
  let expanded = 0;
  while (heap.size() && expanded < maxExpansions) {
    const cur = heap.pop();
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;
    expanded++;
    if (cur.i === goal) break;
    const cx = cur.i % N, cy = (cur.i / N) | 0;
    for (let d = 0; d < 8; d++) {
      const dx = DIRS[d][0], dy = DIRS[d][1], cost = DIRS[d][2];
      const nx = cx + dx, ny = cy + dy;
      if (!isWalkable(w, nx, ny)) continue;
      if (dx && dy) {
        if (!isWalkable(w, cx + dx, cy) || !isWalkable(w, cx, cy + dy)) continue;
      }
      const ni = ny * N + nx;
      if (closed[ni]) continue;
      const ng = g[cur.i] + cost;
      if (ng < g[ni]) {
        g[ni] = ng;
        from[ni] = cur.i;
        heap.push({ i: ni, f: ng + h(ni) });
      }
    }
  }
  if (from[goal] === -1) return null;
  const path = [];
  let i = goal;
  let guard = 0;
  while (i !== start && guard++ < N * N) {
    path.push({ x: i % N, y: (i / N) | 0 });
    i = from[i];
  }
  path.reverse();
  return path;
}
