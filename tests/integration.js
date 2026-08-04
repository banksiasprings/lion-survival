// =====================================================================
//  Survive the Savannah — integration tests
// =====================================================================
// These run INSIDE the live game page, against the real update functions.
// There is no build step and no test runner: load the game, then inject
// this file and call runSavannahTests().
//
//   fetch('tests/integration.js?v='+Date.now()).then(r=>r.text()).then(eval)
//   runSavannahTests()                 // all
//   runSavannahTests('bramble')        // one, by substring
//
// ⚠ THE SHAPE THESE EXIST TO CATCH is the "five fences, twenty damage" bug:
// a mechanic that is correct for ONE instance and silently collapses when
// there are several, because some piece of state that should be per-instance
// is shared. Every test below therefore drives MULTIPLE instances through the
// real per-frame update and asserts the total — never a single-instance
// smoke test, which is exactly what let that bug ship.
//
// ⚠ rAF is dead in a backgrounded tab, so nothing here relies on animate().
// Tests drive update*(dt) directly with a fixed dt and re-pin the player every
// frame (an un-pinned headless player is mid-fall and reads as playerOffGround,
// which silently disables every ground-only attack). See the verify memory.

(function(){
'use strict';

// ---- harness ---------------------------------------------------------
const T = {};
function test(name, fn){ T[name] = fn; }

// Keep a synthetic player alive and ON THE GROUND. `keepHealth:false` when the
// test is measuring damage to the player.
function pinPlayer(keepHealth){
  player.pos.y = terrainY(player.pos.x, player.pos.z) + 0.1;   // updatePlayer's own snap
  player.vel.set(0,0,0);
  player.onGround = true;
  player.inTree = false; player.climbing = false; player.swimming = false;
  player.hunger = 100; player.poisonT = 0;
  if(keepHealth !== false) player.health = 100;
  gameState = 'playing';
}
function clearBrambles(){ kitBrambles.forEach(b=>killObj(b.mesh)); kitBrambles.length = 0; }
function clearWalls(){
  clearKitGates();
  [...wallMeshes].forEach(w=>killObj(w));
  wallMeshes.length = 0; wallAABBs.length = 0; kitWalls.length = 0;
}
// Place a fence/wall at an exact spot by driving the REAL placement function —
// both place 2.5 units in front of the player, so stand 2.5 short and face +Z.
function placeAheadAt(x, z, place){
  const sx = player.pos.x, sz = player.pos.z, sy = yaw;
  player.pos.x = x; player.pos.z = z - 2.5;
  yaw = Math.PI;                       // fwd = (-sin yaw, 0, -cos yaw) = (0,0,1)
  const ok = place();
  player.pos.x = sx; player.pos.z = sz; yaw = sy;
  return ok;
}
const r2 = v => Math.round(v*100)/100;

// =====================================================================
//  FEATURE 1 — bramble fences damage INDEPENDENTLY
// =====================================================================
// The canonical regression. Five fences in a line, walked through once:
// every fence must land its own 20, for 100 total. The pre-fix build scored
// 60 at a walk and 20 at a sprint, because one shared per-victim cooldown
// swallowed fences 2..5.
test('bramble: five fences in a line each deal their own damage', ()=>{
  const detail = {};
  const runs = {};
  for(const [label, speed] of [['walk', 5.6], ['sprint', 16]]){
    clearBrambles();
    brambleCount = 100;
    pinPlayer();
    const x0 = 0, z0 = 0;
    for(let i=0;i<5;i++) placeAheadAt(x0, z0 + i*3.0, placeKitBramble);
    if(kitBrambles.length !== 5) return { pass:false, detail:{ placed:kitBrambles.length } };

    player.pos.set(x0, 0, z0 - 4);
    pinPlayer();
    const hp0 = player.health;
    const dt = 1/60;
    let f = 0;
    while(player.pos.z < z0 + 16 && f < 3000){
      player.pos.z += speed*dt;
      pinPlayer(false);
      updateBrambles(dt);
      f++;
    }
    runs[label] = r2(hp0 - player.health);
  }
  detail.damageByGait = runs;
  detail.expected = 5 * BRAMBLE.DMG;

  // …and one fence must still be worth exactly one fence.
  clearBrambles(); brambleCount = 100; pinPlayer();
  placeAheadAt(0, 0, placeKitBramble);
  player.pos.set(0, 0, -4); pinPlayer();
  let hp0 = player.health;
  for(let f=0; f<400 && player.pos.z < 6; f++){
    player.pos.z += 5.6/60; pinPlayer(false); updateBrambles(1/60);
  }
  detail.singleFence = r2(hp0 - player.health);

  // Damage is per CROSSING, so a victim who parks in the thorns is pricked exactly
  // once — "proximity doesn't chunk a stationary player". The slow is the punishment
  // for standing there.
  clearBrambles(); brambleCount = 100; pinPlayer();
  placeAheadAt(0, 0, placeKitBramble);
  player.pos.set(0, 0, 0); pinPlayer();
  hp0 = player.health;
  for(let f=0; f<300; f++){ pinPlayer(false); updateBrambles(1/60); }   // 5 s parked
  detail.parked5s = r2(hp0 - player.health);

  // …but stepping fully out and back in re-arms it, once RECHARGE has run.
  hp0 = player.health;
  for(let f=0; f<60; f++){ player.pos.z = 9; pinPlayer(false); updateBrambles(1/60); }  // out, 1 s
  for(let f=0; f<10; f++){ player.pos.z = 0; pinPlayer(false); updateBrambles(1/60); }  // back in
  detail.reEntryAfterLeaving = r2(hp0 - player.health);

  clearBrambles();
  const pass = runs.walk === 100 && runs.sprint === 100 &&
               detail.singleFence === 20 && detail.parked5s === 20 &&
               detail.reEntryAfterLeaving === 20;
  return { pass, detail };
});

// The same shape, on the animal side of the prick pass — a lion crossing five
// fences must take five bites, not one.
test('bramble: an animal crossing five fences takes five bites', ()=>{
  clearBrambles(); brambleCount = 100; pinPlayer();
  for(let i=0;i<5;i++) placeAheadAt(60, 60 + i*3.0, placeKitBramble);
  const L = lionMeshes[0];
  if(!L) return { pass:false, detail:'no lion on the map' };
  L.pos.set(60, 0, 60 - 4);
  // ⚠ Accumulate the damage and top the lion back up every frame instead of reading
  // its end HP: a lion carries 58 and five fences are 100, so it DIES after three and
  // the raw before/after read scores a correct build as 60. (That is what this
  // assertion looked like on the first run — a test bug that mimics the real bug.)
  const dt = 1/60;
  let dealt = 0, bites = 0;
  for(let f=0; f<3000 && L.pos.z < 60 + 16; f++){
    L.pos.z += 5.6*dt;
    L.pos.y = terrainY(L.pos.x, L.pos.z);
    pinPlayer();
    const before = L.health;
    updateBrambles(dt);
    if(L.health < before){ dealt += before - L.health; bites++; }
    L.health = L.maxHealth;
  }
  clearBrambles();
  return { pass: r2(dealt) === 5*BRAMBLE.DMG && bites === 5,
           detail:{ lionDamage:r2(dealt), separateBites:bites, expected:5*BRAMBLE.DMG } };
});

// =====================================================================
//  FEATURE 2 — the world wall cap is 100, and the 101st is refused for free
// =====================================================================
test('walls: 100 place, the 101st is refused and charges nothing', ()=>{
  clearWalls();
  pinPlayer();
  woodCount = 5000; rockCount = 5000;
  const detail = { cap: KIT_WALL_MAX };
  // Place the full cap on a wide grid so nothing overlaps or stacks.
  let placed = 0;
  for(let i=0; i<KIT_WALL_MAX; i++){
    const gx = (i % 10) * 6 - 30, gz = Math.floor(i/10) * 6 - 30;
    if(placeAheadAt(gx, gz, ()=>placeKitWall(false))) placed++;
  }
  detail.placed = placed;
  detail.kitWalls = kitWalls.length;
  detail.wallMeshes = wallMeshes.length;
  detail.wallAABBs = wallAABBs.length;

  // …and the one past the cap.
  const woodBefore = woodCount;
  const over = placeAheadAt(80, 80, ()=>placeKitWall(false));
  detail.overflowReturned = over;
  detail.woodCharged = woodBefore - woodCount;
  detail.afterOverflow = kitWalls.length;

  // Stone shares the same pool — the cap is a WORLD cap, not a per-material one.
  const stoneOver = placeAheadAt(84, 84, ()=>placeKitWall(true));
  detail.stoneAlsoRefused = (stoneOver === false);

  // Wall meshes must stay in lockstep with their AABBs at the cap, or collision
  // silently drifts from what you can see. (The multi-instance assertion: this is
  // the bug shape where a mechanic is right for one and wrong for a hundred.)
  detail.lockstep = (wallMeshes.length === wallAABBs.length &&
                     kitWalls.length === KIT_WALL_MAX);

  const pass = placed === KIT_WALL_MAX &&
               kitWalls.length === KIT_WALL_MAX &&
               over === false && detail.woodCharged === 0 &&
               detail.stoneAlsoRefused && detail.lockstep;
  clearWalls();
  return { pass, detail };
});

// The shop copy must not be able to drift from the constant again.
test('walls: shop cards quote the live cap', ()=>{
  const wall  = SHOP_BY_ID['kit_wall'].desc;
  const stone = SHOP_BY_ID['kit_stonewall'].desc;
  const gate  = SHOP_BY_ID['kit_gate'].desc;
  const detail = {
    wallQuotesCap:  wall.indexOf(String(KIT_WALL_MAX)) >= 0,
    stoneQuotesCap: stone.indexOf(String(KIT_WALL_MAX)) >= 0,
    gateQuotesCap:  gate.indexOf(String(KIT_GATE_MAX)) >= 0,
    staleFifty: /\b50[- ]wall|up to 50\b/.test(wall + stone),
  };
  return { pass: detail.wallQuotesCap && detail.stoneQuotesCap &&
                 detail.gateQuotesCap && !detail.staleFifty, detail };
});

// =====================================================================
//  FEATURE 3 — every creature drops its OWN coloured, species-named remains
// =====================================================================
// The multi-instance assertion: kill several DIFFERENT species in the same frame and
// require N distinct drops with N distinct labels. A build where the drop table were
// shared, cached or last-write-wins passes a one-species test and fails this.
test('bones: killing several species leaves several distinct named drops', ()=>{
  clearBoneDrops(); boneCounts = {};
  pinPlayer();
  const detail = {};

  // Real deaths through the real dead-loops, not dropBone() called by hand.
  const victims = [];
  const L = lionMeshes[0];
  const D = dogMeshes[0];
  const P = preyMeshes.find(p=>p.species && BONE_KINDS[p.species]);
  const C = cheetahMeshes[0];
  if(!L || !D || !P || !C) return { pass:false, detail:'need a lion, dog, prey and cheetah alive' };
  victims.push(['lion', L], ['wilddog', D], [P.species, P], ['cheetah', C]);
  for(const [,o] of victims) o.health = 0;

  updateLions(0.05); updateWildDogs(0.05); updatePrey(0.05); updateCheetahs(0.05);

  const got = boneDrops.map(d=>d.key);
  detail.expectedKeys = victims.map(v=>v[0]).sort();
  detail.droppedKeys  = [...got].sort();
  detail.labels       = boneDrops.map(d=>d.label);
  detail.distinctMeshes = new Set(boneDrops.map(d=>d.mesh.uuid)).size;

  // Every drop must be its OWN mesh with its OWN material instance — a shared material
  // would mean disposing one drop yanks the colour out from under the others.
  const mats = boneDrops.map(d=>{ let m=null; d.mesh.traverse(o=>{ if(o.isMesh && !m) m=o.material; }); return m; });
  detail.distinctMaterials = new Set(mats.map(m=>m && m.uuid)).size;
  detail.colours = boneDrops.map((d,i)=>({ key:d.key, hex:'0x'+mats[i].color.getHexString(),
                                           want:'0x'+new THREE.Color(BONE_KINDS[d.key].colour).getHexString() }));
  detail.coloursCorrect = detail.colours.every(c=>c.hex === c.want);

  const pass = detail.droppedKeys.join(',') === detail.expectedKeys.join(',') &&
               detail.distinctMeshes === victims.length &&
               detail.distinctMaterials === victims.length &&
               detail.coloursCorrect;
  clearBoneDrops();
  return { pass, detail };
});

// Steven called this one out by name.
test('bones: the green cobra drops a GREEN fang, other morphs a tan one', ()=>{
  const fake = id => ({ v: SNAKE_VARIANTS.cobra, colour: COBRA_COLORS.find(c=>c.id===id) });
  const detail = {
    acid:     snakeBoneKey(fake('acid')),
    midnight: snakeBoneKey(fake('midnight')),
    gold:     snakeBoneKey(fake('gold')),
    python:   snakeBoneKey({ v: SNAKE_VARIANTS.python }),
    worm:     snakeBoneKey({ v: SNAKE_VARIANTS.worm }),
  };
  detail.greenLabel  = BONE_KINDS[detail.acid].label;
  detail.greenColour = '0x'+new THREE.Color(BONE_KINDS.cobra_green.colour).getHexString();
  detail.tanLabel    = BONE_KINDS[detail.midnight].label;
  // green must actually BE green: dominant channel is G, and clearly so
  const g = new THREE.Color(BONE_KINDS.cobra_green.colour);
  detail.isActuallyGreen = g.g > g.r && g.g > g.b;
  const pass = detail.acid === 'cobra_green' && detail.midnight === 'cobra' &&
               detail.python === 'python' && detail.worm === 'worm' &&
               detail.greenLabel === 'green cobra fang' && detail.isActuallyGreen;
  return { pass, detail };
});

// Pickup tallies per species, disposes the mesh, and the world cap frees the OLDEST
// rather than growing without bound (the ecosystem kills far more than the player does).
test('bones: pickup tallies + disposes, and the world cap evicts the oldest', ()=>{
  clearBoneDrops(); boneCounts = {};
  pinPlayer();
  const detail = {};
  const px = player.pos.x, pz = player.pos.z;

  dropBone('lion', new THREE.Vector3(px+1, 0, pz));
  dropBone('lion', new THREE.Vector3(px+1.4, 0, pz));
  dropBone('crocodile', new THREE.Vector3(px+1.8, 0, pz));
  const sceneBefore = scene.children.length;
  detail.tookA = pickUpBone(); detail.tookB = pickUpBone(); detail.tookC = pickUpBone();
  detail.tookD = pickUpBone();                       // nothing left in reach
  detail.counts = JSON.parse(JSON.stringify(boneCounts));
  detail.dropsLeft = boneDrops.length;
  detail.sceneFreed = sceneBefore - scene.children.length;   // 3 groups removed
  detail.tally = boneTally();
  detail.total = totalBones();

  // Cap: push well past BONE.MAX and require the array to hold exactly the cap, with
  // every evicted mesh detached from the scene (not merely dropped from the array).
  clearBoneDrops();
  const sceneAtCapStart = scene.children.length;
  const first = dropBone('lion', new THREE.Vector3(200, 0, 200));
  for(let i=0;i<BONE.MAX + 15;i++) dropBone('zebra', new THREE.Vector3(200+i*0.5, 0, 210));
  detail.cap = BONE.MAX;
  detail.heldAtCap = boneDrops.length;
  detail.oldestEvicted = boneDrops.indexOf(first) < 0;
  detail.oldestDetached = !first.mesh.parent;
  detail.sceneDelta = scene.children.length - sceneAtCapStart;   // == BONE.MAX

  const pass = detail.tookA && detail.tookB && detail.tookC && !detail.tookD &&
               detail.counts.lion === 2 && detail.counts.crocodile === 1 &&
               detail.total === 3 && detail.dropsLeft === 0 && detail.sceneFreed === 3 &&
               detail.heldAtCap === BONE.MAX && detail.oldestEvicted &&
               detail.oldestDetached && detail.sceneDelta === BONE.MAX;
  clearBoneDrops(); boneCounts = {};
  return { pass, detail };
});

// =====================================================================
//  runner
// =====================================================================
window.SAVANNAH_TESTS = T;
window.runSavannahTests = function(only){
  const names = Object.keys(T).filter(n => !only || n.indexOf(only) >= 0);
  const results = [];
  for(const n of names){
    let r;
    try { r = T[n](); }
    catch(e){ r = { pass:false, detail:'THREW: '+(e && e.message) + ' @ ' + (e && e.stack||'').split('\n')[1] }; }
    results.push({ name:n, pass:!!r.pass, detail:r.detail });
  }
  const failed = results.filter(r=>!r.pass);
  return { ran:results.length, passed:results.length-failed.length, failed:failed.length, results };
};
return 'savannah tests loaded: ' + Object.keys(T).length;
})();
