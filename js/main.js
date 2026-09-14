// Ironvale — main.js
// Boot, rendering, input, monster AI, UI wiring.

import {
  SIZE, T, TILE_W, TILE_H,
  SKILLS, XP_TABLE, levelFromXp, ITEMS, MONSTERS, SMITH_RECIPES, SHOP_STOCK, QUESTS,
  generateWorldAsync, tileAt, isWalkable, pathfind, hash2, mulberry32
} from './core.js';
import { buildSprites, S } from './sprites.js';
import * as THREE from 'three';
import * as M3D from './models.js';
import {
  newGame, restoreGame, serialize,
  level, combatLevel, maxHp, bonus, addXp, setLevelUpHook, rollAttack,
  addItem, removeItem, countItem, equipFromInv, unequipSlot,
  chopTick, mineTick, cookTick, smithRecipe,
  shopPrice, buyItem, sellItem, eatItem,
  startQuest, monsterKilledForQuests, deliverItemQuest, completeCountQuest, questDef,
  INVENTORY_SIZE, clamp
} from './game.js';
import { initAudio, sfx, setMuted, isMuted } from './sfx.js';

// ---------- globals ----------

const canvas = document.getElementById('world');
let ctx = null; // created lazily — only when the 3D renderer is unavailable
let W = 0, H = 0;

let world = null;
let g = null;
let state = 'title';           // title | loading | playing | dead
let frozen = false;            // UI panels open
let gameNow = 0;
let lastTs = 0;
let camX = 0, camY = 0;
let R3D = null; // three.js renderer state (null = classic 2D fallback)
let hover = { tx: 0, ty: 0, target: null };
let floats = [];
let minimapSrc = null;
let saveTimer = 0;
let mouseDown = false;

const keys = new Set();
const SAVE_KEY = 'ironvale_save_v1';

const $ = (id) => document.getElementById(id);
const els = {
  skills: $('skills'), minimap: $('minimap'), coords: $('coords'),
  hpfill: $('hpfill'), hpnum: $('hpnum'), cl: $('cl'), playertitle: $('playertitle'),
  equiprow: $('equiprow'), invgrid: $('invgrid'), coins: $('coins'),
  actionbar: $('actionbar'), log: $('log'),
  ctxmenu: $('ctxmenu'), tooltip: $('tooltip'),
  loading: $('loading'), loadlabel: $('loadlabel'), loadbar: $('loadbar'),
  title: $('title'), seedinput: $('seedinput'),
  btnNew: $('btn-new'), btnContinue: $('btn-continue'), btnHow: $('btn-how'),
  dialog: $('dialog'), portrait: $('portrait'), speakername: $('speakername'),
  speakerlines: $('speakerlines'), dialogchoices: $('dialogchoices'), dialogcontinue: $('dialogcontinue'),
  modal: $('modal'), modaltitle: $('modaltitle'), modalbody: $('modalbody'), modalclose: $('modalclose'),
  death: $('death'), deathmsg: $('deathmsg'), btnRespawn: $('btn-respawn')
};

// ---------- ground colors (type -> [main, alt]) ----------

// classic-era palette: warm muted greens, deep blue water, earthy roads
// near-identical twin tones: classic RS ground reads as one surface, with
// all visual interest coming from the painted texture speckles — not stripes.
const GROUND_COLORS = {
  [T.OCEAN]:   ['#1e3f74', '#214279'],
  [T.SHALLOW]: ['#2c5c94', '#2f5e96'],
  [T.SAND]:    ['#d8c078', '#d5bd75'],
  [T.GRASS]:   ['#57893b', '#558638'],
  [T.TALL]:    ['#4c7c31', '#4b7a2f'],
  [T.HILLS]:   ['#8a8f62', '#898d60'],
  [T.MOUNT]:   ['#99a0a8', '#989ea5'],
  [T.SNOW]:    ['#e9edf2', '#e7ecf1'],
  [T.OAK]:     ['#57893b', '#558638'],
  [T.PINE]:    ['#7f8458', '#7e8256'],
  [T.COPPER]:  ['#85897c', '#84887b'],
  [T.TIN]:     ['#85897c', '#84887b'],
  [T.IRON]:    ['#85897c', '#84887b'],
  [T.GOLD]:    ['#9aa0a8', '#999fa6'],
  [T.BARE]:    ['#9a9c92', '#999b91'],
  [T.STUMP]:   ['#57893b', '#558638'],
  [T.ROAD]:    ['#a09068', '#9f8f67'],
  [T.PLAZA]:   ['#cabb92', '#c9b98f']
};

const MINI_COLORS = {
  [T.OCEAN]: [30, 63, 116], [T.SHALLOW]: [44, 92, 148], [T.SAND]: [216, 192, 120],
  [T.GRASS]: [90, 140, 58], [T.TALL]: [79, 127, 51], [T.HILLS]: [138, 143, 98],
  [T.MOUNT]: [153, 160, 168], [T.SNOW]: [233, 237, 242], [T.OAK]: [82, 132, 52],
  [T.PINE]: [127, 132, 88], [T.COPPER]: [168, 118, 62], [T.TIN]: [185, 190, 196],
  [T.IRON]: [125, 129, 136], [T.GOLD]: [217, 185, 60], [T.BARE]: [154, 156, 146],
  [T.STUMP]: [107, 83, 52], [T.ROAD]: [160, 144, 104], [T.PLAZA]: [202, 187, 146]
};

const T_OBJ_SPRITE = {
  [T.OAK]: 'tree_oak', [T.PINE]: 'tree_pine',
  [T.COPPER]: 'rock_copper', [T.TIN]: 'rock_tin', [T.IRON]: 'rock_iron', [T.GOLD]: 'rock_gold',
  [T.STUMP]: 'stump', [T.BARE]: 'bare_rock'
};

const OBJ_NAMES = { well: 'An old stone well.', furnace: 'A roaring blacksmith furnace.', pot: 'A big cooking pot.' };
const BLD_NAMES = { house: 'A cosy village house.', hall: 'The Elder Hall of Oldgate.', shop: 'Greta\'s General Store.', smithy: 'Torin\'s Smithy.' };
const NPC_TITLES = { elder: 'Elder of Oldgate', merchant: 'Shopkeeper', smith: 'Blacksmith', villager: 'Villager' };

const VILLAGER_LINES = [
  'The roads are quiet these days. A fine thing.',
  'Mind the bears up in the hills. They are not friendly.',
  'My grandmother always said: eat before you fight.',
  'The trolls love the gold mines. Do not blame me if you find out why the hard way.',
  'Oldgate has stood for a hundred years. We intend to keep it that way.'
];

// ---------- canvas / camera ----------

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  if (R3D) {
    R3D.renderer.setSize(W, H);
    R3D.camera.aspect = W / H;
    R3D.camera.updateProjectionMatrix();
  } else {
    if (!ctx) ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
  }
}
window.addEventListener('resize', resize);

function worldToScreen(px, py) {
  return { x: (px - py) * (TILE_W / 2) + camX, y: (px + py) * (TILE_H / 2) + camY };
}
function screenToTile(mx, my) {
  if (R3D && !R3D.renderDead) {
    R3D.ndc.set((mx / W) * 2 - 1, -(my / H) * 2 + 1);
    R3D.ray.setFromCamera(R3D.ndc, R3D.camera);
    const o = R3D.ray.ray.origin, d = R3D.ray.ray.direction;
    if (Math.abs(d.y) > 1e-6) {
      const t = -o.y / d.y;
      if (t > 0) return { tx: o.x + d.x * t, ty: o.z + d.z * t };
    }
    return { tx: g.player.x, ty: g.player.y };
  }
  const a = (mx - camX) / (TILE_W / 2);
  const b = (my - camY) / (TILE_H / 2);
  return { tx: (a + b) / 2, ty: (b - a) / 2 };
}
function updateCamera() {
  const p = g.player;
  camX = W / 2 - (p.x - p.y) * (TILE_W / 2);
  camY = H / 2 - (p.x + p.y) * (TILE_H / 2);
}

// ---------- ground block cache ----------
// Ground tiles are painted with subtle texture detail (grass tufts, cobbles,
// water sparkle) like the classic client — never flat posterized color.

const GROUND_TEX_KIND = {
  [T.OCEAN]: 'water', [T.SHALLOW]: 'water', [T.SAND]: 'sand',
  [T.GRASS]: 'grass', [T.TALL]: 'tall', [T.HILLS]: 'hill',
  [T.MOUNT]: 'rock', [T.SNOW]: 'snow',
  [T.OAK]: 'grass', [T.PINE]: 'grass',
  [T.COPPER]: 'rock', [T.TIN]: 'rock', [T.IRON]: 'rock', [T.GOLD]: 'rock',
  [T.BARE]: 'rock', [T.STUMP]: 'grass',
  [T.ROAD]: 'road', [T.PLAZA]: 'plaza'
};
const TEX_STYLE = {
  grass: { d: '#3f682c', l: '#69993f', n: 5, h: 1 },
  tall:  { d: '#335c1f', l: '#62913a', n: 7, h: 2 },
  water: { d: null,     l: '#4a7ab0', n: 3, h: 1, shine: true },
  sand:  { d: '#c2a65c', l: null,     n: 4, h: 1 },
  road:  { d: '#8a7c58', l: '#b3a37b', n: 6, h: 1 },
  plaza: { d: '#b3a27a', l: '#ddd0aa', n: 5, h: 1 },
  hill:  { d: '#74784c', l: '#9aa06e', n: 4, h: 1 },
  rock:  { d: '#6e7178', l: '#9ea4ab', n: 4, h: 1 },
  snow:  { d: '#ccd8e4', l: null,     n: 3, h: 1 }
};

// tile diamond: top corner (sx,sy), half-width 32, half-height 16 (device px at 2x)
function paintTileTex(c, sx, sy, kind, tx, ty, phase) {
  const st = TEX_STYLE[kind];
  if (!st) return;
  const rnd = mulberry32(((world.seed + 101) ^ 0x51ed270b) + tx * 7349 + ty * 9151);
  const w = st.shine ? 8 : 4, h = st.h * 2;
  for (let k = 0; k < st.n * 3 && k < 40; k++) {
    const r1 = rnd(), r2 = rnd(), r3 = rnd();
    let u = 3 + r1 * 58, v = 3 + r2 * 26;
    if (st.shine) u = 3 + ((r1 * 58 + phase * 9 + tx * 5 + ty * 13) % 58);
    if (Math.abs(u - 32) / 32 + Math.abs(v - 16) / 16 > 0.9) continue;
    c.fillStyle = (st.d && st.l) ? (r3 < 0.5 ? st.d : st.l) : (st.d || st.l);
    c.fillRect((sx + u - 2) | 0, (sy + v - 1) | 0, w, h);
  }
}

const groundCache = new Map();
const GROUND_CACHE_MAX = 160;
const BLOCK = 8;

function getGroundBlock(bx, by, phase) {
  const key = bx + ',' + by + ',' + phase;
  let cv = groundCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const c = cv.getContext('2d');
  const size = world.size;
  for (let j = 0; j < BLOCK; j++) {
    for (let i = 0; i < BLOCK; i++) {
      const tx = bx * BLOCK + i, ty = by * BLOCK + j;
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
      const t = world.terrain[ty * size + tx];
      const pair = GROUND_COLORS[t];
      let col;
      if (t === T.OCEAN || t === T.SHALLOW) col = (tx * 7 + ty * 13 + phase * 11) % 5 < 2 ? pair[1] : pair[0];
      else col = hash2(tx, ty, world.seed) < 0.5 ? pair[0] : pair[1];
      const sx = (i - j) * 32 + 256, sy = (i + j) * 16;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + 32, sy + 16);
      c.lineTo(sx, sy + 32);
      c.lineTo(sx - 32, sy + 16);
      c.closePath();
      c.fill();
      paintTileTex(c, sx, sy, GROUND_TEX_KIND[t] || 'grass', tx, ty, phase);
    }
  }
  if (groundCache.size >= GROUND_CACHE_MAX) {
    const first = groundCache.keys().next().value;
    groundCache.delete(first);
  }
  groundCache.set(key, cv);
  return cv;
}

