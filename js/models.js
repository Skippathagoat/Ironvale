// Ironvale — models.js
// Procedural 3D asset builders for the three.js renderer.
// Everything is low-poly, stylized and built from primitives — no external assets.
// No DOM access here (textures are DataTexture) so this module is headless-testable.

import * as THREE from 'three';
import { T } from './core.js';

// ---------- helpers ----------

function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- contact-shadow blob (DataTexture — no DOM) ----------

export function makeShadowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half + 0.5) / half, dy = (y - half + 0.5) / half;
      const d = Math.sqrt(dx * dx + dy * dy);
      const a = d < 1 ? Math.pow(1 - d, 2.2) * 150 : 0;
      const i = (y * size + x) * 4;
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  return tex;
}

const shadowTex = makeShadowTexture();
export function makeContactShadow(radius = 0.6, opacity = 0.4) {
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: shadowTex, transparent: true, opacity, depthWrite: false
  }));
  mesh.position.y = 0.03;
  mesh.renderOrder = 1;
  return mesh;
}

// ---------- humanoid (big-headed, classic proportions) ----------
// Returns { group, legL, legR, armL, armR, mats } — limb groups pivot at joints.

export function buildHumanoid(pal, scale = 1) {
  const { hair = '#4a3018', skin = '#e0a878', top = '#3a6ab5', legs = '#7a5230' } = pal;
  const mats = [
    lambert(top), lambert(legs), lambert(skin), lambert(hair),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  ];
  const g = new THREE.Group();

  const legGeo = new THREE.BoxGeometry(0.2, 0.72, 0.22);
  const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.18);

  const mkLimb = (geo, mat, x, pivotY) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, pivotY, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.3;
    mesh.castShadow = true;
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  };

  const legL = mkLimb(legGeo, mats[1], -0.14, 0.72);
  const legR = mkLimb(legGeo, mats[1], 0.14, 0.72);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.3), mats[0]);
  torso.position.y = 1.03; torso.castShadow = true;
  g.add(torso);
  const armL = mkLimb(armGeo, mats[0], -0.38, 1.28);
  const armR = mkLimb(armGeo, mats[0], 0.38, 1.28);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), mats[2]);
  head.position.y = 1.56; head.castShadow = true;
  g.add(head);
  const hairCap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.44), mats[3]);
  hairCap.position.y = 1.75; hairCap.castShadow = true;
  g.add(hairCap);
  // eyes (tiny, front face)
  const eyeGeo = new THREE.BoxGeometry(0.055, 0.055, 0.02);
  const eyeL = new THREE.Mesh(eyeGeo, mats[4]);
  eyeL.position.set(-0.09, 1.58, 0.205);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  g.add(eyeL, eyeR);

  g.scale.setScalar(scale);
  return { group: g, legL, legR, armL, armR, mats };
}

// Walk cycle: scissor legs/arms, returns body-bob offset.
export function animateHumanoid(h, t, moving, speed = 8) {
  const s = moving ? Math.sin(t * speed) : 0;
  h.legL.rotation.x = s * 0.6;
  h.legR.rotation.x = -s * 0.6;
  h.armL.rotation.x = -s * 0.5;
  h.armR.rotation.x = s * 0.5;
  return moving ? Math.abs(Math.cos(t * speed)) * 0.06 : 0;
}

// ---------- monsters ----------

