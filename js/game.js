// Ironvale — game state & rules (no DOM access).
import {
  SKILLS, levelFromXp, ITEMS, MONSTERS, SMITH_RECIPES, SHOP_STOCK, QUESTS,
  EQUIP_SLOTS, tileAt, isWalkable, T
} from './core.js';

export const INVENTORY_SIZE = 28;
const STACK_MAX = 999;

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---------- creation ----------

function findSpawn(world) {
  const tx = world.town.x, ty = world.town.y;
  for (let r = 0; r < 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isWalkable(world, tx + dx, ty + dy)) return { x: tx + dx + 0.5, y: ty + dy + 0.5 };
      }
    }
  }
  return { x: tx + 0.5, y: ty + 0.5 };
}

export function newGame(world) {
  const stats = {};
  for (const s of SKILLS) stats[s.id] = 0;
  const spawn = findSpawn(world);
  const g = {
    world,
    player: {
      x: spawn.x,
      y: spawn.y,
      stats,
      hp: 0,
      target: null,
      action: 'move',        // move | attack | chop | mine
      actionTile: null,
      pending: null,         // deferred interaction {kind, ref, done}
      attackTimer: 0,
      actionTimer: 0,
      animT: 0,
      moving: false
    },
    coins: 50,
    inv: [
      { id: 'sword_wooden', n: 1 },
      { id: 'axe', n: 1 },
      { id: 'pickaxe', n: 1 },
      { id: 'meat_cooked', n: 3 }
    ],
    equip: { helm: null, chest: null, legs: null, boots: null, weapon: 'sword_wooden' },
    quests: { rats: { stage: 0, count: 0 }, iron: { stage: 0, count: 0 }, bear: { stage: 0, count: 0 } },
    title: null,
    monsters: world.monsters.map((m) => ({
      id: m.id, type: m.type,
      x: m.x + 0.5, y: m.y + 0.5,
      homeX: m.x, homeY: m.y,
      hp: MONSTERS[m.type].hp, alive: true,
      respawnAt: 0, state: 'idle',
      nextThink: 0, nextPos: null, path: null, pathIdx: 0,
      attackTimer: 0, flash: 0, animT: 0, moving: false, lastPlayerTile: -1
    })),
    depletion: {},   // tileIndex -> seconds until regrow
    chopCount: {}    // tileIndex -> chops/swings done
  };
  g.player.hp = maxHp(g);
  return g;
}

// ---------- levels / combat stats ----------

export function level(g, id) { return levelFromXp(g.player.stats[id]); }

export function combatLevel(g) {
  const A = level(g, 'attack'), S = level(g, 'strength'), D = level(g, 'defence');
  const rough = 5 + Math.round((A + S + D) / 3) * 2;
  return Math.max(1, Math.round((A + S + D + Math.floor(rough / 4)) / 5));
}

export function maxHp(g) { return 5 + combatLevel(g) * 2; }

export function bonus(g, key) {
  let b = 0;
  for (const s of EQUIP_SLOTS) {
    const id = g.equip[s];
    if (id && ITEMS[id] && ITEMS[id][key]) b += ITEMS[id][key];
  }
  return b;
}

let levelUpHook = null;
export function setLevelUpHook(fn) { levelUpHook = fn; }

export function addXp(g, id, amt) {
  const before = level(g, id);
  g.player.stats[id] += amt;
  const after = level(g, id);
  if (after > before && levelUpHook) levelUpHook(id, after);
  return after - before;
}

export function rollAttack(atkLv, strLv, defLv) {
  const chance = clamp(0.35 + 0.012 * atkLv - 0.008 * defLv, 0.15, 0.95);
  const maxDmg = 1 + Math.floor(strLv / 5);
  if (Math.random() > chance) return { hit: false, dmg: 0 };
  return { hit: true, dmg: 1 + Math.floor(Math.random() * maxDmg) };
}

// ---------- inventory ----------

export function addItem(g, id, n = 1) {
  const def = ITEMS[id];
  if (!def) return false;
  let failed = 0;
  if (def.stack) {
    for (const s of g.inv) {
      if (n <= 0) break;
      if (s.id === id && s.n < STACK_MAX) {
        const add = Math.min(n, STACK_MAX - s.n);
        s.n += add; n -= add;
      }
    }
    while (n > 0) {
      if (g.inv.length >= INVENTORY_SIZE) { failed = n; break; }
      const add = Math.min(n, STACK_MAX);
      g.inv.push({ id, n: add });
      n -= add;
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (g.inv.length >= INVENTORY_SIZE) { failed = n - i; break; }
      g.inv.push({ id, n: 1 });
    }
  }
  return failed === 0;
}