function invalidateGround() {
  groundCache.clear();
  if (R3D) R3D.staticsDirty = true;
}

// ---------- world generation / save flow ----------

function showOverlay(id) { $(id).classList.remove('hidden'); }
function hideOverlay(id) { $(id).classList.add('hidden'); }

function buildMinimap() {
  const size = world.size;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cc = c.getContext('2d');
  const img = cc.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const col = MINI_COLORS[world.terrain[i]] || [0, 0, 0];
    img.data[i * 4] = col[0];
    img.data[i * 4 + 1] = col[1];
    img.data[i * 4 + 2] = col[2];
    img.data[i * 4 + 3] = 255;
  }
  cc.putImageData(img, 0, 0);
  minimapSrc = c;
}

async function startWorld(seed, data) {
  state = 'loading';
  showOverlay('loading');
  els.loadlabel.textContent = 'Raising the island of Ironvale...';
  const worldSize = data ? data.size : SIZE;
  const newWorld = await generateWorldAsync(seed, worldSize, (p) => {
    els.loadbar.style.width = Math.floor(p * 100) + '%';
  });
  world = newWorld;
  floats = [];
  if (data) g = restoreGame(world, data);
  else g = newGame(world);
  buildMinimap();
  invalidateGround();
  groundCache.clear();
  updateCamera();
  if (R3D) buildWorld3D();
  hideOverlay('loading');
  state = 'playing';
  frozen = false;
  saveTimer = 0;
  log('Welcome to Ironvale.', 'sys');
  if (!data) {
    log('Talk to Elder Bram in the town square for your first quest.', 'quest');
    log('Left-click things to interact. Right-click or WASD to walk.', 'sys');
  } else {
    log('You return to Ironvale.', 'sys');
  }
  markInvDirty();
  saveGame();
}

function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadSaveData() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function saveGame() {
  if (!g) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(g))); } catch (e) { /* ignore */ }
}

// ---------- UI: log ----------

function log(msg, cls) {
  const div = document.createElement('div');
  div.className = 'line ' + (cls || '');
  div.textContent = msg;
  els.log.appendChild(div);
  while (els.log.children.length > 60) els.log.removeChild(els.log.firstChild);
  els.log.scrollTop = els.log.scrollHeight;
}

// ---------- UI: skills / hud ----------

const skillRows = [];
const SKILL_ICONS = {
  attack: 'icon_attack', strength: 'sword_iron', defence: 'helm_iron',
  woodcut: 'axe', mining: 'pickaxe', smithing: 'bar_iron', cooking: 'meat_cooked'
};

function buildSkillsUI() {
  els.skills.innerHTML = '';
  skillRows.length = 0;
  for (const sk of SKILLS) {
    const row = document.createElement('div');
    row.className = 'skillrow';
    const icon = document.createElement('canvas');
    icon.width = 24; icon.height = 24;
    const ic = icon.getContext('2d');
    ic.imageSmoothingEnabled = false;
    const spr = S[SKILL_ICONS[sk.id]];
    if (spr) ic.drawImage(spr.cv, 0, 0, spr.w, spr.h, 1, 1, 22, 22);
    const name = document.createElement('span');
    name.className = 'skillname';
    name.textContent = sk.name;
    const lvl = document.createElement('span');
    lvl.className = 'skilllvl';
    lvl.textContent = '1';
    const bar = document.createElement('div');
    bar.className = 'xpbar';
    const fill = document.createElement('div');
    fill.className = 'xpfill';
    bar.appendChild(fill);
    row.appendChild(icon);
    row.appendChild(name);
    row.appendChild(bar);
    row.appendChild(lvl);
    els.skills.appendChild(row);
    skillRows.push({ id: sk.id, lvlEl: lvl, fillEl: fill });
  }
}

let invDirty = true;
function markInvDirty() { invDirty = true; }

function iconCanvas(id, size = 24) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  const spr = S[id] || S.coin;
  if (spr) c.drawImage(spr.cv, 0, 0, spr.w, spr.h, (size - 22) / 2, (size - 22) / 2, 22, 22);
  return cv;
}

function itemStatsText(id) {
  const def = ITEMS[id];
  const parts = [];
  if (def.atk) parts.push('Attack +' + def.atk);
  if (def.str) parts.push('Strength +' + def.str);
  if (def.def) parts.push('Defence +' + def.def);
  if (def.heals) parts.push('Restores ' + def.heals + ' HP');
  if (def.desc) parts.push(def.desc);
  if (def.sell) parts.push('Worth ' + def.sell + ' coins');
  return parts.join('. ');
}

function renderInventory() {
  els.invgrid.innerHTML = '';
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'slot';
    cell.dataset.idx = i;
    const item = g.inv[i];
    if (item) {
      cell.appendChild(iconCanvas(item.id, 28));
      if (item.n > 1) {
        const cnt = document.createElement('span');
        cnt.className = 'count';
        cnt.textContent = item.n;
        cell.appendChild(cnt);
      }
    }
    els.invgrid.appendChild(cell);
  }
  // equipment
  els.equiprow.innerHTML = '';
  const order = ['helm', 'chest', 'legs', 'boots', 'weapon'];
  for (const slot of order) {
    const cell = document.createElement('div');
    cell.className = 'slot eqslot';
    cell.title = slot;
    const id = g.equip[slot];
    if (id) {
      cell.appendChild(iconCanvas(id, 24));
      cell.addEventListener('click', () => {
        if (unequipSlot(g, slot)) { log(`You unequip your ${ITEMS[id].name}.`, 'sys'); markInvDirty(); sfx.ui(); }
      });
    }
    els.equiprow.appendChild(cell);
  }
}

function updateHUD() {
  if (!g) return;
  const p = g.player;
  for (const r of skillRows) {
    const xp = p.stats[r.id];
    const lvl = levelFromXp(xp);
    r.lvlEl.textContent = lvl;
    if (lvl >= 99) r.fillEl.style.width = '100%';
    else {
      const cur = xp - XP_TABLE[lvl];
      const need = XP_TABLE[lvl + 1] - XP_TABLE[lvl];
      r.fillEl.style.width = Math.floor((cur / need) * 100) + '%';
    }
  }
  const mh = maxHp(g);
  els.hpfill.style.width = Math.floor((p.hp / mh) * 100) + '%';
  els.hpnum.textContent = Math.ceil(p.hp) + '/' + mh;
  els.cl.textContent = combatLevel(g);
  els.playertitle.textContent = g.title || '';
  els.coins.textContent = g.coins;
  els.coords.textContent = Math.floor(p.x) + ', ' + Math.floor(p.y);
}

// ---------- action bar ----------

const ACTIONS = [
  { id: 'move', icon: 'icon_move', label: 'Move (right-click / WASD)' },
  { id: 'attack', icon: 'icon_attack', label: 'Attack — then click a monster' },
  { id: 'chop', icon: 'icon_chop', label: 'Chop — then click a tree' },
  { id: 'mine', icon: 'icon_mine', label: 'Mine — then click a rock' },
  { id: 'talk', icon: 'icon_talk', label: 'Talk — then click an NPC or object' }
];

function buildActionbar() {
  els.actionbar.innerHTML = '';
  for (const a of ACTIONS) {
    const b = document.createElement('button');
    b.className = 'abtn';
    b.dataset.action = a.id;
    b.title = a.label;
    b.appendChild(iconCanvas(a.icon, 26));
    b.addEventListener('click', () => { setAction(a.id); sfx.ui(); });
    els.actionbar.appendChild(b);
  }
}

function setAction(id) {
  const p = g.player;
  p.action = id;
  p.path = null;
  p.pending = null;
  if (id !== 'attack') p.target = null;
  if (id !== 'chop' && id !== 'mine') p.actionTile = null;
  for (const b of els.actionbar.querySelectorAll('.abtn')) {
    b.classList.toggle('active', b.dataset.action === id);
  }
}

// ---------- picking / clicking ----------

function pick(mx, my) {
  const { tx, ty } = screenToTile(mx, my);
  const itx = Math.floor(tx), ity = Math.floor(ty);
  let best = null, bestD = 0.85;
  for (const m of g.monsters) {
    if (!m.alive) continue;
    const d = Math.hypot(m.x - tx, m.y - ty);
    if (d < bestD) { bestD = d; best = { kind: 'monster', m, x: Math.floor(m.x), y: Math.floor(m.y) }; }
  }
  if (best) return { tx: itx, ty: ity, target: best };
  for (const n of world.npcs) {
    const d = Math.hypot(n.x + 0.5 - tx, n.y + 0.5 - ty);
    if (d < 0.8) return { tx: itx, ty: ity, target: { kind: 'npc', n, x: n.x, y: n.y } };
  }
  for (const o of world.objects) {
    if (itx === o.x && ity === o.y) return { tx: itx, ty: ity, target: { kind: 'obj', o, x: o.x, y: o.y } };
  }
  for (const b of world.buildings) {
    if (itx >= b.x && itx < b.x + b.w && ity >= b.y && ity < b.y + b.h) {
      return { tx: itx, ty: ity, target: { kind: 'building', b, x: b.x, y: b.y } };
    }
  }
  const t = tileAt(world, itx, ity);
  if (T_OBJ_SPRITE[t]) return { tx: itx, ty: ity, target: { kind: 'resource', x: itx, y: ity, t } };
  return { tx: itx, ty: ity, target: { kind: 'tile', x: itx, y: ity } };
}

function onLeftClick(mx, my) {
  if (state !== 'playing' || frozen) return;
  hideCtxMenu();
  const h = pick(mx, my);
  hover = h;
  if (h.target && h.target.kind !== 'tile') openCtxMenu(h.target, mx, my);
  else moveTo(h.tx, h.ty);
}

function moveTo(tx, ty) {
  const p = g.player;
  if (!isWalkable(world, Math.floor(tx), Math.floor(ty))) {
    const n = nearestWalkable(Math.floor(tx), Math.floor(ty), 5);
    if (!n) { log('You cannot get there.', 'sys'); return; }
    tx = n.x; ty = n.y;
  }
  p.action = 'move';
  setAction('move');
  p.target = null;
  p.pending = null;
  p.path = pathfind(world, Math.floor(p.x), Math.floor(p.y), Math.floor(tx), Math.floor(ty));
  p.pathIdx = 0;
}

function nearestWalkable(x, y, r) {
  for (let rad = 0; rad <= r; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        if (isWalkable(world, x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
  }
  return null;
}

// ---------- context menu (world actions) ----------

function hideCtxMenu() { els.ctxmenu.classList.add('hidden'); }

function openCtxMenu(target, mx, my) {
  const menu = els.ctxmenu;
  menu.innerHTML = '';
  const entries = [];
  const add = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => { hideCtxMenu(); fn(); sfx.ui(); });
    menu.appendChild(b);
    entries.push(b);
  };

  if (target.kind === 'monster') {
    const md = MONSTERS[target.m.type];
    add('Attack ' + md.name, () => {
      g.player.target = target.m;
      setAction('attack');
      g.player.attackTimer = 0.4;
    });
    add('Inspect', () => {
      const m = target.m;
      log(`${md.name} (level ${md.level}) — HP ${Math.ceil(m.hp)}/${md.hp}`, 'sys');
    });
  } else if (target.kind === 'resource') {
    if (target.t === T.OAK || target.t === T.PINE) {
      add('Chop ' + (target.t === T.OAK ? 'oak' : 'pine') + ' tree', () => {
        setAction('chop');
        g.player.actionTile = { x: target.x, y: target.y };
        g.player.actionTimer = 0.5;
      });
    } else {
      const names = { [T.COPPER]: 'copper', [T.TIN]: 'tin', [T.IRON]: 'iron', [T.GOLD]: 'gold' };
      add('Mine ' + names[target.t] + ' ore', () => {
        setAction('mine');
        g.player.actionTile = { x: target.x, y: target.y };
        g.player.actionTimer = 0.5;
      });
    }
  } else if (target.kind === 'npc') {
    add('Talk to ' + target.n.name, () => {
      g.player.pending = { kind: 'talk', ref: target.n, tx: target.n.x, ty: target.n.y };
      g.player.path = null;
    });
  } else if (target.kind === 'obj') {
    if (target.o.type === 'furnace') add('Smith at the furnace', () => { g.player.pending = { kind: 'smith', tx: target.x, ty: target.y }; g.player.path = null; });
    else if (target.o.type === 'pot') add('Cook at the pot', () => { g.player.pending = { kind: 'cook', tx: target.x, ty: target.y }; g.player.path = null; });
    else add('Look at the well', () => log('The water is cold and clear. You drink, and feel refreshed.', 'sys'));
  } else if (target.kind === 'building') {
    if (target.b.type === 'shop') add('Trade with Greta', () => { g.player.pending = { kind: 'shop', tx: target.x + 2, ty: target.y + target.b.h }; g.player.path = null; });
    else if (target.b.type === 'smithy') add('Smith at the forge', () => { g.player.pending = { kind: 'smith', tx: target.x + 2, ty: target.y + target.b.h }; g.player.path = null; });
    else if (target.b.type === 'hall') add('Enter the Elder Hall', () => { const bram = world.npcs.find((n) => n.id === 'bram'); g.player.pending = { kind: 'talk', ref: bram, tx: bram.x, ty: bram.y }; g.player.path = null; });
    else add('Look', () => log(BLD_NAMES[target.b.type] || 'A building.', 'sys'));
  }

  menu.classList.remove('hidden');
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.min(mx + 4, W - mw - 8) + 'px';
  menu.style.top = Math.min(my + 4, H - mh - 8) + 'px';
}