export function buildMonster(type) {
  const g = new THREE.Group();
  const mats = [];
  const addMat = (c) => { const m = lambert(c); mats.push(m); return m; };
  const extra = {};

  if (type === 'rat') {
    const grey = addMat(0x9a8f85), dark = addMat(0x6e655c);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.5), grey);
    body.position.y = 0.22; body.castShadow = true;
    const headM = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.22), grey);
    headM.position.set(0, 0.26, 0.33); headM.castShadow = true;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.34), dark);
    tail.position.set(0, 0.2, -0.4);
    const earGeo = new THREE.BoxGeometry(0.06, 0.08, 0.05);
    const e1 = new THREE.Mesh(earGeo, dark); e1.position.set(-0.07, 0.38, 0.32);
    const e2 = e1.clone(); e2.position.x = 0.07;
    g.add(body, headM, tail, e1, e2);
    extra.tail = tail;
  } else if (type === 'slime') {
    const green = addMat(0x58b04c), dark = addMat(0x1a2a14);
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), green);
    blob.position.y = 0.34; blob.castShadow = true;
    const eyeGeo = new THREE.BoxGeometry(0.07, 0.09, 0.03);
    const e1 = new THREE.Mesh(eyeGeo, dark); e1.position.set(-0.13, 0.42, 0.38);
    const e2 = e1.clone(); e2.position.x = 0.13;
    g.add(blob, e1, e2);
    extra.blob = blob;
  } else if (type === 'wolf') {
    const grey = addMat(0x8a8f96), dark = addMat(0x5c6168);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 1.0), grey);
    body.position.y = 0.62; body.castShadow = true;
    const headM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.42), grey);
    headM.position.set(0, 0.74, 0.64); headM.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.24), dark);
    snout.position.set(0, 0.66, 0.9);
    const earGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);
    const e1 = new THREE.Mesh(earGeo, dark); e1.position.set(-0.1, 0.95, 0.56);
    const e2 = e1.clone(); e2.position.x = 0.1;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), dark);
    tail.position.set(0, 0.72, -0.66);
    const legGeo = new THREE.BoxGeometry(0.13, 0.42, 0.15);
    const legs = [];
    for (const [lx, lz] of [[-0.17, 0.34], [0.17, 0.34], [-0.17, -0.34], [0.17, -0.34]]) {
      const leg = new THREE.Mesh(legGeo, dark);
      leg.position.set(lx, 0.21, lz); leg.castShadow = true;
      g.add(leg); legs.push(leg);
    }
    g.add(body, headM, snout, e1, e2, tail);
    Object.assign(extra, { legs, tail });
  } else if (type === 'bear') {
    const brown = addMat(0x6b4a2c), dark = addMat(0x4a3018);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.66, 1.5), brown);
    body.position.y = 0.82; body.castShadow = true;
    const headM = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.5), brown);
    headM.position.set(0, 1.02, 0.92); headM.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.24), dark);
    snout.position.set(0, 0.92, 1.16);
    const earGeo = new THREE.BoxGeometry(0.12, 0.12, 0.08);
    const e1 = new THREE.Mesh(earGeo, dark); e1.position.set(-0.17, 1.28, 0.88);
    const e2 = e1.clone(); e2.position.x = 0.17;
    const legGeo = new THREE.BoxGeometry(0.26, 0.5, 0.3);
    const legs = [];
    for (const [lx, lz] of [[-0.27, 0.5], [0.27, 0.5], [-0.27, -0.5], [0.27, -0.5]]) {
      const leg = new THREE.Mesh(legGeo, dark);
      leg.position.set(lx, 0.25, lz); leg.castShadow = true;
      g.add(leg); legs.push(leg);
    }
    g.add(body, headM, snout, e1, e2);
    Object.assign(extra, { legs });
  } else if (type === 'troll') {
    const h = buildHumanoid({ hair: '#2a3a2a', skin: '#7a9a5a', top: '#5a5a64', legs: '#4a4a3a' }, 1.35);
    g.add(h.group);
    const club = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.9), addMat(0x5a4020));
    club.position.set(0, -0.55, 0.1);
    h.armR.add(club);
    extra.humanoid = h;
  }

  return { group: g, mats, extra };
}

// ---------- trees (for InstancedMesh) ----------

export function treeGeometries() {
  return {
    oakTrunk: new THREE.CylinderGeometry(0.13, 0.2, 1.15, 6),
    oakCanopy: new THREE.IcosahedronGeometry(0.85, 1),
    pineTrunk: new THREE.CylinderGeometry(0.1, 0.15, 0.7, 6),
    pineCanopy: new THREE.ConeGeometry(0.62, 1.7, 7)
  };
}
export const TREE_Y = { oakTrunk: 0.575, oakCanopy: 1.78, pineTrunk: 0.35, pineCanopy: 1.55 };

// ---------- rocks / ore (for InstancedMesh) ----------

export function rockGeometries() {
  const base = new THREE.IcosahedronGeometry(0.55, 0);
  base.scale(1, 0.75, 1);
  const patch = new THREE.IcosahedronGeometry(0.26, 0);
  patch.scale(1, 0.8, 1);
  return { base, patch };
}
export const ORE_COLORS = {
  [T.COPPER]: 0xc47a3d, [T.TIN]: 0xc9cdd3, [T.IRON]: 0x8f959c, [T.GOLD]: 0xf2d06b
};

// ---------- ground: heights, colors, chunk geometry, height sampling ----------

export const CHUNK = 16;