export function removeItem(g, id, n = 1) {
  let left = n;
  for (let i = g.inv.length - 1; i >= 0 && left > 0; i--) {
    if (g.inv[i].id !== id) continue;
    const take = Math.min(left, g.inv[i].n);
    g.inv[i].n -= take;
    left -= take;
    if (g.inv[i].n <= 0) g.inv.splice(i, 1);
  }
  return left === 0;
}

export function countItem(g, id) {
  let c = 0;
  for (const s of g.inv) if (s.id === id) c += s.n;
  return c;
}

export function equipFromInv(g, slotInInv) {
  const s = g.inv[slotInInv];
  if (!s) return false;
  const def = ITEMS[s.id];
  const slot = def.weapon ? 'weapon' : def.armor;
  if (!slot) return false;
  s.n -= 1;
  if (s.n <= 0) g.inv.splice(slotInInv, 1);
  const prev = g.equip[slot];
  g.equip[slot] = s.id;
  if (prev) g.inv.push({ id: prev, n: 1 });
  return true;
}

export function unequipSlot(g, slot) {
  const id = g.equip[slot];
  if (!id) return false;
  g.equip[slot] = null;
  return addItem(g, id, 1);
}

// ---------- world interaction ----------

export function chopTick(g, tx, ty) {
  const t = tileAt(g.world, tx, ty);
  if (t !== T.OAK && t !== T.PINE) return;
  const isPine = t === T.PINE;
  const lvl = level(g, 'woodcut');
  const idx = ty * g.world.size + tx;
  const chops = (g.chopCount[idx] || 0) + 1;
  g.chopCount[idx] = chops;
  const chance = clamp(0.3 + lvl * 0.03, 0.3, 0.95) * (isPine ? 0.85 : 1);
  if (Math.random() < chance) {
    addItem(g, isPine ? 'log_pine' : 'log_oak', 1);
    addXp(g, 'woodcut', isPine ? 3 : 1.5);
  } else {
    addXp(g, 'woodcut', 0.5);
  }
  if (chops >= (isPine ? 12 : 8)) {
    g.world.terrain[idx] = T.STUMP;
    g.depletion[idx] = { t: 30, tile: t };
    g.chopCount[idx] = 0;
  }
}

const ORE_INFO = {
  [T.COPPER]: { item: 'ore_copper', xp: 1, req: 1 },
  [T.TIN]:    { item: 'ore_tin',    xp: 1.5, req: 5 },
  [T.IRON]:   { item: 'ore_iron',   xp: 3.5, req: 10 },
  [T.GOLD]:   { item: 'ore_gold',   xp: 10, req: 25 }
};

export function mineTick(g, tx, ty) {
  const t = tileAt(g.world, tx, ty);
  const info = ORE_INFO[t];
  if (!info) return { blocked: false };
  const lvl = level(g, 'mining');
  if (lvl < info.req) return { blocked: true, msg: `You need Mining level ${info.req} to mine ${info.item.replace('_', ' ')}.` };
  const idx = ty * g.world.size + tx;
  const swings = (g.chopCount[idx] || 0) + 1;
  g.chopCount[idx] = swings;
  const chance = clamp(0.25 + lvl * 0.025, 0.25, 0.95);
  if (Math.random() < chance) {
    addItem(g, info.item, 1);
    addXp(g, 'mining', info.xp);
  } else {
    addXp(g, 'mining', 0.5);
  }
  if (swings >= 5) {
    g.world.terrain[idx] = T.BARE;
    g.depletion[idx] = { t: 25, tile: t };
    g.chopCount[idx] = 0;
  }
  return { blocked: false };
}

export function cookTick(g) {
  if (countItem(g, 'meat_raw') < 1) return { ok: false, msg: 'You have no raw meat to cook.' };
  const lvl = level(g, 'cooking');
  const chance = clamp(0.5 + lvl * 0.05, 0.5, 0.98);
  if (Math.random() < chance) {
    removeItem(g, 'meat_raw', 1);
    addItem(g, 'meat_cooked', 1);
    addXp(g, 'cooking', 1.5);
    return { ok: true, msg: 'You cook the meat.' };
  }
  return { ok: false, msg: 'The meat burns to a crisp!' };
}