// ---------- player movement ----------

function pointBlocked(x, y) {
  return !isWalkable(world, Math.floor(x), Math.floor(y));
}
function boxBlocked(x, y, r = 0.26) {
  return pointBlocked(x - r, y - r) || pointBlocked(x + r, y - r) ||
    pointBlocked(x - r, y + r) || pointBlocked(x + r, y + r);
}

function followPath(dt, speed) {
  const p = g.player;
  if (!p.path || p.pathIdx >= p.path.length) { p.path = null; return; }
  const node = p.path[p.pathIdx];
  const nx = node.x + 0.5, ny = node.y + 0.5;
  const dx = nx - p.x, dy = ny - p.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (d <= step) {
    p.x = nx; p.y = ny;
    p.pathIdx++;
    if (p.pathIdx >= p.path.length) p.path = null;
  } else {
    const ux = dx / d, uy = dy / d;
    const movedX = !boxBlocked(p.x + ux * step, p.y);
    const movedY = !boxBlocked(p.x, p.y + uy * step);
    if (movedX) p.x += ux * step;
    if (movedY) p.y += uy * step;
    if (!movedX && !movedY) { p.path = null; return; } // blocked, give up
  }
  p.moving = true;
  p.animT += dt;
}

function pathToAdjacent(at) {
  const p = g.player;
  const cands = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = at.x + dx, y = at.y + dy;
      if (isWalkable(world, x, y)) cands.push({ x, y, d: (x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2 });
    }
  }
  if (!cands.length) {
    // fully walled in — abort the action
    p.actionTile = null;
    p.target = null;
    p.pending = null;
    setAction('move');
    return;
  }
  cands.sort((a, b) => a.d - b.d);
  p.path = pathfind(world, Math.floor(p.x), Math.floor(p.y), cands[0].x, cands[0].y);
  p.pathIdx = 0;
}

function updatePlayer(dt) {
  const p = g.player;
  p.moving = false;
  // keyboard movement
  let dx = 0, dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) { dx -= 1; dy -= 1; }
  if (keys.has('KeyS') || keys.has('ArrowDown')) { dx += 1; dy += 1; }
  if (keys.has('KeyA') || keys.has('ArrowLeft')) { dx -= 1; dy += 1; }
  if (keys.has('KeyD') || keys.has('ArrowRight')) { dx += 1; dy -= 1; }
  if (dx || dy) {
    p.path = null;
    p.pending = null;
    const inv = 1 / Math.hypot(dx, dy);
    const spd = 4.6 * dt;
    const mx = p.x + dx * inv * spd, my = p.y + dy * inv * spd;
    if (!boxBlocked(mx, p.y)) p.x = mx;
    if (!boxBlocked(p.x, my)) p.y = my;
    p.moving = true;
    p.animT += dt;
    return;
  }
  if (p.action === 'attack') { updateAttack(dt); return; }
  if (p.action === 'chop' || p.action === 'mine') { updateResource(dt); return; }
  if (p.pending) { updatePending(dt); return; }
  if (p.path) followPath(dt, 4.6);
}

function updateAttack(dt) {
  const p = g.player;
  const m = p.target;
  if (!m || !m.alive) { p.target = null; setAction('move'); return; }
  const dist = Math.hypot(m.x - p.x, m.y - p.y);
  if (dist > 1.05) {
    const key = Math.floor(m.x) + ',' + Math.floor(m.y);
    if (key !== p.monsterTileKey || !p.path) {
      p.monsterTileKey = key;
      pathToAdjacent({ x: Math.floor(m.x), y: Math.floor(m.y) });
    }
    followPath(dt, 4.6);
  } else {
    p.path = null;
    p.attackTimer -= dt;
    if (p.attackTimer <= 0) {
      p.attackTimer = 1.9;
      playerAttack(m);
    }
  }
}

function updateResource(dt) {
  const p = g.player;
  const at = p.actionTile;
  if (!at) { setAction('move'); return; }
  const t = tileAt(world, at.x, at.y);
  const ok = p.action === 'chop'
    ? (t === T.OAK || t === T.PINE)
    : (t === T.COPPER || t === T.TIN || t === T.IRON || t === T.GOLD);
  if (!ok) { setAction('move'); p.actionTile = null; return; }
  const cx = Math.floor(p.x), cy = Math.floor(p.y);
  const adjacent = Math.max(Math.abs(cx - at.x), Math.abs(cy - at.y)) <= 1;
  if (!adjacent) {
    if (!p.path) pathToAdjacent(at);
    followPath(dt, 4.6);
    return;
  }
  p.path = null;
  p.actionTimer -= dt;
  if (p.actionTimer > 0) return;
  p.actionTimer = 1.6;
  p.swingT = 0.18;
  if (p.action === 'chop') {
    sfx.chop();
    chopTick(g, at.x, at.y);
  } else {
    sfx.mine();
    const r = mineTick(g, at.x, at.y);
    if (r.blocked) { log(r.msg, 'warn'); setAction('move'); }
  }
  invalidateGround();
  markInvDirty();
}

function updatePending(dt) {
  const p = g.player;
  const pd = p.pending;
  const dist = Math.hypot(pd.tx + 0.5 - p.x, pd.ty + 0.5 - p.y);
  if (dist > 1.15) {
    if (!p.path) pathToAdjacent({ x: pd.tx, y: pd.ty });
    followPath(dt, 4.6);
    return;
  }
  p.path = null;
  p.pending = null;
  runPending(pd);
}

function runPending(pd) {
  if (pd.kind === 'talk') openNpcDialogue(pd.ref);
  else if (pd.kind === 'shop') openShop();
  else if (pd.kind === 'smith') openSmithy();
  else if (pd.kind === 'cook') openCookPot();
}

// ---------- combat ----------

function addFloat(x, y, text, color) {
  floats.push({ x, y, text, color, age: 0, life: 1.2 });
}

function playerAttack(m) {
  const md = MONSTERS[m.type];
  const p = g.player;
  sfx.swing();
  p.swingT = 0.18;
  const A = level(g, 'attack') + bonus(g, 'atk');
  const S_ = level(g, 'strength') + bonus(g, 'str');
  const res = rollAttack(A, S_, md.def);
  if (res.hit) {
    m.hp -= res.dmg;
    m.flash = 0.15;
    addFloat(m.x, m.y, String(res.dmg), '#ff5555');
    sfx.hit();
    if (m.hp <= 0) killMonster(m, true);
    else if (md.passive) { m.state = 'attack'; m.attackTimer = 0.8; }
  } else {
    addFloat(m.x, m.y, 'miss', '#cccccc');
  }
}

function killMonster(m, byPlayer) {
  m.alive = false;
  m.hp = 0;
  m.state = 'dead';
  m.respawnAt = gameNow + 45;
  if (g.player.target === m) g.player.target = null;
  if (!byPlayer) return;
  const md = MONSTERS[m.type];
  for (const [item, chance, min, max] of md.drops) {
    if (Math.random() >= chance) continue;
    const n = min + Math.floor(Math.random() * (max - min + 1));
    if (item === 'coin') {
      g.coins += n;
      addFloat(m.x, m.y, '+' + n + ' coins', '#f2d06b');
      sfx.coin();
    } else {
      if (addItem(g, item, n)) {
        addFloat(m.x, m.y, '+' + n + ' ' + ITEMS[item].name, '#9ad0ff');
      } else {
        log('Your inventory is full!', 'warn');
      }
    }
  }
  for (const sk of ['attack', 'strength', 'defence']) addXp(g, sk, md.xp);
  log(`You defeated a ${md.name}. +${md.xp} XP each combat skill.`, 'loot');
  monsterKilledForQuests(g, m.type);
  markInvDirty();
}

function monsterAttack(m) {
  const md = MONSTERS[m.type];
  const p = g.player;
  const Dp = level(g, 'defence') + bonus(g, 'def');
  const res = rollAttack(md.atk, md.str, Dp);
  if (res.hit) {
    p.hp -= res.dmg;
    addFloat(p.x, p.y, String(res.dmg), '#ff9944');
    sfx.hit();
    if (p.hp <= 0) {
      p.hp = 0;
      onPlayerDeath();
    }
  } else {
    addFloat(p.x, p.y, 'miss', '#cccccc');
  }
}

function onPlayerDeath() {
  const lost = Math.floor(g.coins * 0.15);
  g.coins -= lost;
  sfx.death();
  state = 'dead';
  frozen = true;
  g.player.target = null;
  g.player.action = 'move';
  setAction('move');
  els.deathmsg.textContent = lost > 0
    ? `The village healer tends to you. You lost ${lost} coins on the way back.`
    : 'The village healer tends to you. You made it back in one piece.';
  showOverlay('death');
  markInvDirty();
  saveGame();
}

// ---------- monsters ----------

function stepTo(m, tx, ty, dt, speed) {
  const dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return true;
  const step = speed * dt;
  const ux = dx / d, uy = dy / d;
  const r = 0.18;
  const mx = m.x + ux * Math.min(step, d);
  const my = m.y + uy * Math.min(step, d);
  const before = m.x + m.y;
  const blockedX = pointBlocked(mx - r, m.y - r) || pointBlocked(mx + r, m.y - r) || pointBlocked(mx - r, m.y + r) || pointBlocked(mx + r, m.y + r);
  const blockedY = pointBlocked(m.x - r, my - r) || pointBlocked(m.x + r, my - r) || pointBlocked(m.x - r, my + r) || pointBlocked(m.x + r, my + r);
  if (!blockedX) m.x = mx;
  if (!blockedY) m.y = my;
  if (blockedX && blockedY) { m.path = null; return false; }
  if (m.x + m.y !== before) { m.moving = true; m.animT += dt; }
  return Math.hypot(m.x - tx, m.y - ty) < 0.05;
}

function followMonsterPath(m, dt, speed) {
  if (!m.path || m.pathIdx >= m.path.length) { m.path = null; return; }
  const node = m.path[m.pathIdx];
  const nx = node.x + 0.5, ny = node.y + 0.5;
  const d = Math.hypot(nx - m.x, ny - m.y);
  const step = speed * dt;
  if (d <= step) {
    m.x = nx; m.y = ny;
    m.pathIdx++;
    if (m.pathIdx >= m.path.length) m.path = null;
  } else {
    const ux = (nx - m.x) / d, uy = (ny - m.y) / d;
    const r = 0.18;
    const bx = m.x + ux * step, by = m.y + uy * step;
    const okX = !(pointBlocked(bx - r, m.y - r) || pointBlocked(bx + r, m.y - r) || pointBlocked(bx - r, m.y + r) || pointBlocked(bx + r, m.y + r));
    const okY = !(pointBlocked(m.x - r, by - r) || pointBlocked(m.x + r, by - r) || pointBlocked(m.x - r, by + r) || pointBlocked(m.x + r, by + r));
    if (okX) m.x = bx;
    if (okY) m.y = by;
    if (!okX && !okY) { m.path = null; return; }
  }
  m.moving = true;
  m.animT += dt;
}

