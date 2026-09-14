# Ironvale

An **original** MMORPG that runs entirely in the browser — in the spirit of the classic old-school MMOs. A huge procedurally generated island (640 × 640 tiles ≈ 409,600 tiles), a town, monsters, quests, shops, and a full gather → craft → fight → level progression loop.

> Ironvale is an original project. All art is generated procedurally in code at load time (zero binary asset files), all names, world and story are original. It is inspired by the *playstyle* of classic isometric MMORPGs, not by any specific one's assets.

## Features

- **Huge world**: 640×640-tile procedurally generated island (deterministic per seed) with biomes — beaches, grasslands, forests, hills, mountains and snow peaks — plus the town of **Oldgate** with buildings, roads and a plaza.
- **Click-to-move** (left or right click on the ground), A* pathfinding, smooth camera.
- **AAA 2D isometric renderer (default)**: 60 fps tile renderer with a full 8-minute day/night cycle (keyframed color grade, stars, ambient sky tint), animated water (shimmer + lapping shore foam), pre-rendered soft shadows under trees & creatures, particle effects (wind-blown leaves, mining sparks, death & level-up bursts, drifting motes by day and fireflies by night), glowing windows at dusk (lit furnace at the forge), gentle tree sway, and a cinematic vignette post-pass.
- **Optional full 3D world**: add `?3d` to the URL for the real-time three.js renderer — vertex-colored heightfield terrain in lazy chunks, instanced trees & ore, dynamic sun with soft shadows, fog, animated water, glowing furnace.
- **7 skills with XP & levels**: Attack, Strength, Defence, Woodcutting, Mining, Smithing, Cooking — classic skill bars with level-ups.
- **Combat**: melee with 5 monster types (rats, slimes, wolves, bears, rock trolls), hit/miss rolls, damage numbers, monster AI (wander / chase / attack / return), respawns.
- **Gathering**: chop oak & pine trees, mine copper / tin / iron / gold (higher ores need higher levels); nodes deplete and regrow.
- **Crafting**: smelt bars and forge swords, helms and platebody at Torin's furnace; cook raw meat at the village pot.
- **Economy**: coins, Greta's shop (buy & sell).
- **Quests**: 3 quests with dialogue, objectives, rewards and a title.
- **UI**: inventory (28 slots) + equipment (helm/chest/legs/boots/weapon), tooltips, context menus, action bar, minimap with viewport, chat log, death & respawn.
- **Persistence**: autosaves to `localStorage` every 20 s; Continue from the title screen.
- **Sound**: tiny synthesized WebAudio SFX (no audio files), mutable from the Menu.

## URL flags

| Flag | Effect |
| --- | --- |
| *(none)* | Classic 2D isometric AAA renderer (default) |
| `?3d` | Full 3D world (three.js) |
| `?seed=1234` | Fixed world seed |
| `?debug` | Exposes `window.__ironvale` (test/QA hook) |

## Controls

| Input | Action |
| --- | --- |
| Click the ground (left or right) | Walk |
| Left-click entity | Context menu (Attack / Chop / Mine / Talk / Trade / Smith / Cook) |
| Left-click ground | Walk |
| Left-click inventory item | Quick eat / equip |
| Right-click inventory item | Full item menu (Eat / Equip / Drop) |
| `Esc` | Close menu / dialog / panel |

## Run locally

Any static file server works (the game is pure HTML/CSS/JS, no build step, no dependencies):

```bash
cd ironvale
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to Netlify (free)

The game is 100 % static — Netlify's Git integration auto-deploys on every push.

1. Push this repo to GitHub.
2. At [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → pick the repo.
3. Build command: *(leave empty)* — Publish directory: `/` (the repo root).
4. **Deploy**. Every push to the deploy branch redeploys automatically.

## Push to GitHub

```bash
# 1. create an empty repo on github.com (no README) and note its URL
# 2. from inside the repo folder:
git remote add origin git@github.com:YOUR-USER/ironvale.git
git push -u origin main
```

## Project layout

```
ironvale/
├── index.html          # page + HUD DOM
├── css/style.css       # MMO HUD styling
├── js/
│   ├── core.js         # RNG, noise, worldgen, A* pathfinding, data (pure, no DOM)
│   ├── sprites.js      # procedural pixel-art sprite factory (original art)
│   ├── models.js       # three.js low-poly models for the ?3d renderer
│   ├── game.js         # state & rules: XP, inventory, crafting, quests, save (pure)
│   ├── sfx.js          # WebAudio blips (no assets)
│   └── main.js         # 2D AAA renderer (day/night, water, particles, glows),
│                       #   3D renderer, input, monster AI, UI wiring
└── README.md
```

No runtime dependencies, no build step, no external requests — it works offline once loaded.
