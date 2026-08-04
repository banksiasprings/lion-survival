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
  // ⚠ Snapshot each victim's death SITE before killing it. See the attribution note below —
  // this is the only thing that tells our four corpses apart from a bystander's.
  const sites = victims.map(([key,o])=>({ key, x:o.pos.x, z:o.pos.z }));
  for(const [,o] of victims) o.health = 0;

  updateLions(0.05); updateWildDogs(0.05); updatePrey(0.05); updateCheetahs(0.05);

  // ⚠ ATTRIBUTE DROPS TO OUR VICTIMS — do NOT assert on all of boneDrops.
  // These are WORLD-WIDE update functions and the ecosystem is live: a fifth creature (in
  // practice a wild dog already worn down by the bramble tests above) can legitimately die
  // inside this very frame and add its own drop. Asserting on the whole array made this test
  // fail ~2 runs in 3 — 13/13, 12/13, 12/13 on three consecutive runs of one page — for a
  // bone system that was entirely correct.
  // ⚠ Match on species + NEAREST death site, not on an exact position. The update runs the
  // animal's movement before it processes the death, so the corpse has already drifted from
  // where we snapshotted it — measured at up to 0.70 units in one 0.05 s frame, which an
  // exact-match version of this got wrong and scored every real drop as a bystander. The four
  // victims are tens of units apart, so a 3.0 tolerance separates them from each other and
  // from a same-species bystander with room to spare.
  const NEAR = 3.0, claimed = new Set(), mine = [];
  for(const s of sites){
    let best = -1, bestD = NEAR;
    for(let i=0; i<boneDrops.length; i++){
      if(claimed.has(i) || boneDrops[i].key !== s.key) continue;
      const d = Math.hypot(boneDrops[i].pos.x - s.x, boneDrops[i].pos.z - s.z);
      if(d < bestD){ bestD = d; best = i; }
    }
    if(best >= 0){ claimed.add(best); mine.push(boneDrops[best]); }
  }
  const bystanders = boneDrops.filter((d,i)=>!claimed.has(i));

  detail.expectedKeys = victims.map(v=>v[0]).sort();
  detail.droppedKeys  = mine.map(d=>d.key).sort();
  detail.labels       = mine.map(d=>d.label);
  detail.distinctMeshes = new Set(mine.map(d=>d.mesh.uuid)).size;
  // Surfaced, never silently swallowed: if the world killed something else mid-frame we
  // want to SEE it in the detail, we just don't want it failing the assertion.
  detail.bystanderDrops = bystanders.map(d=>d.key);

  // Every drop must be its OWN mesh with its OWN material instance — a shared material
  // would mean disposing one drop yanks the colour out from under the others.
  const mats = mine.map(d=>{ let m=null; d.mesh.traverse(o=>{ if(o.isMesh && !m) m=o.material; }); return m; });
  detail.distinctMaterials = new Set(mats.map(m=>m && m.uuid)).size;
  detail.colours = mine.map((d,i)=>({ key:d.key, hex:'0x'+mats[i].color.getHexString(),
                                      want:'0x'+new THREE.Color(BONE_KINDS[d.key].colour).getHexString() }));
  detail.coloursCorrect = detail.colours.every(c=>c.hex === c.want);

  const pass = mine.length === victims.length &&
               detail.droppedKeys.join(',') === detail.expectedKeys.join(',') &&
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
//  FEATURE 4 — the crested porcupine ("spike-back")
// =====================================================================
function clearPorcs(){ [...porcupineMeshes].forEach(P=>killObj(P.mesh)); porcupineMeshes.length = 0; }
function spawnPorcAt(x,z){ const P = makePorcupine(x,z); P.pos.set(x, terrainY(x,z), z);
                           P.mesh.position.copy(P.pos); return P; }