function updateMonsters(dt) {
  const p = g.player;
  for (const m of g.monsters) {
    if (!m.alive) {
      if (gameNow >= m.respawnAt) {
        m.alive = true;
        m.hp = MONSTERS[m.type].hp;
        m.state = 'idle';
        m.x = m.homeX + 0.5;
        m.y = m.homeY + 0.5;
        m.path = null;
        m.nextPos = null;
      }
      continue;
    }
    const md = MONSTERS[m.type];
    const dist = Math.hypot(p.x - m.x, p.y - m.y);
    if (dist > 90) { m.moving = false; continue; }
    m.moving = false;
    m.flash = Math.max(0, m.flash - dt);
    if ((m.state === 'idle' || m.state === 'wander') && m.hp < md.hp) {
      m.hp = Math.min(md.hp, m.hp + dt * (md.hp / 12));
    }
    if (m.state === 'idle' || m.state === 'wander') {
      if (gameNow >= m.nextThink) {
        m.nextThink = gameNow + 1.5 + Math.random() * 2.5;
        if (!md.passive && dist < md.aggro) { m.state = 'chase'; continue; }
        if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          const nx = m.x + Math.cos(a), ny = m.y + Math.sin(a);
          if (isWalkable(world, Math.floor(nx), Math.floor(ny)) &&
            Math.hypot(nx - m.homeX - 0.5, ny - m.homeY - 0.5) < 9) {
            m.nextPos = { x: nx, y: ny };
            m.state = 'wander';
          }
        }
      }
    } else if (m.state === 'wander') {
      if (!md.passive && dist < md.aggro) { m.state = 'chase'; }
      else if (stepTo(m, m.nextPos.x, m.nextPos.y, dt, md.speed)) { m.state = 'idle'; m.nextPos = null; }
    } else if (m.state === 'chase') {
      if (dist > 15) { m.state = 'return'; }
      else if (dist <= 1.0) { m.state = 'attack'; m.attackTimer = 1; m.path = null; }
      else {
        if (gameNow >= m.nextThink) {
          m.nextThink = gameNow + 1.2;
          m.path = pathfind(world, Math.floor(m.x), Math.floor(m.y), Math.floor(p.x), Math.floor(p.y));
          m.pathIdx = 0;
          if (!m.path) m.state = 'return';
        }
        if (m.path) followMonsterPath(m, dt, md.speed);
        else if (m.state === 'chase') stepTo(m, p.x, p.y, dt, md.speed);
      }
    } else if (m.state === 'attack') {
      if (dist > 1.4) { m.state = 'chase'; }
      else {
        m.attackTimer -= dt;
        if (m.attackTimer <= 0) {
          m.attackTimer = 2.1;
          monsterAttack(m);
          if (state !== 'playing') return;
        }
      }
    } else if (m.state === 'return') {
      const hd = Math.hypot(m.homeX + 0.5 - m.x, m.homeY + 0.5 - m.y);
      if (hd < 1.5) { m.state = 'idle'; m.path = null; }
      else {
        if (gameNow >= m.nextThink) {
          m.nextThink = gameNow + 1.5;
          m.path = pathfind(world, Math.floor(m.x), Math.floor(m.y), m.homeX, m.homeY);
          m.pathIdx = 0;
        }
        if (m.path) followMonsterPath(m, dt, md.speed * 0.9);
        else stepTo(m, m.homeX + 0.5, m.homeY + 0.5, dt, md.speed * 0.9);
        if (!md.passive && dist < md.aggro) m.state = 'chase';
      }
    }
  }
}

// ---------- depletion (regrowing resources) ----------

function updateDepletion(dt) {
  const entries = Object.entries(g.depletion);
  for (const [k, d] of entries) {
    d.t -= dt;
    if (d.t <= 0) {
      world.terrain[+k] = d.tile;
      delete g.depletion[k];
      invalidateGround();
    }
  }
}

// ---------- main update ----------

function update(dt) {
  updatePlayer(dt);
  updateMonsters(dt);
  updateDepletion(dt);
  const p = g.player;
  p.swingT = Math.max(0, (p.swingT || 0) - dt);
  for (let i = floats.length - 1; i >= 0; i--) {
    floats[i].age += dt;
    if (floats[i].age > floats[i].life) floats.splice(i, 1);
  }
  updateCamera();
  saveTimer += dt;
  if (saveTimer > 20) {
    saveTimer = 0;
    saveGame();
  }
}

// ===== 3D RENDERER BLOCK (spliced into main.js before the 2D rendering section) =====

// ---------- 3D renderer (three.js) ----------
// Modern low-poly 3D: vertex-colored heightfield terrain in lazy chunks,
// instanced trees/rocks, dynamic sun + soft shadows, fog, animated water,
// third-person camera. Falls back to the classic 2D renderer if WebGL fails.

const NPC_PALS3D = {
  bram:  { hair: '#d8d8d8', top: '#7a5a34', legs: '#5a4028' },
  greta: { hair: '#8a3a2a', top: '#7a3a8a', legs: '#5a3a6a' },
  torin: { hair: '#9a9a9a', top: '#5a5a64', legs: '#4a4a52' },
  vill1: { hair: '#4a3018', top: '#4a7a3a', legs: '#5a4a30' },
  vill2: { hair: '#3a2a18', top: '#7a4a2a', legs: '#5a3a22' }
};
const PLAYER_PAL3D = { hair: '#4a3018', skin: '#e0a878', top: '#3a6ab5', legs: '#7a5230' };
const MONSTER_BAR_Y = { rat: 0.8, slime: 1.0, wolf: 1.35, bear: 1.85, troll: 2.35 };
const MONSTER_SHADOW_R = { rat: 0.4, slime: 0.5, wolf: 0.6, bear: 0.8, troll: 0.8 };
const CHUNK_R = 6; // chunk culling radius (16-tile chunks)

function init3D() {
  try {
    if (window.location.search.includes('nogl')) { console.log('3D disabled via ?nogl — using classic 2D renderer'); return; }
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe0ec);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 700);

    const hemi = new THREE.HemisphereLight(0xbfd8ec, 0x44502e, 0.9);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 2; sc.far = 110;
    sun.shadow.bias = -0.0004;
    const sunTarget = new THREE.Object3D();
    scene.add(hemi, sun, sunTarget);
    sun.target = sunTarget;

    R3D = {
      three: THREE, renderer, scene, camera, hemi, sun, sunTarget,
      groundMat: new THREE.MeshLambertMaterial({ vertexColors: true }),
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      water: null, sky: null,
      chunks: new Map(), instances: [], structures: [],
      playerH: null, weapon: null,
      pBarBg: null, pBarFg: null,
      npcObjs: new Map(), monsterObjs: new Map(),
      hover: null, targetRing: null, floatPool: [],
      furnaceLight: null, time: 0, renderDead: false, staticsDirty: false
    };
    console.log('3D renderer active');
  } catch (e) {
    console.warn('WebGL unavailable — using the classic 2D renderer:', e.message);
    R3D = null;
  }
}

function height3(x, y) { return M3D.tileHeightAt(world, x, y); }

function makeFloatSprite3D() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 48;
  const c = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.6, 0.98, 1);
  sp.visible = false;
  sp._ctx = c; sp._txt = '';
  R3D.scene.add(sp);
  return sp;
}

function drawFloatText3D(sp, text, color) {
  const key = text + '|' + color;
  if (sp._txt === key) return;
  sp._txt = key;
  const c = sp._ctx;
  c.clearRect(0, 0, 128, 48);
  c.font = 'bold 26px monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(0,0,0,0.85)';
  c.strokeText(text, 64, 24);
  c.fillStyle = color;
  c.fillText(text, 64, 24);
  sp.material.map.needsUpdate = true;
}

function makeChunk3D(bx, by) {
  const s = R3D, k = bx + ',' + by;
  if (s.chunks.has(k)) return;
  const geo = M3D.buildChunkGeometry(world, bx, by);
  const m = new THREE.Mesh(geo, s.groundMat);
  m.position.set(bx * M3D.CHUNK + M3D.CHUNK / 2, 0, by * M3D.CHUNK + M3D.CHUNK / 2);
  m.receiveShadow = true;
  s.scene.add(m);
  s.chunks.set(k, m);
}

function ensureChunks3D() {
  const s = R3D, w = world.size;
  const pcx = Math.floor(g.player.x / M3D.CHUNK), pcy = Math.floor(g.player.y / M3D.CHUNK);
  let built = 0;
  for (let dy = -CHUNK_R; dy <= CHUNK_R && built < 3; dy++) {
    for (let dx = -CHUNK_R; dx <= CHUNK_R && built < 3; dx++) {
      const bx = pcx + dx, by = pcy + dy;
      if (bx < 0 || by < 0 || bx * M3D.CHUNK >= w || by * M3D.CHUNK >= w) continue;
      if (!s.chunks.has(bx + ',' + by)) { makeChunk3D(bx, by); built++; }
    }
  }
}