export const TILE_HEIGHTS = {
  [T.OCEAN]: -0.6, [T.SHALLOW]: -0.25, [T.SAND]: 0.06,
  [T.GRASS]: 0, [T.TALL]: 0, [T.HILLS]: 0.5, [T.MOUNT]: 1.0, [T.SNOW]: 1.3,
  [T.OAK]: 0, [T.PINE]: 0,
  [T.COPPER]: 0, [T.TIN]: 0, [T.IRON]: 0, [T.GOLD]: 0,
  [T.BARE]: 0, [T.STUMP]: 0, [T.ROAD]: 0, [T.PLAZA]: 0
};

export const GROUND3D = {
  [T.OCEAN]: 0x1e3f74, [T.SHALLOW]: 0x2c5c94, [T.SAND]: 0xd8c078,
  [T.GRASS]: 0x57893b, [T.TALL]: 0x4c7c31, [T.HILLS]: 0x8a8f62,
  [T.MOUNT]: 0x99a0a8, [T.SNOW]: 0xe9edf2,
  [T.OAK]: 0x57893b, [T.PINE]: 0x7f8458,
  [T.COPPER]: 0x85897c, [T.TIN]: 0x85897c, [T.IRON]: 0x85897c, [T.GOLD]: 0x9aa0a8,
  [T.BARE]: 0x9a9c92, [T.STUMP]: 0x57893b,
  [T.ROAD]: 0xa09068, [T.PLAZA]: 0xcabb92
};

// One 16x16-tile chunk as a vertex-colored heightfield.
export function buildChunkGeometry(world, bx, by) {
  const size = world.size;
  const geo = new THREE.PlaneGeometry(CHUNK, CHUNK, CHUNK, CHUNK);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const ox = bx * CHUNK + CHUNK / 2, oz = by * CHUNK + CHUNK / 2;
  for (let i = 0; i < pos.count; i++) {
    const wx = ox + pos.getX(i), wz = oz + pos.getZ(i);
    const tx = Math.min(size - 1, Math.max(0, Math.floor(wx)));
    const ty = Math.min(size - 1, Math.max(0, Math.floor(wz)));
    const t = world.terrain[ty * size + tx];
    pos.setY(i, TILE_HEIGHTS[t] || 0);
    col.setHex(GROUND3D[t] || 0x57893b);
    // subtle per-vertex brightness variation — the "texture" of the surface
    const j = 0.93 + ((Math.abs(tx * 7349 + ty * 9151 + tx * ty * 31) % 997) / 997) * 0.14;
    colors[i * 3] = col.r * j;
    colors[i * 3 + 1] = col.g * j;
    colors[i * 3 + 2] = col.b * j;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Bilinear terrain height at world point (px, py) — smooth slopes for entities.
export function tileHeightAt(world, x, y) {
  const size = world.size;
  const x0 = Math.min(size - 1, Math.max(0, Math.floor(x)));
  const y0 = Math.min(size - 1, Math.max(0, Math.floor(y)));
  const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  const H = (tx, ty) => TILE_HEIGHTS[world.terrain[ty * size + tx]] || 0;
  const a = H(x0, y0) * (1 - fx) + H(x1, y0) * fx;
  const b = H(x0, y1) * (1 - fx) + H(x1, y1) * fx;
  return a * (1 - fy) + b * fy;
}

// ---------- static objects (individual meshes) ----------

function pyramidRoof(r, h, color) {
  const geo = new THREE.ConeGeometry(r, h, 4);
  const m = new THREE.Mesh(geo, lambert(color));
  m.rotation.y = Math.PI / 4;
  m.castShadow = true;
  return m;
}

export function buildBuilding(type, wTiles, hTiles) {
  const g = new THREE.Group();
  const w = Math.max(1.6, wTiles - 0.5), h = Math.max(1.4, hTiles - 0.5);
  let wall = 0x8a6a42, roof = 0x5a3a22, wh = 1.7, doors = 1;
  if (type === 'hall') { wall = 0x9a7a4e; roof = 0x7a2a22; wh = 2.1; doors = 3; }
  else if (type === 'shop') { roof = 0x3a5a8a; }
  else if (type === 'smithy') { wall = 0x6a5a48; roof = 0x3a3a40; }

  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wh, h), lambert(wall));
  walls.position.y = wh / 2; walls.castShadow = true; walls.receiveShadow = true;
  g.add(walls);

  const roofM = pyramidRoof(Math.max(w, h) * 0.78, 1.25, roof);
  roofM.position.y = wh + 0.62;
  g.add(roofM);

  // door + windows on the front (+z)
  const doorMat = lambert(0x3a2a1a);
  const winMat = new THREE.MeshLambertMaterial({ color: 0xffd98a, emissive: 0xffb84a, emissiveIntensity: type === 'smithy' ? 0.9 : 0.55 });
  const fz = h / 2 + 0.03;
  for (let i = 0; i < doors; i++) {
    const dx = (i - (doors - 1) / 2) * 0.85;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.9, 0.05), doorMat);
    door.position.set(dx, 0.45, fz);
    g.add(door);
  }
  const winCount = type === 'hall' ? 4 : 2;
  for (let i = 0; i < winCount; i++) {
    const wx = (i - (winCount - 1) / 2) * 1.1;
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.05), winMat);
    win.position.set(wx + (doors > 1 ? 0.42 : 0), wh * 0.62, fz);
    g.add(win);
  }
  return g;
}