// THE MULTI-INSTANCE ASSERTION for this feature: provoke ONE of five and the other four
// must stay asleep. A build that hung aggro on a module-level flag (the way the wild dog
// vendetta legitimately does) passes a one-porcupine test and fails this one.
test('porcupine: provoking one does not wake the other four', ()=>{
  clearPorcs(); pinPlayer();
  const ps = [];
  for(let i=0;i<5;i++) ps.push(spawnPorcAt(player.pos.x + 6 + i*4, player.pos.z));
  // everything is passive to start with
  for(let f=0; f<120; f++){ pinPlayer(); updatePorcupines(1/60); }
  const detail = { statesBefore: ps.map(p=>p.state), playerDamageWhilePassive: 100 - player.health };

  // hit exactly one, through the real weapon path
  ps[2].health -= 5; ps[2].lastHitBy = player; ps[2].lastHitKind = 'player';
  for(let f=0; f<30; f++){ pinPlayer(false); updatePorcupines(1/60); }
  detail.statesAfter = ps.map(p=>p.state);
  detail.bristleFlare = ps.map(p=>+p.bristle.toFixed(2));
  detail.onlyOneBristled = ps.filter(p=>p.state==='BRISTLE').length === 1 &&
                           ps[2].state === 'BRISTLE';
  // …and the quills of the provoked one actually moved, while a calm one's did not
  detail.provokedQuillsUp = ps[2].bristle > 0.9;
  detail.calmQuillsDown   = ps[0].bristle < 0.05;

  // per-porcupine spike cooldowns are independent too
  detail.independentCooldowns = ps.every((p,i)=> i===2 ? true : p.spikeCds.size === 0);

  const pass = detail.statesBefore.every(s=>s==='FORAGE') &&
               detail.playerDamageWhilePassive === 0 &&
               detail.onlyOneBristled && detail.provokedQuillsUp &&
               detail.calmQuillsDown && detail.independentCooldowns;
  clearPorcs();
  return { pass, detail };
});

// Passive by default, and the spikes are inert until provoked.
test('porcupine: passive until attacked, then spikes on contact', ()=>{
  clearPorcs(); pinPlayer();
  const detail = {};
  // Stand ON one for 3 s while it is calm — it must never touch the player.
  const P = spawnPorcAt(player.pos.x + 1.0, player.pos.z);
  for(let f=0; f<180; f++){ pinPlayer(false); updatePorcupines(1/60); }
  detail.damageWhileCalm = 100 - player.health;
  detail.stateWhileCalm = P.state;

  // ⚠ It has been FORAGING for those 3 s, so it has ambled off — put it back within
  // arm's reach before swinging, or we are only measuring how long it takes to walk
  // back. (First run of this test failed for exactly that reason.)
  P.pos.set(player.pos.x + 1.0, terrainY(player.pos.x+1.0, player.pos.z), player.pos.z);
  P.mesh.position.copy(P.pos);
  player.health = 100;
  dealKitMelee({ kind:'porcupine', o:P }, 10, MELEE_TOOL.hammer);
  detail.porcHpAfterMelee = P.health;
  detail.bristledOnMelee = P.state === 'BRISTLE';
  for(let f=0; f<6; f++){ pinPlayer(false); updatePorcupines(1/60); }
  detail.spikeDamageBack = 100 - player.health;

  // …and it is on a per-victim cooldown, not a per-frame shredder.
  const afterFirst = player.health;
  for(let f=0; f<12; f++){ pinPlayer(false); updatePorcupines(1/60); }   // 0.2 s
  detail.noDoubleDipInsideCooldown = (afterFirst - player.health) === 0;
  // …but it does come round again once the cooldown expires
  for(let f=0; f<70; f++){ pinPlayer(false); updatePorcupines(1/60); }   // past SPIKE_CD
  detail.spikesAgainAfterCooldown = (afterFirst - player.health) === PORC.SPIKE_DMG;

  const pass = detail.damageWhileCalm === 0 && detail.stateWhileCalm === 'FORAGE' &&
               detail.porcHpAfterMelee === PORC.HEALTH - 10 && detail.bristledOnMelee &&
               detail.spikeDamageBack === PORC.SPIKE_DMG &&
               detail.noDoubleDipInsideCooldown && detail.spikesAgainAfterCooldown;
  clearPorcs();
  return { pass, detail };
});

