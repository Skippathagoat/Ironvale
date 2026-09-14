# Ironvale

An **original** 3D MMORPG that runs entirely in the browser — in the spirit of the classic old-school MMOs. A huge procedurally generated island (640 × 640 tiles ≈ 409,600 tiles), a town, monsters, quests, shops, and a full gather → craft → fight → level progression loop.

> Ironvale is an original project. All art is generated procedurally in code at load time (zero binary asset files), all names, world and story are original. It is inspired by the *playstyle* of classic isometric MMORPGs, not by any specific one's assets.

## Features

- **Huge world**: 640×640-tile procedurally generated island (deterministic per seed) with biomes — beaches, grasslands, forests, hills, mountains and snow peaks — plus the town of **Oldgate** with buildings, roads and a plaza.
- **Click-to-move** (left or right click on the ground), A* pathfinding, smooth third-person camera.
- **Graphics**: real-time 3D (three.js) — vertex-colored heightfield terrain in lazy-loaded chunks, instanced low-poly trees & ore rocks, dynamic sun with soft shadows, distance fog, animated water, glowing furnace, walking animations. If WebGL is unavailable (or the URL has `?nogl`) it automatically falls back to the classic 2D isometric renderer.
- **7 skills with XP & levels**: Attack, Strength, Defence, Woodcutting, Mining, Smithing, Cooking — classic skill bars with level-ups.
- **Combat**: melee with 5 monster types (rats, slimes, wolves, bears, rock trolls), hit/miss rolls, damage numbers, monster AI (wander / chase / attack / return), respawns.
- **Gathering**: chop oak & pine trees, mine copper / tin / iron / gold (higher ores need higher levels); nodes deplete and regrow.
- **Crafting**: smelt bars and forge swords, helms and platebody at Torin's furnace; cook raw meat at the village pot.
- **Economy**: coins, Greta's shop (buy & sell).
- **Quests**: 3 quests with dialogue, objectives, rewards and a title.
- **UI**: inventory (28 slots) + equipment (helm/chest/legs/boots/weapon), tooltips, context menus, action bar, minimap with viewport, chat log, death & respawn.
- **Persistence**: autosaves to `localStorage` every 20 s; Continue from the title screen.
- **Sound**: tiny synthesized WebAudio SFX (no audio files), mutable from the Menu.

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

## Deploy to Northflank

The repo ships with a `Dockerfile` (nginx serving the static game, port 80) and an optional `northflank.json` IaC file.

**Option A — from GitHub (recommended):**

1. Push this repo to GitHub (see below).
2. In Northflank: **New project → Deploy from Git** → pick your repo and branch.
3. Under **Build options**, select **Dockerfile** (path `/Dockerfile`).
4. Under **Networking/Ports**: Northflank auto-detects port **80 (HTTP)** from the Dockerfile — enable it as **public**. (Or add it manually: port 80, protocol HTTP, public = on.)
5. Click **Create Service**. You get a public URL like `http--ironvale--xxxx.code.run` (free TLS on 443). Every push to the branch redeploys automatically.

**Option B — Northflank CLI:**

```bash
npm i -g @northflank/cli
northflank login
northflank create project ironvale --region europe-west
northflank create service ironvale/web \
  --git-url https://github.com/you/ironvale \
  --branch main \
  --port 80
```

**Option C — raw Docker:**

```bash
docker build -t ironvale .
docker run -d -p 8080:80 ironvale   # → http://localhost:8080
```

## Push to GitHub

This directory is already a git repository with an initial commit. To host it on GitHub:

```bash
# 1. create an empty repo on github.com (no README) and note its URL
# 2. from inside the repo folder:
git remote add origin git@github.com:YOUR-USER/ironvale.git
git push -u origin main
```

If you use HTTPS instead of SSH:

```bash
git remote add origin https://github.com/YOUR-USER/ironvale.git
git push -u origin main
```

> The initial commit was made with a placeholder git identity. If you want your name on it:
> `git config user.name "You" && git config user.email "you@example.com" && git commit --amend --reset-author --no-edit`

## Project layout

```
ironvale/
├── index.html          # page + HUD DOM
├── css/style.css       # retro MMO HUD styling
├── js/
│   ├── core.js         # RNG, noise, worldgen, A* pathfinding, data (pure, no DOM)
│   ├── sprites.js      # procedural pixel-art sprite factory (original art)
│   ├── game.js         # state & rules: XP, inventory, crafting, quests, save (pure)
│   ├── sfx.js          # WebAudio blips (no assets)
│   └── main.js         # renderer, input, monster AI, UI wiring
├── Dockerfile          # nginx:alpine static server (port 80)
├── nginx.conf
├── northflank.json     # optional IaC (replace the repo URL)
└── README.md
```

No runtime dependencies, no build step, no external requests — it works offline once loaded.