function buildInstances3D() {
  const s = R3D, T3 = s.three, w = world.size;
  for (const im of s.instances) { s.scene.remove(im); im.dispose(); }
  s.instances = [];

  const terr = world.terrain;
  const oaks = [], pines = [], ores = { [T.COPPER]: [], [T.TIN]: [], [T.IRON]: [], [T.GOLD]: [] };
  for (let ty = 0; ty < w; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const t = terr[ty * w + tx];
      if (t === T.OAK) oaks.push([tx + 0.5, ty + 0.5]);
      else if (t === T.PINE) pines.push([tx + 0.5, ty + 0.5]);
      else if (t === T.COPPER || t === T.TIN || t === T.IRON || t === T.GOLD) ores[t].push([tx + 0.5, ty + 0.5]);
    }
  }

  const tgeo = M3D.treeGeometries(), rgeo = M3D.rockGeometries();
  const dummy = new T3.Object3D();
  const mkInst = (geometry, colorHex, list, yOff, variation, jitter, off = [0, 0, 0]) => {
    if (!list.length) return;
    const im = new T3.InstancedMesh(geometry, new T3.MeshLambertMaterial({ color: colorHex }), list.length);
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    const c = new T3.Color();
    for (let i = 0; i < list.length; i++) {
      const [x, z] = list[i];
      dummy.position.set(x + off[0], yOff + off[1], z + off[2]);
      dummy.rotation.set(0, hash2(x, z, world.seed + 5) * Math.PI * 2, 0);
      dummy.scale.setScalar(1 - variation / 2 + hash2(x, z, world.seed + 9) * variation);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      if (jitter) {
        c.setHex(colorHex).offsetHSL(0, 0, (hash2(x, z, world.seed + 3) - 0.5) * jitter);
        im.setColorAt(i, c);
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    s.scene.add(im);
    s.instances.push(im);
  };

  mkInst(tgeo.oakTrunk, 0x6b4423, oaks, 0.575, 0.25, 0.06);
  mkInst(tgeo.oakCanopy, 0x4a8a34, oaks, 1.78, 0.35, 0.12);
  mkInst(tgeo.pineTrunk, 0x5a3a22, pines, 0.35, 0.25, 0.05);
  mkInst(tgeo.pineCanopy, 0x2a5c30, pines, 1.55, 0.3, 0.1);
  for (const t of [T.COPPER, T.TIN, T.IRON, T.GOLD]) {
    const list = ores[t];
    mkInst(rgeo.base, 0x8a8a8a, list, 0.35, 0.4, 0.08);
    mkInst(rgeo.patch, M3D.ORE_COLORS[t] || 0x888888, list, 0.45, 0.3, 0.08, [0.16, 0.1, 0.22]);
  }
}

function rebuildStatics3D() {
  const s = R3D, w = world.size;
  for (const m of s.chunks.values()) { s.scene.remove(m); m.geometry.dispose(); }
  s.chunks.clear();
  const pcx = Math.floor(g.player.x / M3D.CHUNK), pcy = Math.floor(g.player.y / M3D.CHUNK);
  for (let dy = -CHUNK_R; dy <= CHUNK_R; dy++) {
    for (let dx = -CHUNK_R; dx <= CHUNK_R; dx++) {
      const bx = pcx + dx, by = pcy + dy;
      if (bx < 0 || by < 0 || bx * M3D.CHUNK >= w || by * M3D.CHUNK >= w) continue;
      makeChunk3D(bx, by);
    }
  }
  buildInstances3D();
  s.staticsDirty = false;
}

function buildWorld3D() {
  const s = R3D, T3 = s.three, w = world.size;
  s.scene.clear();
  s.scene.add(s.hemi, s.sun, s.sunTarget);
  s.chunks.clear(); s.instances = []; s.structures = [];
  s.npcObjs.clear(); s.monsterObjs.clear();

  // sky follows the camera
  s.sky = M3D.buildSky();
  s.scene.add(s.camera);
  s.camera.add(s.sky);

  // water
  s.water = M3D.buildWater(w);
  s.water.position.set(w / 2, -0.16, w / 2);
  s.scene.add(s.water);

  // fog hides the chunk boundary
  s.scene.fog = new T3.Fog(0xcfe0ec, 55, 100);

  // terrain — prebuild the visible ring
  const pcx = Math.floor(g.player.x / M3D.CHUNK), pcy = Math.floor(g.player.y / M3D.CHUNK);
  for (let dy = -CHUNK_R; dy <= CHUNK_R; dy++) {
    for (let dx = -CHUNK_R; dx <= CHUNK_R; dx++) {
      const bx = pcx + dx, by = pcy + dy;
      if (bx < 0 || by < 0 || bx * M3D.CHUNK >= w || by * M3D.CHUNK >= w) continue;
      makeChunk3D(bx, by);
    }
  }

  // instanced trees + ore rocks
  buildInstances3D();

  // buildings & static objects
  s.furnaceLight = null;
  for (const b of world.buildings) {
    const gr = M3D.buildBuilding(b.type, b.w, b.h);
    gr.position.set(b.x + b.w / 2, height3(b.x + b.w / 2, b.y + b.h / 2), b.y + b.h / 2);
    s.scene.add(gr); s.structures.push(gr);
  }
  for (const o of world.objects) {
    const y = height3(o.x + 0.5, o.y + 0.5);
    let gr;
    if (o.type === 'well') gr = M3D.buildWell();
    else if (o.type === 'furnace') gr = M3D.buildFurnace();
    else if (o.type === 'pot') gr = M3D.buildPot();
    else gr = M3D.buildStump();
    gr.position.set(o.x + 0.5, y, o.y + 0.5);
    s.scene.add(gr); s.structures.push(gr);
    if (o.type === 'furnace') {
      const pl = new T3.PointLight(0xff7722, 2.2, 9);
      pl.position.set(0, 0.7, 0.5);
      gr.add(pl);
      s.furnaceLight = pl;
    }
  }

  // NPCs
  for (const n of world.npcs) {
    const h = M3D.buildHumanoid(NPC_PALS3D[n.pal] || NPC_PALS3D.vill2);
    h.group.position.set(n.x + 0.5, height3(n.x + 0.5, n.y + 0.5), n.y + 0.5);
    h.group.add(M3D.makeContactShadow(0.55, 0.35));
    s.scene.add(h.group);
    s.npcObjs.set(n.id, h);
  }

  // player
  const ph = M3D.buildHumanoid(PLAYER_PAL3D);
  ph.group.add(M3D.makeContactShadow(0.6, 0.4));
  const weapon = new T3.Group();
  const blade = new T3.Mesh(new T3.BoxGeometry(0.09, 0.09, 0.95), new T3.MeshLambertMaterial({ color: 0xc9cdd3 }));
  blade.position.z = 0.45; blade.castShadow = true;
  const guard = new T3.Mesh(new T3.BoxGeometry(0.22, 0.07, 0.1), new T3.MeshLambertMaterial({ color: 0x6b4423 }));
  weapon.add(blade, guard);
  weapon.position.set(0.45, 0.95, 0.05);
  weapon.rotation.z = 0.45;
  ph.group.add(weapon);
  s.scene.add(ph.group);
  s.playerH = ph; s.weapon = weapon;

  // player hp bar
  const barGeo = new T3.PlaneGeometry(1.1, 0.14);
  s.pBarBg = new T3.Mesh(barGeo, new T3.MeshBasicMaterial({ color: 0x222222, transparent: true }));
  s.pBarFg = new T3.Mesh(barGeo, new T3.MeshBasicMaterial({ color: 0x2ecc71, transparent: true }));
  s.scene.add(s.pBarBg, s.pBarFg);

  // monsters
  for (const m of g.monsters) {
    const b = M3D.buildMonster(m.type);
    b.group.add(M3D.makeContactShadow(MONSTER_SHADOW_R[m.type] || 0.6, 0.35));
    s.scene.add(b.group);
    const barBg = new T3.Mesh(barGeo, new T3.MeshBasicMaterial({ color: 0x222222, transparent: true }));
    const barFg = new T3.Mesh(barGeo, new T3.MeshBasicMaterial({ color: 0xc0392b, transparent: true }));
    barBg.visible = false; barFg.visible = false;
    s.scene.add(barBg, barFg);
    s.monsterObjs.set(m, { ...b, barBg, barFg });
  }

  // hover diamond + attack-target ring
  s.hover = new T3.Mesh(M3D.buildDiamond(0.95), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false }));
  s.hover.position.y = 0.06;
  s.hover.visible = false;
  s.scene.add(s.hover);
  const ringGeo = new T3.RingGeometry(0.55, 0.72, 28);
  ringGeo.rotateX(-Math.PI / 2);
  s.targetRing = new T3.Mesh(ringGeo, new T3.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.85, depthWrite: false }));
  s.targetRing.position.y = 0.05;
  s.targetRing.visible = false;
  s.scene.add(s.targetRing);

  // damage-number sprite pool (survives world rebuilds)
  for (const f of s.floatPool) { f.visible = false; s.scene.add(f); }
  while (s.floatPool.length < 12) s.floatPool.push(makeFloatSprite3D());

  s.staticsDirty = false;
  updateCamera();
}

function updatePlayer3D() {
  const s = R3D, p = g.player, h = s.playerH;
  const bob = M3D.animateHumanoid(h, p.animT, p.moving, 9);
  h.group.position.set(p.x, height3(p.x, p.y) + bob, p.y);
  if (p.moving) {
    if (p._rx === undefined) { p._rx = p.x; p._rz = p.y; }
    const dx = p.x - p._rx, dz = p.y - p._rz;
    if (dx * dx + dz * dz > 1e-8) h.group.rotation.y = Math.atan2(dx, dz);
    p._rx = p.x; p._rz = p.y;
  } else { p._rx = undefined; p._rz = undefined; }
  s.weapon.visible = !!g.equip.weapon;
  if (p.swingT > 0) {
    const t = 1 - p.swingT / 0.18;
    s.weapon.rotation.y = Math.sin(t * Math.PI) * 2.4;
    h.armR.rotation.x = -1.9 * Math.sin(t * Math.PI);
  }
  const mh = maxHp(g);
  const show = p.hp < mh;
  s.pBarBg.visible = show; s.pBarFg.visible = show;
  if (show) {
    const r = clamp(p.hp / mh, 0, 1);
    s.pBarFg.scale.x = r;
    s.pBarBg.position.set(p.x, height3(p.x, p.y) + 2.15, p.y);
    s.pBarFg.position.copy(s.pBarBg.position);
    s.pBarBg.quaternion.copy(s.camera.quaternion);
    s.pBarFg.quaternion.copy(s.camera.quaternion);
    s.pBarFg.position.x -= 0.55 * (1 - r);
  }
}

function updateNpc3D(n) {
  const s = R3D, h = s.npcObjs.get(n.id);
  if (!h) return;
  h.group.position.set(n.x + 0.5, height3(n.x + 0.5, n.y + 0.5), n.y + 0.5);
  const p = g.player;
  const d = Math.hypot(p.x - (n.x + 0.5), p.y - (n.y + 0.5));
  if (d < 7) h.group.rotation.y = Math.atan2(p.x - (n.x + 0.5), p.y - (n.y + 0.5));
}

function updateMonster3D(m) {
  const s = R3D, o = s.monsterObjs.get(m);
  if (!o) return;
  const p = g.player;
  const near = m.alive && Math.abs(m.x - p.x) < 95 && Math.abs(m.y - p.y) < 95;
  o.group.visible = near;
  if (!m.alive) { o.barBg.visible = false; o.barFg.visible = false; return; }
  o.group.position.set(m.x, height3(m.x, m.y), m.y);
  if (m.moving) {
    if (m._rx === undefined) { m._rx = m.x; m._rz = m.y; }
    const dx = m.x - m._rx, dz = m.y - m._rz;
    if (dx * dx + dz * dz > 1e-8) o.group.rotation.y = Math.atan2(dx, dz);
    m._rx = m.x; m._rz = m.y;
  } else { m._rx = undefined; m._rz = undefined; }

  const t = m.animT;
  const ex = o.extra;
  if (ex.humanoid) {
    const bob = M3D.animateHumanoid(ex.humanoid, t, m.moving, 6);
    o.group.position.y += bob * 1.3;
  } else if (ex.legs) {
    const sw = m.moving ? Math.sin(t * 9) * 0.5 : 0;
    for (let i = 0; i < ex.legs.length; i++) ex.legs[i].rotation.x = (i % 2 ? 1 : -1) * sw;
  } else if (ex.blob) {
    const k = m.moving ? Math.sin(t * 7) * 0.14 : Math.sin(s.time * 2 + m.x * 3) * 0.05;
    ex.blob.scale.set(1 + k, 0.8 - k, 1 + k);
    ex.blob.position.y = 0.34 * (0.8 - k) / 0.8;
  } else if (ex.tail) {
    ex.tail.rotation.y = Math.sin(t * 12) * 0.5;
    o.group.position.y += m.moving ? Math.abs(Math.sin(t * 10)) * 0.03 : 0;
  }

  const flash = m.flash > 0;
  for (const mt of o.mats) if (mt.emissive) mt.emissive.setHex(flash ? 0x881111 : 0x000000);

  const md = MONSTERS[m.type];
  const show = m.hp < md.hp;
  o.barBg.visible = show; o.barFg.visible = show;
  if (show) {
    const r = clamp(m.hp / md.hp, 0, 1);
    o.barFg.scale.x = r;
    o.barBg.position.set(m.x, height3(m.x, m.y) + (MONSTER_BAR_Y[m.type] || 1.4), m.y);
    o.barFg.position.copy(o.barBg.position);
    o.barFg.position.x -= 0.55 * (1 - r);
    o.barBg.quaternion.copy(s.camera.quaternion);
    o.barFg.quaternion.copy(s.camera.quaternion);
  }
}

function updateMarkers3D() {
  const s = R3D;
  if (state !== 'playing' || frozen) {
    s.hover.visible = false;
  } else if (hover.target) {
    const t = hover.target;
    const col =
      t.kind === 'monster' ? 0xff6666 :
        t.kind === 'resource' ? (g.player.action === 'chop' ? 0xaaff66 : 0xffcc55) :
          t.kind === 'npc' || t.kind === 'obj' || t.kind === 'building' ? 0xffe08a : 0xffffff;
    s.hover.visible = true;
    s.hover.material.color.setHex(col);
    s.hover.position.set(t.x + 0.5, height3(t.x + 0.5, t.y + 0.5) + 0.06, t.y + 0.5);
  } else {
    s.hover.visible = false;
  }
  const tgt = g.player.target;
  if (tgt && tgt.alive) {
    s.targetRing.visible = true;
    s.targetRing.position.set(tgt.x, height3(tgt.x, tgt.y) + 0.05, tgt.y);
    const k = 1 + Math.sin(s.time * 5) * 0.08;
    s.targetRing.scale.set(k, k, k);
  } else {
    s.targetRing.visible = false;
  }
}