// "When hit, runs backwards into the attacker."
test('porcupine: back-charges rump-first, and flees when nearly dead', ()=>{
  clearPorcs(); pinPlayer();
  const detail = {};
  const P = spawnPorcAt(player.pos.x + 14, player.pos.z);
  P.health -= 5; P.lastHitBy = player; P.lastHitKind = 'player';
  const d0 = Math.hypot(P.pos.x-player.pos.x, P.pos.z-player.pos.z);
  let facingAwaySamples = 0, moved = 0, settledAway = 0, settled = 0;
  for(let f=0; f<90; f++){
    pinPlayer(false);
    const bx=P.pos.x, bz=P.pos.z;
    updatePorcupines(1/60);
    const step = Math.hypot(P.pos.x-bx, P.pos.z-bz);
    if(step > 1e-4){
      moved++;
      // travelling toward the player…
      const tvx=(P.pos.x-bx)/step, tvz=(P.pos.z-bz)/step;
      // …while the body points the other way (heading is the +Z-forward yaw convention)
      const fx=Math.sin(P.heading), fz=Math.cos(P.heading);
      const away = (tvx*fx + tvz*fz) < 0;
      if(away) facingAwaySamples++;
      // ⚠ Assert on the STEADY state, not the whole charge. The heading lerps at 4/s,
      // so it spends the first ~0.25 s physically turning round and is legitimately not
      // rump-first yet. Counting those frames caps a correct build at ~89%.
      if(f >= 20){ settled++; if(away) settledAway++; }
    }
  }
  const d1 = Math.hypot(P.pos.x-player.pos.x, P.pos.z-player.pos.z);
  detail.closedFrom = r2(d0); detail.closedTo = r2(d1);
  detail.movedFrames = moved;
  detail.rumpFirstPct = moved ? Math.round(facingAwaySamples/moved*100) : 0;
  detail.rumpFirstPctAfterTurn = settled ? Math.round(settledAway/settled*100) : 0;
  detail.chargeSpeedUnderSprint = PORC.SPEED_CHARGE < 16;   // walking away must always work

  // low HP → it breaks off
  P.health = PORC.HEALTH * 0.2;
  for(let f=0; f<40; f++){ pinPlayer(false); updatePorcupines(1/60); }
  detail.stateWhenNearlyDead = P.state;
  const dFlee = Math.hypot(P.pos.x-player.pos.x, P.pos.z-player.pos.z);
  detail.fledAway = dFlee > d1;

  const pass = d1 < d0 - 4 && detail.rumpFirstPctAfterTurn === 100 &&
               detail.chargeSpeedUnderSprint &&
               detail.stateWhenNearlyDead === 'FLEE' && detail.fledAway;
  clearPorcs();
  return { pass, detail };
});