export function smithRecipe(g, recipeId) {
  const r = SMITH_RECIPES.find((x) => x.id === recipeId);
  if (!r) return { ok: false, msg: 'Unknown recipe.' };
  const lvl = level(g, 'smithing');
  if (lvl < r.level) return { ok: false, msg: `You need Smithing level ${r.level}.` };
  for (const [id, n] of Object.entries(r.needs)) {
    if (countItem(g, id) < n) {
      return { ok: false, msg: `You need ${n} x ${ITEMS[id].name}.` };
    }
  }
  for (const [id, n] of Object.entries(r.needs)) removeItem(g, id, n);
  addItem(g, r.id, 1);
  addXp(g, 'smithing', r.xp);
  return { ok: true, msg: `You crafted a ${ITEMS[r.id].name}.` };
}

// ---------- shop ----------

export function shopPrice(g, id, dir) {
  const table = dir === 'buy' ? SHOP_STOCK.buy : SHOP_STOCK.sell;
  return table[id] || 0;
}

export function buyItem(g, id) {
  const price = shopPrice(g, id, 'buy');
  if (!price) return false;
  if (g.coins < price) return false;
  if (!addItem(g, id, 1)) return false;
  g.coins -= price;
  return true;
}

export function sellItem(g, id) {
  const price = shopPrice(g, id, 'sell');
  if (!price) return false;
  if (!removeItem(g, id, 1)) return false;
  g.coins += price;
  return true;
}

// ---------- eating ----------

export function eatItem(g, slotInInv) {
  const s = g.inv[slotInInv];
  if (!s) return false;
  const def = ITEMS[s.id];
  if (!def.heals) return false;
  const before = g.player.hp;
  g.player.hp = Math.min(maxHp(g), g.player.hp + def.heals);
  s.n -= 1;
  if (s.n <= 0) g.inv.splice(slotInInv, 1);
  return g.player.hp - before;
}

// ---------- quests ----------

export function questDef(id) { return QUESTS.find((q) => q.id === id); }

export function startQuest(g, id) {
  const q = g.quests[id];
  if (!q || q.stage !== 0) return;
  q.stage = 1;
}

export function monsterKilledForQuests(g, type) {
  for (const qd of QUESTS) {
    if (qd.target !== type) continue;
    const q = g.quests[qd.id];
    if (q.stage === 1) {
      q.count++;
      if (q.count >= qd.count) q.stage = 2;
    }
  }
}

export function deliverItemQuest(g, id, itemId) {
  const qd = questDef(id);
  const q = g.quests[id];
  if (!qd || !q || q.stage !== 1 || qd.item !== itemId) return null;
  if (countItem(g, itemId) < qd.count) {
    return { short: qd.count - countItem(g, itemId) };
  }
  removeItem(g, itemId, qd.count);
  q.stage = 3;
  applyReward(g, qd);
  return { done: true };
}

export function completeCountQuest(g, id) {
  const qd = questDef(id);
  const q = g.quests[id];
  if (!qd || !q || q.stage !== 2) return false;
  q.stage = 3;
  applyReward(g, qd);
  return true;
}

function applyReward(g, qd) {
  const r = qd.reward || {};
  if (r.xp) for (const [k, v] of Object.entries(r.xp)) addXp(g, k, v);
  if (r.coins) g.coins += r.coins;
  if (r.item) addItem(g, r.item, 1);
  if (r.title) g.title = r.title;
}

// ---------- save / load ----------

export function serialize(g) {
  const mods = [];
  for (const [k, d] of Object.entries(g.depletion)) {
    if (d.t > 0) mods.push([k, Math.round(d.t), d.tile]);
  }
  return {
    v: 1,
    seed: g.world.seed,
    size: g.world.size,
    player: { x: g.player.x, y: g.player.y, stats: g.player.stats, hp: g.player.hp },
    coins: g.coins,
    inv: g.inv,
    equip: g.equip,
    quests: g.quests,
    title: g.title,
    mods
  };
}

export function restoreGame(world, data) {
  const g = newGame(world);
  g.player.x = data.player.x;
  g.player.y = data.player.y;
  g.player.stats = data.player.stats;
  g.coins = data.coins;
  g.inv = data.inv || [];
  g.equip = Object.assign(g.equip, data.equip || {});
  g.quests = Object.assign(g.quests, data.quests || {});
  g.title = data.title || null;
  for (const [k, v, tile] of data.mods || []) {
    if (v > 0) {
      g.depletion[k] = { t: v, tile };
      // terrain was regenerated fresh; restore the depleted form
      if (tile === T.OAK || tile === T.PINE) world.terrain[k] = T.STUMP;
      else if (tile === T.COPPER || tile === T.TIN || tile === T.IRON || tile === T.GOLD) world.terrain[k] = T.BARE;
    }
  }
  g.player.hp = clamp(data.player.hp || maxHp(g), 1, maxHp(g));
  return g;
}