function updateFloats3D() {
  const s = R3D;
  for (const sp of s.floatPool) sp.visible = false;
  let i = 0;
  for (const f of floats) {
    if (i >= s.floatPool.length) break;
    const sp = s.floatPool[i++];
    drawFloatText3D(sp, f.text, f.color);
    sp.visible = true;
    sp.position.set(f.x, height3(f.x, f.y) + 1.7 - f.age * 0.9, f.y);
    sp.material.opacity = Math.max(0, 1 - f.age / f.life);
  }
}

function show3DFailure() {
  if (els.threefail) return;
  const d = document.createElement('div');
  d.id = 'threefail';
  d.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99;background:#3a1515;color:#ffd9d9;border:1px solid #a04040;padding:10px 16px;border-radius:8px;font:13px monospace;max-width:80vw;';
  d.textContent = 'The 3D renderer hit an error — the view is frozen but the game keeps running. Refresh to retry, or add ?nogl to the URL for the classic 2D look.';
  document.body.appendChild(d);
  els.threefail = d;
}

function render3D(dt) {
  const s = R3D, T3 = s.three;
  const p = g.player;
  s.time += dt;
  if (s.staticsDirty) rebuildStatics3D();
  ensureChunks3D();

  // smooth third-person follow camera
  const k = 1 - Math.exp(-6 * dt);
  s.camera.position.lerp(new T3.Vector3(p.x, 27, p.y + 21), k);
  s.camera.lookAt(p.x, 1, p.y);

  // sun follows the player so shadows stay sharp
  s.sun.position.set(p.x + 20, 34, p.y + 14);
  s.sunTarget.position.set(p.x, 0, p.y);
  s.sunTarget.updateMatrixWorld();

  s.water.material.uniforms.uTime.value = s.time;
  if (s.furnaceLight) s.furnaceLight.intensity = 2.2 + Math.sin(s.time * 11) * 0.6 + Math.sin(s.time * 23) * 0.35;

  updatePlayer3D();
  for (const n of world.npcs) updateNpc3D(n);
  for (const m of g.monsters) updateMonster3D(m);
  updateMarkers3D();
  updateFloats3D();

  s.renderer.render(s.scene, s.camera);
}

// ---------- rendering (classic 2D fallback) ----------

function visibleRange() {
  const a0 = (-camX - 48) / (TILE_W / 2), a1 = (W - camX + 48) / (TILE_W / 2);
  const b0 = (-camY - 32) / (TILE_H / 2), b1 = (H - camY + 32) / (TILE_H / 2);
  return {
    a0, a1, b0, b1,
    txMin: Math.max(0, Math.floor((a0 + b0) / 2)),
    txMax: Math.min(world.size - 1, Math.ceil((a1 + b1) / 2)),
    tyMin: Math.max(0, Math.floor((b0 - a1) / 2)),
    tyMax: Math.min(world.size - 1, Math.ceil((b1 - a0) / 2))
  };
}

function drawGround() {
  const phase = (gameNow * 2) | 0;
  const r = visibleRange();
  const bx0 = Math.max(0, Math.floor(r.txMin / BLOCK) - 1);
  const bx1 = Math.min(Math.ceil(world.size / BLOCK) - 1, Math.floor(r.txMax / BLOCK) + 1);
  const by0 = Math.max(0, Math.floor(r.tyMin / BLOCK) - 1);
  const by1 = Math.min(Math.ceil(world.size / BLOCK) - 1, Math.floor(r.tyMax / BLOCK) + 1);
  for (let bx = bx0; bx <= bx1; bx++) {
    for (let by = by0; by <= by1; by++) {
      const cv = getGroundBlock(bx, by, phase);
      const wpos = worldToScreen(bx * BLOCK, by * BLOCK);
      ctx.drawImage(cv, wpos.x - 256, wpos.y);
    }
  }
}

function drawSpriteAt(spr, px, py, yoff = 0) {
  const s = worldToScreen(px, py);
  ctx.drawImage(spr.cv, s.x - spr.w / 2, s.y + TILE_H / 2 - spr.h + yoff);
}

function drawScene() {
  const r = visibleRange();
  const items = [];
  // object tiles (trees, rocks, stumps)
  for (let tx = r.txMin; tx <= r.txMax; tx++) {
    const tyMin = Math.max(r.tyMin, tx - r.a1, Math.ceil(r.b0 - tx));
    const tyMax = Math.min(r.tyMax, tx - r.a0, Math.floor(r.b1 - tx));
    for (let ty = tyMin; ty <= tyMax; ty++) {
      const t = world.terrain[ty * world.size + tx];
      const name = T_OBJ_SPRITE[t];
      if (name) items.push({ d: tx + ty + 1, kind: 'tileobj', name, tx, ty });
    }
  }
  // buildings
  for (const b of world.buildings) {
    const px = b.x + (b.w - 1) / 2 + 0.5, py = b.y + b.h - 0.5;
    const s = worldToScreen(px, py);
    if (s.x > -120 && s.x < W + 120 && s.y > -140 && s.y < H + 140) {
      items.push({ d: px + py, kind: 'building', b });
    }
  }
  // objects
  for (const o of world.objects) {
    if (o.x >= r.txMin - 1 && o.x <= r.txMax + 1 && o.y >= r.tyMin - 1 && o.y <= r.tyMax + 1) {
      items.push({ d: o.x + o.y + 1, kind: 'obj', o });
    }
  }
  // monsters
  for (const m of g.monsters) {
    if (!m.alive) continue;
    const s = worldToScreen(m.x, m.y);
    if (s.x > -80 && s.x < W + 80 && s.y > -80 && s.y < H + 80) {
      items.push({ d: m.x + m.y + 1, kind: 'monster', m });
    }
  }
  // NPCs
  for (const n of world.npcs) {
    const s = worldToScreen(n.x + 0.5, n.y + 0.5);
    if (s.x > -80 && s.x < W + 80 && s.y > -80 && s.y < H + 80) {
      items.push({ d: n.x + n.y + 1, kind: 'npc', n });
    }
  }
  items.push({ d: g.player.x + g.player.y + 1, kind: 'player' });
  items.sort((a, b) => a.d - b.d);

  for (const it of items) {
    if (it.kind === 'tileobj') {
      const spr = S[it.name];
      if (spr) drawSpriteAt(spr, it.tx + 0.5, it.ty + 0.5);
    } else if (it.kind === 'building') {
      const spr = S[it.b.type];
      if (spr) drawSpriteAt(spr, it.b.x + (it.b.w - 1) / 2 + 0.5, it.b.y + it.b.h - 0.5);
    } else if (it.kind === 'obj') {
      const spr = S[it.o.type];
      if (spr) drawSpriteAt(spr, it.o.x + 0.5, it.o.y + 0.5);
    } else if (it.kind === 'monster') {
      drawMonster(it.m);
    } else if (it.kind === 'npc') {
      drawHumanoid(it.n.pal + '_A', it.n.x + 0.5, it.n.y + 0.5);
    } else if (it.kind === 'player') {
      drawPlayer();
    }
  }
}

function drawHumanoid(base, px, py, yoff = 0) {
  const spr = S[base];
  if (!spr) return;
  drawSpriteAt(spr, px, py, yoff);
}

function drawMonster(m) {
  const md = MONSTERS[m.type];
  const frame = m.moving ? (Math.floor(m.animT * 8) % 2) : 0;
  const name = m.type + (frame ? '_B' : '_A');
  const spr = S[name];
  if (!spr) return;
  const bob = m.moving ? -Math.abs(Math.sin(m.animT * 9)) * 3 : 0;
  drawSpriteAt(spr, m.x, m.y, bob);
  if (m.flash > 0) {
    const s = worldToScreen(m.x, m.y);
    ctx.drawImage(spr.flash, s.x - spr.w / 2, s.y + TILE_H / 2 - spr.h + bob);
  }
  // hp bar when damaged
  if (m.hp < md.hp) {
    const s = worldToScreen(m.x, m.y);
    const w = 40;
    const x = s.x - w / 2, y = s.y + TILE_H / 2 - spr.h - 10;
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x, y, w * clamp(m.hp / md.hp, 0, 1), 3);
  }
  if (g.player.target === m) {
    const s = worldToScreen(m.x, m.y);
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + TILE_W / 4, s.y + TILE_H / 4);
    ctx.lineTo(s.x, s.y + TILE_H / 2);
    ctx.lineTo(s.x - TILE_W / 4, s.y + TILE_H / 4);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawPlayer() {
  const p = g.player;
  const frame = p.moving ? (Math.floor(p.animT * 8) % 2) : 0;
  const spr = S['player_' + (frame ? 'B' : 'A')];
  if (!spr) return;
  const s = worldToScreen(p.x, p.y);
  ctx.drawImage(spr.cv, s.x - spr.w / 2, s.y + TILE_H / 2 - spr.h);
  // held weapon
  const wid = g.equip.weapon;
  if (wid && S[wid]) {
    const ws = S[wid];
    ctx.drawImage(ws.cv, s.x + spr.w / 2 - 20, s.y + TILE_H / 2 - spr.h + 14);
  }
  // swing arc
  if (p.swingT > 0) {
    const t = 1 - p.swingT / 0.18;
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y + TILE_H / 2 - spr.h / 2, 24, -Math.PI * 0.7 + t * Math.PI * 1.2, -Math.PI * 0.2 + t * Math.PI * 1.2);
    ctx.stroke();
  }
  // hp bar
  const mh = maxHp(g);
  if (p.hp < mh) {
    const w = 40;
    const x = s.x - w / 2, y = s.y + TILE_H / 2 - spr.h - 12;
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x, y, w * clamp(p.hp / mh, 0, 1), 3);
  }
}

function drawFloats() {
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  for (const f of floats) {
    const s = worldToScreen(f.x, f.y);
    const a = 1 - f.age / f.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, s.x + 1, s.y - 36 - f.age * 26 + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, s.x, s.y - 36 - f.age * 26);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawCursor() {
  if (state !== 'playing' || frozen) return;
  const t = hover.target;
  if (!t) return;
  const col =
    t.kind === 'monster' ? '#ff6666' :
      t.kind === 'resource' ? (g.player.action === 'chop' ? '#aaff66' : '#ffcc55') :
        t.kind === 'npc' || t.kind === 'obj' || t.kind === 'building' ? '#ffe08a' :
          'rgba(255,255,255,0.55)';
  const s = worldToScreen(t.x + 0.5, t.y + 0.5);
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - TILE_H / 4);
  ctx.lineTo(s.x + TILE_W / 4, s.y);
  ctx.lineTo(s.x, s.y + TILE_H / 4);
  ctx.lineTo(s.x - TILE_W / 4, s.y);
  ctx.closePath();
  ctx.stroke();
}

function drawMinimap() {
  const c = els.minimap;
  const cc = c.getContext('2d');
  cc.imageSmoothingEnabled = false;
  cc.clearRect(0, 0, c.width, c.height);
  if (minimapSrc) cc.drawImage(minimapSrc, 0, 0, c.width, c.height);
  const size = world.size;
  const sc = c.width / size;
  // viewport rect
  const corners = [
    screenToTile(0, 0), screenToTile(W, 0), screenToTile(0, H), screenToTile(W, H)
  ];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const cn of corners) {
    x0 = Math.min(x0, cn.tx); y0 = Math.min(y0, cn.ty);
    x1 = Math.max(x1, cn.tx); y1 = Math.max(y1, cn.ty);
  }
  cc.strokeStyle = 'rgba(255,255,255,0.8)';
  cc.lineWidth = 1;
  cc.strokeRect(x0 * sc, y0 * sc, (x1 - x0) * sc, (y1 - y0) * sc);
  // town
  cc.fillStyle = '#ffffff';
  cc.fillRect(world.town.x * sc - 2, world.town.y * sc - 2, 4, 4);
  // player
  cc.fillStyle = '#ff4444';
  cc.fillRect(g.player.x * sc - 2, g.player.y * sc - 2, 4, 4);
}

function render() {
  ctx.fillStyle = '#0d1420';
  ctx.fillRect(0, 0, W, H);
  if (!world || !g) return;
  drawGround();
  drawScene();
  drawFloats();
  drawCursor();
}

// ---------- dialogue ----------