// Every player weapon must reach it. A missing branch here is what made the crocodile
// and the cheetah invulnerable for weeks — silently, with no error.
test('porcupine: is not immune to any weapon', ()=>{
  clearPorcs(); pinPlayer();
  const hits = {};
  const tryHit = (name, fn)=>{
    clearPorcs();
    const P = spawnPorcAt(player.pos.x + 3, player.pos.z);
    const before = P.health;
    fn(P);
    hits[name] = r2(before - P.health);
  };
  tryHit('hammer', P=>dealKitMelee({kind:'porcupine',o:P}, 67, MELEE_TOOL.hammer));
  tryHit('axe',    P=>dealKitMelee({kind:'porcupine',o:P}, 42, MELEE_TOOL.axe));
  tryHit('boomerang', P=>boomerangStrike('porcupine', P));
  // projectiles go through the real updateThrownRocks path
  const proj = (opts, name)=> tryHit(name, P=>{
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1,4,3), new THREE.MeshBasicMaterial());
    m.position.set(P.pos.x, P.pos.y + 0.5, P.pos.z); scene.add(m);
    thrownRocks.push(Object.assign({ mesh:m, vel:new THREE.Vector3(0,0,0.01), dist:0, mult:1 }, opts));
    updateThrownRocks(1/60);
  });
  proj({ spear:true }, 'spear');
  proj({ crossbow:true }, 'bolt');
  proj({}, 'rock');
  // the aim scan must also find it, or melee never targets it in the first place
  clearPorcs();
  const P = spawnPorcAt(player.pos.x + 2, player.pos.z);
  camera.position.set(player.pos.x, player.pos.y+1.7, player.pos.z);
  camera.lookAt(P.pos.x, P.pos.y+0.5, P.pos.z);
  const aim = nearestAnimalInFront(26, 0.5);
  const detail = { damageByWeapon:hits, aimFindsIt: !!(aim && aim.kind==='porcupine') };
  const pass = Object.values(hits).every(v=>v > 0) && detail.aimFindsIt;
  clearPorcs(); thrownRocks.length = 0;
  return { pass, detail };
});

// =====================================================================
//  FEATURE 5 — the crocodile hauls you to the bottom of the pond
// =====================================================================
// Multi-origin, because the pre-fix bug was invisible from the one origin anybody
// would test from: grabbed while ALREADY swimming it looked fine, and grabbed on
// the bank (the lunge case) it held you on dry land with full oxygen forever.
// Every origin below must end with the player submerged and near the bed.
test('crocodile: hauls you into deep water and onto the bed, from any grab origin', ()=>{
  const C = crocMeshes[0];
  if(!C) return { pass:false, detail:'no crocodile on the map' };
  const w = C.pool, surf = poolSurfaceY(w);
  const origins = [
    ['on the bank (lunge grab)', w.x + w.r + 1.5, w.z],
    ['in the shallows',          w.x + w.r*0.85,  w.z],
    ['already in deep water',    w.x + 1.0,       w.z],
  ];
  const rows = [];
  for(const [label, ox, oz] of origins){
    if(crocGrab.croc) crocEndGrab(false);
    crocGrab.graceT = 0; C.grabCd = 0; C.health = C.maxHealth;
    C.pos.set(ox, terrainY(ox,oz), oz); C.mesh.position.copy(C.pos);
    player.pos.set(ox+0.5, terrainY(ox+0.5,oz)+0.1, oz);
    player.vel.set(0,0,0); player.onGround = true;
    player.health = 100; player.hunger = 100; player.oxygen = 100;
    gameState = 'playing';
    crocBeginGrab(C);
    const startDist = Math.hypot(player.pos.x-w.x, player.pos.z-w.z);
    // ⚠ 10 s, not 5. From the bank it must first be REVERSED into the water before a
    // single point of oxygen can burn — at 5 s the bank case still had 62 left, which
    // is correct behaviour and a wrong assertion.
    for(let f=0; f<600; f++){
      player.hunger = 100; player.health = 100; gameState = 'playing';
      updateCrocGrab(1/60); updateOxygen(1/60);
    }
    const bed = terrainY(player.pos.x, player.pos.z);
    const headY = player.pos.y + PLAYER.eyeHeight;
    rows.push({
      origin: label,
      startDistFromCentre: r2(startDist),
      endDistFromCentre:   r2(Math.hypot(player.pos.x-w.x, player.pos.z-w.z)),
      inWater: !!poolAt(player.pos.x, player.pos.z),
      headSubmerged: inWaterAt(player.pos.x, player.pos.z, headY),
      heightAboveBed: r2(player.pos.y - bed),
      depthBelowSurface: r2(surf - player.pos.y),
      oxygen: r2(player.oxygen),
    });
  }
  crocEndGrab(false);
  const detail = { rows, haulDepth: CROC.HAUL_DEPTH, haulClear: CROC.HAUL_CLEAR };
  const pass = rows.every(r =>
    r.inWater && r.headSubmerged &&
    r.heightAboveBed <= CROC.HAUL_CLEAR + 0.05 && r.heightAboveBed > 0 &&
    // the player's XZ lerps toward the croc's and never exactly arrives, so the bed
    // under them reads a few cm shallower than the bed under the croc
    r.depthBelowSurface >= CROC.HAUL_DEPTH - CROC.HAUL_CLEAR - 0.2 &&
    r.oxygen === 0);                                 // 2.5x drain empties ~11 s of breath
  return { pass, detail };
});