export function buildWell() {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.5, 10), lambert(0xa0a0a0));
  stone.position.y = 0.25; stone.castShadow = true;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
  hole.position.y = 0.48;
  g.add(stone, hole);
  const postGeo = new THREE.BoxGeometry(0.09, 0.75, 0.09);
  const p1 = new THREE.Mesh(postGeo, lambert(0x4a3018)); p1.position.set(-0.48, 0.85, 0); p1.castShadow = true;
  const p2 = p1.clone(); p2.position.x = 0.48;
  const roofM = pyramidRoof(0.72, 0.5, 0x5a3a22);
  roofM.position.y = 1.5;
  g.add(p1, p2, roofM);
  return g;
}

export function buildFurnace() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.75), lambert(0x3a3535));
  body.position.y = 0.47; body.castShadow = true;
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xff7722, emissive: 0xff6a10, emissiveIntensity: 1.4 }));
  mouth.position.set(0, 0.42, 0.39);
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), lambert(0x2e2a2a));
  chimney.position.set(-0.22, 1.15, -0.15); chimney.castShadow = true;
  g.add(body, mouth, chimney);
  return g;
}

export function buildPot() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), lambert(0x4a4a52));
  body.scale.set(1, 0.72, 1);
  body.position.y = 0.36; body.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 14), lambert(0x3a3a40));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.62;
  g.add(body, rim);
  return g;
}

export function buildStump() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.35, 8), lambert(0x6b4423));
  trunk.position.y = 0.17; trunk.castShadow = true;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), lambert(0x9a7a4a));
  top.position.y = 0.36;
  g.add(trunk, top);
  return g;
}

export function buildBareRock() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), lambert(0x999999));
  m.scale.set(1, 0.7, 1);
  m.position.y = 0.2; m.castShadow = true;
  g.add(m);
  return g;
}

// ---------- sky ----------

export function buildSky() {
  const geo = new THREE.SphereGeometry(460, 24, 14);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x5f97c4) },
      uBottom: { value: new THREE.Color(0xcfe0ec) }
    },
    vertexShader: `
      varying vec3 vP;
      void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      varying vec3 vP; uniform vec3 uTop; uniform vec3 uBottom;
      void main() {
        float hgt = normalize(vP).y * 0.5 + 0.5;
        vec3 c = mix(uBottom, uTop, smoothstep(0.32, 0.78, hgt));
        gl_FragColor = vec4(c, 1.0);
      }
    `
  });
  return new THREE.Mesh(geo, mat);
}

// ---------- water ----------

export function buildWater(size) {
  const geo = new THREE.PlaneGeometry(size + 240, size + 240, 48, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      cDeep: { value: new THREE.Color(0x1e3f74) },
      cShallow: { value: new THREE.Color(0x3a72ac) },
      cSpark: { value: new THREE.Color(0x9fc4e8) }
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vPz; varying float vW;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.35 + uTime * 1.4) * 0.05 + cos(p.z * 0.28 + uTime * 1.1) * 0.05;
        p.y += w;
        vW = w; vPz = p.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 cDeep; uniform vec3 cShallow; uniform vec3 cSpark; uniform float uTime;
      varying vec2 vPz; varying float vW;
      void main() {
        float m = smoothstep(-0.05, 0.1, vW);
        vec3 c = mix(cDeep, cShallow, m);
        float sp = pow(max(sin(vPz.x * 1.7 + uTime * 2.0) * sin(vPz.y * 1.9 - uTime * 1.6), 0.0), 6.0);
        c += cSpark * sp * 0.3;
        gl_FragColor = vec4(c, 0.94);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.16;
  return mesh;
}

// ---------- flat diamond (hover / target markers) ----------

export function buildDiamond(size = 0.95) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -size);
  shape.lineTo(size * 0.72, 0);
  shape.lineTo(0, size);
  shape.lineTo(-size * 0.72, 0);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(Math.PI / 2);
  return geo;
}