let dialog = null;

function renderDialogueLine() {
  const L = dialog.lines[dialog.i];
  els.speakername.textContent = L.name;
  els.speakerlines.textContent = L.text;
  const pc = els.portrait.getContext('2d');
  pc.clearRect(0, 0, 96, 96);
  pc.imageSmoothingEnabled = false;
  const spr = S[L.pal + '_A'];
  if (spr) pc.drawImage(spr.cv, 0, 0, spr.w, spr.h, 12, 0, 72, 108);
  const isLast = dialog.i >= dialog.lines.length - 1;
  const hasChoices = isLast && dialog.choices && dialog.choices.length;
  els.dialogchoices.innerHTML = '';
  els.dialogcontinue.style.display = hasChoices ? 'none' : '';
  if (hasChoices) {
    for (const ch of dialog.choices) {
      const b = document.createElement('button');
      b.textContent = ch.label;
      b.addEventListener('click', () => {
        const done = dialog.onDone;
        closeDialogue();
        if (ch.action) ch.action();
        else if (done) done();
        sfx.ui();
      });
      els.dialogchoices.appendChild(b);
    }
  }
}

function openDialogue(lines, choices, onDone) {
  dialog = { lines, choices: choices || [], onDone, i: 0 };
  frozen = true;
  showOverlay('dialog');
  renderDialogueLine();
}

function closeDialogue() {
  dialog = null;
  hideOverlay('dialog');
  frozen = false;
}

els.dialogcontinue.addEventListener('click', () => {
  if (!dialog) return;
  sfx.ui();
  if (dialog.i < dialog.lines.length - 1) {
    dialog.i++;
    renderDialogueLine();
  } else {
    const done = dialog.onDone;
    closeDialogue();
    if (done) done();
  }
});

function questRewardHook(qd) {
  log('Quest complete: ' + qd.name + ' — ' + qd.rewardText, 'quest');
  sfx.quest();
  addFloat(g.player.x, g.player.y, 'Quest complete!', '#ffe08a');
  markInvDirty();
}

function npcLines(npc) {
  const q = g.quests;
  if (npc.id === 'bram') {
    const rats = QUESTS[0], bear = QUESTS[2];
    if (q.rats.stage === 0) {
      return {
        lines: [
          { name: 'Elder Bram', pal: 'bram', text: 'Ah, a fresh face in Oldgate! ' + rats.intro },
          { name: 'Elder Bram', pal: 'bram', text: 'Will you help the village, friend?' }
        ],
        choices: [
          { label: 'I will deal with the rats.', action: () => { startQuest(g, 'rats'); log('Quest started: ' + rats.name, 'quest'); sfx.quest(); } },
          { label: 'Maybe later.', action: null }
        ]
      };
    }
    if (q.rats.stage === 1) {
      return { lines: [{ name: 'Elder Bram', pal: 'bram', text: `You have slain ${q.rats.count} of the 3 rats. Keep at it, hero!` }] };
    }
    if (q.rats.stage === 2) {
      return {
        lines: [{ name: 'Elder Bram', pal: 'bram', text: 'Three rats? Already done — you move fast, hero! Here: ' + rats.rewardText + '.' }],
        choices: [
          { label: 'Collect the reward.', action: () => { if (completeCountQuest(g, 'rats')) questRewardHook(rats); } },
          { label: 'Thank you, Elder.', action: null }
        ]
      };
    }
    if (q.bear.stage === 0) {
      return {
        lines: [
          { name: 'Elder Bram', pal: 'bram', text: 'There is one more matter... ' + bear.intro },
          { name: 'Elder Bram', pal: 'bram', text: 'Will you take it?' }
        ],
        choices: [
          { label: 'No bear is too big.', action: () => { startQuest(g, 'bear'); log('Quest started: ' + bear.name, 'quest'); sfx.quest(); } },
          { label: 'Let the bear keep its hoard.', action: null }
        ]
      };
    }
    if (q.bear.stage === 1) {
      return { lines: [{ name: 'Elder Bram', pal: 'bram', text: `I need ${bear.count} bear pelts in total. Bring them to me when you have them.` }] };
    }
    if (q.bear.stage === 2) {
      return {
        lines: [{ name: 'Elder Bram', pal: 'bram', text: 'The pelts? Then it is done! ' + bear.rewardText + '.' }],
        choices: [
          { label: 'Hand over the pelts.', action: () => {
            const r = deliverItemQuest(g, 'bear', 'pelt_bear');
            if (r.done) questRewardHook(bear);
            else log(`You need ${r.short} more bear pelts.`, 'warn');
          } },
          { label: 'Until next time, Elder.', action: null }
        ]
      };
    }
    const line = VILLAGER_LINES[Math.floor(gameNow / 30) % VILLAGER_LINES.length];
    return { lines: [{ name: 'Elder Bram', pal: 'bram', text: line }] };
  }

  if (npc.id === 'torin') {
    const iron = QUESTS[1];
    if (q.iron.stage === 0) {
      return {
        lines: [
          { name: 'Torin', pal: 'torin', text: 'A visitor! I\'m Torin, the smith. ' + iron.intro },
          { name: 'Torin', pal: 'torin', text: 'Care to help a man with a hungry forge?' }
        ],
        choices: [
          { label: 'I\'ll fetch your ore.', action: () => { startQuest(g, 'iron'); log('Quest started: ' + iron.name, 'quest'); sfx.quest(); } },
          { label: 'No time today.', action: null }
        ]
      };
    }
    if (q.iron.stage === 1) {
      const have = countItem(g, 'ore_iron');
      if (have >= iron.count) {
        return {
          lines: [{ name: 'Torin', pal: 'torin', text: 'Got my ore already? Impressive. I have ' + iron.rewardText + ' ready for you.' }],
          choices: [
            { label: 'Give me the ore.', action: () => {
              const r = deliverItemQuest(g, 'iron', 'ore_iron');
              if (r.done) questRewardHook(iron);
              else log(`You need ${r.short} more iron ore.`, 'warn');
            } },
            { label: 'Not yet.', action: null }
          ]
        };
      }
      return { lines: [{ name: 'Torin', pal: 'torin', text: `I need ${iron.count} iron ore in total. You carry ${have}. The mountains to the north should have some.` }] };
    }
    const line = VILLAGER_LINES[Math.floor(gameNow / 30 + 1) % VILLAGER_LINES.length];
    return { lines: [{ name: 'Torin', pal: 'torin', text: line }] };
  }

  if (npc.id === 'greta') {
    return {
      lines: [
        { name: 'Greta', pal: 'greta', text: 'Well hello! Logs, ore, pelts, potions, steel — if you can name it, I probably stock it. Or I\'ll buy it off you, fair.' },
        { name: 'Greta', pal: 'greta', text: 'Care to browse the wares?' }
      ],
      choices: [
        { label: 'Show me your wares.', action: () => openShop() },
        { label: 'Just looking.', action: null }
      ]
    };
  }

  return { lines: [{ name: npc.name, pal: npc.pal, text: VILLAGER_LINES[Math.floor(gameNow / 30 + 2) % VILLAGER_LINES.length] }] };
}

function openNpcDialogue(npc) {
  const d = npcLines(npc);
  openDialogue(d.lines, d.choices, null);
}

// ---------- modals ----------

function openModal(title, bodyNode) {
  els.modaltitle.textContent = title;
  els.modalbody.innerHTML = '';
  els.modalbody.appendChild(bodyNode);
  frozen = true;
  showOverlay('modal');
}

function closeModal() {
  hideOverlay('modal');
  frozen = false;
}

function coinLine() {
  const d = document.createElement('div');
  d.className = 'shop-coins';
  d.innerHTML = 'Your coins: <b class="sc"></b>';
  return d;
}
function refreshCoins(body) {
  const b = body.querySelector('.sc');
  if (b) b.textContent = g.coins;
}

function openShop() {
  const body = document.createElement('div');
  body.className = 'shop';
  body.appendChild(coinLine());

  const buyH = document.createElement('h3');
  buyH.textContent = 'Buy';
  body.appendChild(buyH);
  for (const [id, price] of Object.entries(SHOP_STOCK.buy)) {
    const row = document.createElement('div');
    row.className = 'shoprow';
    row.appendChild(iconCanvas(id, 26));
    const nm = document.createElement('span');
    nm.className = 'shopname';
    nm.textContent = ITEMS[id].name;
    const pr = document.createElement('span');
    pr.className = 'shopprice';
    pr.textContent = price + 'c';
    const btn = document.createElement('button');
    btn.textContent = 'Buy';
    btn.addEventListener('click', () => {
      if (buyItem(g, id)) {
        sfx.coin();
        log(`Bought ${ITEMS[id].name} for ${price} coins.`, 'sys');
      } else if (g.coins < price) log('You cannot afford that.', 'warn');
      else log('Your inventory is full!', 'warn');
      markInvDirty();
      refreshCoins(body);
      const dis = g.coins < price;
      btn.disabled = dis;
    });
    if (g.coins < price) btn.disabled = true;
    row.appendChild(nm);
    row.appendChild(pr);
    row.appendChild(btn);
    body.appendChild(row);
  }

  const sellH = document.createElement('h3');
  sellH.textContent = 'Sell (1 at a time)';
  body.appendChild(sellH);
  function buildSell() {
    const old = body.querySelector('.sellarea');
    if (old) old.remove();
    const area = document.createElement('div');
    area.className = 'sellarea';
    const counts = {};
    for (const s of g.inv) counts[s.id] = (counts[s.id] || 0) + s.n;
    let any = false;
    for (const [id, n] of Object.entries(counts)) {
      const price = SHOP_STOCK.sell[id];
      if (!price) continue;
      any = true;
      const row = document.createElement('div');
      row.className = 'shoprow';
      row.appendChild(iconCanvas(id, 26));
      const nm = document.createElement('span');
      nm.className = 'shopname';
      nm.textContent = ITEMS[id].name + ' ×' + n;
      const pr = document.createElement('span');
      pr.className = 'shopprice';
      pr.textContent = '+' + price + 'c';
      const btn = document.createElement('button');
      btn.textContent = 'Sell';
      btn.addEventListener('click', () => {
        if (sellItem(g, id)) {
          sfx.coin();
          log(`Sold ${ITEMS[id].name} for ${price} coins.`, 'sys');
        }
        markInvDirty();
        refreshCoins(body);
        buildSell();
      });
      row.appendChild(nm);
      row.appendChild(pr);
      row.appendChild(btn);
      area.appendChild(row);
    }
    if (!any) {
      const p = document.createElement('p');
      p.textContent = 'Nothing sellable in your pack.';
      area.appendChild(p);
    }
    body.appendChild(area);
  }
  buildSell();
  openModal('Greta\'s General Store', body);
}

function openSmithy() {
  const body = document.createElement('div');
  body.className = 'shop';
  const p0 = document.createElement('p');
  p0.textContent = 'Smithing level ' + level(g, 'smithing') + '. Iron ore grows in the northern mountains.';
  body.appendChild(p0);
  function buildRows() {
    const old = body.querySelector('.recipes');
    if (old) old.remove();
    const area = document.createElement('div');
    area.className = 'recipes';
    const myLvl = level(g, 'smithing');
    for (const r of SMITH_RECIPES) {
      const row = document.createElement('div');
      row.className = 'shoprow';
      row.appendChild(iconCanvas(r.id, 26));
      const nm = document.createElement('span');
      nm.className = 'shopname';
      const canLvl = myLvl >= r.level;
      nm.textContent = r.name + ' (req ' + r.level + ')';
      nm.style.color = canLvl ? '' : '#c88';
      const needs = document.createElement('span');
      needs.className = 'shopprice';
      const parts = [];
      for (const [id, n] of Object.entries(r.needs)) {
        const have = countItem(g, id);
        parts.push(`<span style="color:${have >= n ? '#9c9' : '#e88'}">${have}/${n}</span> ${ITEMS[id].name}`);
      }
      needs.innerHTML = parts.join(', ');
      const btn = document.createElement('button');
      btn.textContent = 'Craft';
      btn.disabled = !canLvl;
      btn.addEventListener('click', () => {
        const res = smithRecipe(g, r.id);
        log(res.msg, res.ok ? 'loot' : 'warn');
        if (res.ok) sfx.coin();
        markInvDirty();
        buildRows();
      });
      row.appendChild(nm);
      row.appendChild(needs);
      row.appendChild(btn);
      area.appendChild(row);
    }
    body.appendChild(area);
  }
  buildRows();
  openModal('Torin\'s Smithy', body);
}