// The counterplay and the lethality both have to survive the haul.
test('crocodile: you can still mash free, and you drown if you do not', ()=>{
  const C = crocMeshes[0];
  if(!C) return { pass:false, detail:'no crocodile on the map' };
  const w = C.pool;
  const stage = ()=>{
    if(crocGrab.croc) crocEndGrab(false);
    crocGrab.graceT = 0; C.grabCd = 0; C.health = C.maxHealth;
    C.pos.set(w.x+1, terrainY(w.x+1,w.z), w.z); C.mesh.position.copy(C.pos);
    player.pos.set(w.x+1.4, terrainY(w.x+1.4,w.z), w.z);
    player.health = 100; player.hunger = 100; player.oxygen = 100;
    gameState = 'playing'; crocBeginGrab(C);
  };
  const detail = {};
  // 1) a real 10/s mash frees you
  stage();
  let f = 0;
  while(playerGrabbed() && f < 600){
    player.hunger=100; gameState='playing';
    if(f % 6 === 0) crocTapEscape();               // 10 taps/sec
    updateCrocGrab(1/60); updateOxygen(1/60); f++;
  }
  detail.mashedFreeAfterSec = r2(f/60);
  detail.mashWorked = !playerGrabbed() && f < 600;
  detail.graceGranted = crocGrab.graceT > 0;

  // 2) …but lazy tapping never does, and you drown instead.
  // ⚠ "still grabbed at the end" is NOT the assertion: updateCrocGrab releases you when
  // your health hits 0, so a player who drowned reads as freed. Assert on the OUTCOME —
  // did the meter ever reach the break threshold, and did you die.
  stage();
  let g = 0, drowned = false, peakTaps = 0;
  while(g < 900){                                   // 15 s
    player.hunger=100; gameState='playing';
    if(g % 60 === 0) crocTapEscape();               // 1 tap/sec — far under TAP_DECAY
    peakTaps = Math.max(peakTaps, crocGrab.taps);
    updateCrocGrab(1/60); updateOxygen(1/60);
    if(player.oxygen <= 0 && player.health < 100) drowned = true;
    if(player.health <= 0) break;
    g++;
  }
  detail.lazyTapPeakMeter = r2(peakTaps);            // never gets near BREAK_TAPS
  detail.lazyTapsFreed = peakTaps >= CROC.BREAK_TAPS;
  detail.drownedWhileHeld = drowned;
  detail.diedInTheJaws = player.health <= 0;
  detail.oxygenAtEnd = r2(player.oxygen);
  detail.hpAtEnd = r2(player.health);

  // 3) killing it releases you
  stage();
  C.health = 0;
  updateCrocGrab(1/60);
  detail.deadCrocReleases = !playerGrabbed();

  if(crocGrab.croc) crocEndGrab(false);
  crocGrab.graceT = 0;
  player.health = 100; player.oxygen = 100;
  const pass = detail.mashWorked && detail.graceGranted && !detail.lazyTapsFreed &&
               detail.drownedWhileHeld && detail.diedInTheJaws && detail.deadCrocReleases;
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