function openCookPot() {
  const body = document.createElement('div');
  body.className = 'shop';
  function refresh() {
    const p = body.querySelector('.cinfo');
    p.textContent = `Raw meat: ${countItem(g, 'meat_raw')}   Cooked meat: ${countItem(g, 'meat_cooked')}   (Cooking level ${level(g, 'cooking')})`;
  }
  const p0 = document.createElement('p');
  p0.className = 'cinfo';
  body.appendChild(p0);
  const btn = document.createElement('button');
  btn.textContent = 'Cook a piece of raw meat';
  let busy = false;
  btn.addEventListener('click', () => {
    if (busy) return;
    const res = cookTick(g);
    log(res.msg, res.ok ? 'sys' : 'warn');
    if (res.ok) sfx.eat();
    markInvDirty();
    refresh();
    busy = true;
    btn.disabled = true;
    setTimeout(() => { busy = false; btn.disabled = false; }, 900);
  });
  body.appendChild(btn);
  refresh();
  openModal('The Village Cooking Pot', body);
}

function openQuests() {
  const body = document.createElement('div');
  body.className = 'shop';
  for (const qd of QUESTS) {
    const q = g.quests[qd.id];
    const box = document.createElement('div');
    box.className = 'questbox';
    const h = document.createElement('h3');
    h.textContent = qd.name + ' — ' + (q.stage === 3 ? 'Completed' : q.stage === 0 ? 'Not started' : 'In progress');
    h.style.color = q.stage === 3 ? '#8f8' : q.stage === 0 ? '#aaa' : '#fd8';
    box.appendChild(h);
    const d = document.createElement('p');
    d.textContent = q.stage === 1 ? qd.goal + ` (${q.count}/${qd.count})` : qd.rewardText;
    box.appendChild(d);
    body.appendChild(box);
  }
  openModal('Quest Log', body);
}

function openHelp() {
  const body = document.createElement('div');
  body.className = 'shop';
  const lines = [
    'MOVE — right-click the ground, or WASD / arrow keys.',
    'INTERACT — left-click a monster, tree, rock, NPC, furnace or pot.',
    'ACTION BAR — pick Attack / Chop / Mine / Talk, then left-click a target (or just left-click and choose from the menu).',
    'INVENTORY — left-click an item to eat/equip it, right-click for more options. Drop unwanted items to make room.',
    'GATHER — chop trees for logs, mine rocks for ore. Higher ore needs higher levels.',
    'CRAFT — bring bars to Torin\'s furnace (smithy) to forge weapons and armour.',
    'COOK — raw meat from monsters can be cooked at the village pot.',
    'FIGHT — attack monsters for coins, loot and combat XP. If you die you wake in Oldgate, lighter on coins.',
    'PROGRESS — every skill levels up with experience, exactly the way the old MMORPGs did it.',
    'SAVE — your game autosaves to this browser. Use the Menu to save now or return to the title.'
  ];
  for (const l of lines) {
    const p = document.createElement('p');
    p.textContent = l;
    body.appendChild(p);
  }
  openModal('How to Play', body);
}

function openMenu() {
  const body = document.createElement('div');
  body.className = 'shop';
  const b1 = document.createElement('button');
  b1.textContent = 'Save now';
  b1.addEventListener('click', () => { saveGame(); log('Game saved.', 'sys'); sfx.ui(); });
  const b2 = document.createElement('button');
  b2.textContent = 'Sound: ' + (isMuted() ? 'off' : 'on');
  b2.addEventListener('click', () => {
    setMuted(!isMuted());
    b2.textContent = 'Sound: ' + (isMuted() ? 'off' : 'on');
  });
  const b3 = document.createElement('button');
  b3.textContent = 'Return to title (saves)';
  b3.addEventListener('click', () => {
    saveGame();
    closeModal();
    state = 'title';
    frozen = false;
    showOverlay('title');
  });
  const credit = document.createElement('p');
  credit.textContent = 'Ironvale — an original isometric adventure. All art generated in code.';
  body.appendChild(b1);
  body.appendChild(b2);
  body.appendChild(b3);
  body.appendChild(credit);
  openModal('Menu', body);
}

els.modalclose.addEventListener('click', closeModal);

// ---------- item menus / tooltips ----------

function hideTooltip() { els.tooltip.classList.add('hidden'); }

function showTooltipAt(html, x, y) {
  const t = els.tooltip;
  t.innerHTML = html;
  t.classList.remove('hidden');
  const r = t.getBoundingClientRect();
  t.style.left = Math.min(x + 14, window.innerWidth - r.width - 8) + 'px';
  t.style.top = Math.min(y + 14, window.innerHeight - r.height - 8) + 'px';
}

function itemMenu(idx, item, x, y) {
  const menu = els.ctxmenu;
  menu.innerHTML = '';
  const def = ITEMS[item.id];
  const head = document.createElement('div');
  head.className = 'ctxhead';
  head.textContent = def.name + (item.n > 1 ? ' ×' + item.n : '');
  menu.appendChild(head);
  const add = (label, fn, dis = false) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.disabled = dis;
    b.addEventListener('click', () => { hideCtxMenu(); fn(); sfx.ui(); });
    menu.appendChild(b);
  };
  if (def.heals) add('Eat / Drink', () => {
    const healed = eatItem(g, idx);
    if (healed > 0) { log(`You feel better. (+${healed} HP)`, 'sys'); sfx.eat(); }
    else log('You are already at full health — better save it.', 'sys');
    markInvDirty();
  }, g.player.hp >= maxHp(g));
  if (def.weapon || def.armor) add('Equip', () => {
    if (equipFromInv(g, idx)) { log(`You equip your ${def.name}.`, 'sys'); markInvDirty(); }
  });
  add('Drop', () => {
    removeItem(g, item.id, 1);
    log('You drop ' + def.name + '.', 'sys');
    markInvDirty();
  });
  menu.classList.remove('hidden');
  menu.style.left = Math.min(x + 4, W - 180) + 'px';
  menu.style.top = Math.min(y + 4, H - 120) + 'px';
}

function bindInventoryEvents() {
  els.invgrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.slot');
    if (!cell) return;
    const idx = +cell.dataset.idx;
    const item = g.inv[idx];
    if (!item) return;
    const def = ITEMS[item.id];
    if (def.heals) {
      const healed = eatItem(g, idx);
      if (healed > 0) { log(`You feel better. (+${healed} HP)`, 'sys'); sfx.eat(); }
      else log('You are already at full health — better save it.', 'sys');
      markInvDirty();
    } else if (def.weapon || def.armor) {
      if (equipFromInv(g, idx)) { log(`You equip your ${def.name}.`, 'sys'); markInvDirty(); }
    }
  });
  els.invgrid.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cell = e.target.closest('.slot');
    if (!cell) return;
    const idx = +cell.dataset.idx;
    const item = g.inv[idx];
    if (!item) return;
    itemMenu(idx, item, e.clientX, e.clientY);
  });
  els.invgrid.addEventListener('mousemove', (e) => {
    const cell = e.target.closest('.slot');
    if (!cell) { hideTooltip(); return; }
    const idx = +cell.dataset.idx;
    const item = g.inv[idx];
    if (!item) { hideTooltip(); return; }
    const def = ITEMS[item.id];
    showTooltipAt(`<b>${def.name}</b>${item.n > 1 ? ' ×' + item.n : ''}<br>${itemStatsText(item.id) || 'A fine item.'}`, e.clientX, e.clientY);
  });
  els.invgrid.addEventListener('mouseleave', hideTooltip);
}

// ---------- input ----------

function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    initAudio();
    keys.add(e.code);
    if (e.code === 'Escape') {
      if (!els.ctxmenu.classList.contains('hidden')) { hideCtxMenu(); return; }
      if (!els.modal.classList.contains('hidden')) { closeModal(); return; }
      if (!els.dialog.classList.contains('hidden')) { closeDialogue(); return; }
      return;
    }
    if (state === 'playing' && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      g.player.path = null;
      g.player.pending = null;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    initAudio();
    if (e.button === 0) {
      mouseDown = true;
      onLeftClick(e.offsetX, e.offsetY);
    }
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (state !== 'playing' || frozen) return;
    hideCtxMenu();
    const h = pick(e.offsetX, e.offsetY);
    moveTo(h.tx, h.ty);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!world || state !== 'playing') return;
    const h = pick(e.offsetX, e.offsetY);
    hover = h;
    canvas.style.cursor = h.target && h.target.kind !== 'tile' ? 'pointer' : 'default';
    if (h.target && (h.target.kind === 'monster' || h.target.kind === 'npc')) {
      if (h.target.kind === 'monster') {
        const m = h.target.m;
        const md = MONSTERS[m.type];
        showTooltipAt(`<b>${md.name}</b><br>Level ${md.level} — HP ${Math.ceil(m.hp)}/${md.hp}`, e.clientX, e.clientY);
      } else {
        showTooltipAt(`<b>${h.target.n.name}</b><br>${NPC_TITLES[h.target.n.role] || ''}`, e.clientX, e.clientY);
      }
    } else {
      hideTooltip();
    }
  });
  canvas.addEventListener('mouseleave', hideTooltip);

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#ctxmenu')) hideCtxMenu();
  });
}

// ---------- level-up hook ----------

setLevelUpHook((skillId, newLevel) => {
  const sk = SKILLS.find((s) => s.id === skillId);
  sfx.levelup();
  log(`Your ${sk ? sk.name : skillId} level is now ${newLevel}!`, 'quest');
  addFloat(g.player.x, g.player.y, 'Level up!', '#7CFC00');
});

// ---------- boot ----------

function boot() {
  init3D();
  resize();
  buildSprites();
  buildSkillsUI();
  buildActionbar();
  bindInventoryEvents();
  bindInput();

  els.btnNew.addEventListener('click', () => {
    let seed = parseInt(els.seedinput.value, 10);
    if (!Number.isFinite(seed)) seed = (Math.random() * 0x7fffffff) | 0;
    seed = seed >>> 0;
    hideOverlay('title');
    startWorld(seed, null);
  });
  els.btnContinue.addEventListener('click', () => {
    const data = loadSaveData();
    if (!data) { log('No saved game found.', 'warn'); return; }
    hideOverlay('title');
    startWorld(data.seed, data);
  });
  els.btnHow.addEventListener('click', () => { openHelp(); });
  els.btnRespawn.addEventListener('click', () => {
    const p = g.player;
    p.x = world.town.x + 0.5;
    p.y = world.town.y + 0.5;
    p.hp = maxHp(g);
    p.target = null;
    p.path = null;
    hideOverlay('death');
    frozen = false;
    state = 'playing';
    sfx.ui();
    saveGame();
  });

  document.querySelector('#btn-quests').addEventListener('click', () => { sfx.ui(); openQuests(); });
  document.querySelector('#btn-help').addEventListener('click', () => { sfx.ui(); openHelp(); });
  document.querySelector('#btn-menu').addEventListener('click', () => { sfx.ui(); openMenu(); });

  window.addEventListener('beforeunload', () => { if (g && state !== 'title') saveGame(); });

  if (hasSave()) els.btnContinue.classList.remove('hidden');
  showOverlay('title');

  lastTs = performance.now();
  requestAnimationFrame(frame);
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
  lastTs = ts;
  if (state === 'playing' || state === 'dead') gameNow += dt;
  if (state === 'playing' && !frozen) update(dt);
  if (world && g) {
    if (R3D) {
      if (!R3D.renderDead) {
        try { render3D(dt); }
        catch (e) { R3D.renderDead = true; console.error('3D render failed:', e); show3DFailure(); }
      }
    } else {
      render();
    }
    drawMinimap();
    updateHUD();
    if (invDirty) {
      invDirty = false;
      renderInventory();
    }
  }
}

boot();
