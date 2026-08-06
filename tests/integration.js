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
  // ⚠ 2026-08-05: the lion's drop is now SPLIT — a tooth if you killed it, a claw if
  // anything else did (see the lion_claw note in BONE_KINDS). This test kills it by hand,
  // so it must say who did it or the expected key is wrong.
  L.lastHitKind = 'player';
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

// Steven called the green cobra out by name, and the 2026-08-05 loot revision added the
// "skin AND spine" rule — so this now asserts BOTH: the right skin per morph, and that a
// serpent leaves two drops while a worm leaves only slime.
test('loot: serpents drop skin AND spine (green cobra green), worms drop slime only', ()=>{
  const fake = id => ({ v: SNAKE_VARIANTS.cobra, colour: COBRA_COLORS.find(c=>c.id===id) });
  const detail = {
    acid:     snakeBoneKey(fake('acid')),
    midnight: snakeBoneKey(fake('midnight')),
    gold:     snakeBoneKey(fake('gold')),
    python:   snakeBoneKey({ v: SNAKE_VARIANTS.python }),
    worm:     snakeBoneKey({ v: SNAKE_VARIANTS.worm }),
  };
  detail.acidLoot   = snakeLootKeys(fake('acid'));
  detail.pythonLoot = snakeLootKeys({ v: SNAKE_VARIANTS.python });
  detail.wormLoot   = snakeLootKeys({ v: SNAKE_VARIANTS.worm });
  detail.greenLabel = BONE_KINDS[detail.acid].label;
  detail.tanLabel   = BONE_KINDS[detail.midnight].label;
  detail.spineLabel = BONE_KINDS.serpent_spine.label;
  detail.wormLabel  = BONE_KINDS.worm.label;
  // green must actually BE green: dominant channel is G, and clearly so
  const g = new THREE.Color(BONE_KINDS.cobra_green.colour);
  detail.isActuallyGreen = g.g > g.r && g.g > g.b;
  // and the two serpent drops must be genuinely different objects, not the same key twice
  const pass = detail.acid === 'cobra_green' && detail.midnight === 'cobra' &&
               detail.python === 'python' && detail.worm === 'worm' &&
               detail.greenLabel === 'green cobra skin' && detail.isActuallyGreen &&
               detail.acidLoot.length === 2 && detail.pythonLoot.length === 2 &&
               detail.acidLoot[1] === 'serpent_spine' && detail.pythonLoot[1] === 'serpent_spine' &&
               detail.wormLoot.length === 1 && detail.wormLoot[0] === 'worm';
  return { pass, detail };
});

// ⚠ THE MULTI-INSTANCE SHAPE for the 2026-08-05 revision: every creature in the game must
// have its own entry with its own LABEL — the failure mode being guarded against is a table
// where several species quietly share one generic name, which is exactly what "every
// creature drops a coloured bone" was. Also asserts the predator/prey split holds.
test('loot: every species has distinct, creature-appropriate loot', ()=>{
  const detail = {};
  const keys = Object.keys(BONE_KINDS);
  const labels = keys.map(k=>BONE_KINDS[k].label);
  detail.species = keys.length;
  detail.duplicateLabels = labels.filter((l,i)=>labels.indexOf(l)!==i);
  // predators must NOT be reduced to a bone; prey must be
  const PRED = ['lion','gorilla','crocodile','cheetah','wilddog','porcupine','rhino',
                'elephant','vulture','eagle','secretary','python','cobra','cobra_green','worm'];
  const PREY = ['zebra','wildebeest','gazelle','impala','warthog','kudu','giraffe'];
  detail.predatorsStillGenericBone = PRED.filter(k=>!BONE_KINDS[k] || BONE_KINDS[k].form === 'bone');
  detail.preyNotBone               = PREY.filter(k=>!BONE_KINDS[k] || BONE_KINDS[k].form !== 'bone');
  detail.missing                   = PRED.concat(PREY).filter(k=>!BONE_KINDS[k]);
  // the three craft materials must route to the counters recipes actually spend
  detail.craftRouting = { lion:boneCraftSlot('lion'), elephant:boneCraftSlot('elephant'),
                          rhino:boneCraftSlot('rhino'), zebra:boneCraftSlot('zebra') };
  // every form must actually BUILD — a typo'd form silently falls through to a bone
  detail.forms = [...new Set(keys.map(k=>BONE_KINDS[k].form))].sort();
  detail.formMeshCounts = {};
  let allBuild = true;
  for(const f of detail.forms){
    const k = keys.find(x=>BONE_KINDS[x].form===f);
    const g = makeBoneMesh(BONE_KINDS[k]);
    let n=0; g.traverse(o=>{ if(o.isMesh) n++; });
    detail.formMeshCounts[f] = n;
    if(n < 1) allBuild = false;
    disposeObject3D(g);
  }
  const pass = detail.duplicateLabels.length === 0 && detail.missing.length === 0 &&
               detail.predatorsStillGenericBone.length === 0 && detail.preyNotBone.length === 0 &&
               detail.craftRouting.lion === 'tooth' && detail.craftRouting.elephant === 'tusk' &&
               detail.craftRouting.rhino === 'horn' && detail.craftRouting.zebra === null &&
               allBuild;
  return { pass, detail };
});

// Pickup tallies per species, disposes the mesh, and the world cap frees the OLDEST
// rather than growing without bound (the ecosystem kills far more than the player does).
test('loot: pickup tallies, craft materials route to their counters, cap evicts non-craft first', ()=>{
  clearBoneDrops(); boneCounts = {};
  pinPlayer();
  const detail = {};
  const px = player.pos.x, pz = player.pos.z;
  const t0 = toothCount, k0 = hornCount;

  // ⚠ MULTI-INSTANCE, and mixed on purpose: two plain loot drops and two craft drops in
  // one reach, because the failure this guards is a pickup path that routes the FIRST kind
  // it sees and then treats everything after it the same way.
  dropBone('crocodile', new THREE.Vector3(px+1, 0, pz));
  dropBone('crocodile', new THREE.Vector3(px+1.4, 0, pz));
  dropBone('lion',      new THREE.Vector3(px+1.8, 0, pz));   // craft → toothCount
  dropBone('rhino',     new THREE.Vector3(px+2.1, 0, pz));   // craft → hornCount
  const sceneBefore = scene.children.length;
  detail.took = [pickUpBone(), pickUpBone(), pickUpBone(), pickUpBone()];
  detail.tookExtra = pickUpBone();                   // nothing left in reach
  detail.counts = JSON.parse(JSON.stringify(boneCounts));
  detail.dropsLeft = boneDrops.length;
  detail.sceneFreed = sceneBefore - scene.children.length;   // 4 groups removed
  detail.tally = boneTally();
  detail.total = totalBones();
  // the craft materials must have landed in the counters the RECIPES read, and must NOT
  // also be sitting in the loot pouch double-counted
  detail.toothGained = toothCount - t0;
  detail.hornGained  = hornCount  - k0;
  detail.craftNotInPouch = !boneCounts.lion && !boneCounts.rhino;
  detail.irregularPlural = detail.tally.indexOf('crocodile teeth') >= 0;

  // Cap: push well past BONE.MAX and require the array to hold exactly the cap.
  // ⚠ The rule changed with the craft merge: the oldest NON-CRAFT drop goes first, so a
  // rhino horn you are walking toward cannot be silently deleted by six zebras dying
  // elsewhere. The craft drop below is the OLDEST entry and must still be there at the end.
  clearBoneDrops();
  const sceneAtCapStart = scene.children.length;
  const horn  = dropBone('rhino', new THREE.Vector3(200, 0, 200));
  const first = dropBone('zebra', new THREE.Vector3(201, 0, 200));
  for(let i=0;i<BONE.MAX + 15;i++) dropBone('zebra', new THREE.Vector3(200+i*0.5, 0, 210));
  detail.cap = BONE.MAX;
  detail.heldAtCap = boneDrops.length;
  detail.oldestNonCraftEvicted = boneDrops.indexOf(first) < 0;
  detail.oldestNonCraftDetached = !first.mesh.parent;
  detail.craftDropSurvivedCap = boneDrops.indexOf(horn) >= 0 && !!horn.mesh.parent;
  detail.sceneDelta = scene.children.length - sceneAtCapStart;   // == BONE.MAX

  const pass = detail.took.every(Boolean) && !detail.tookExtra &&
               detail.counts.crocodile === 2 && detail.total === 2 &&
               detail.toothGained === 1 && detail.hornGained === 1 &&
               detail.craftNotInPouch && detail.irregularPlural &&
               detail.dropsLeft === 0 && detail.sceneFreed === 4 &&
               detail.heldAtCap === BONE.MAX && detail.oldestNonCraftEvicted &&
               detail.oldestNonCraftDetached && detail.craftDropSurvivedCap &&
               detail.sceneDelta === BONE.MAX;
  clearBoneDrops(); boneCounts = {};
  toothCount = t0; hornCount = k0;
  return { pass, detail };
});

// =====================================================================
//  FEATURE 4 — 🪽 DOUBLE JUMP
// =====================================================================
// ⚠ THE MULTI-INSTANCE SHAPE here is REPETITION, not several objects: the bug this exists
// to catch is a jump counter that works once and then leaks (never refills, or refills in
// mid-air, or a held key spending both jumps in consecutive frames). So it runs several
// complete jump cycles and asserts the totals, rather than one jump.
// ⚠ Both jump tests MUST start on dry land. updatePlayer's swim branch replaces gravity and
// makes Space a hold-to-rise, so a player standing in a pond returns WATER.SWIM_UP (4.2) for
// every press — which the first cut of this test faithfully recorded as "two identical
// impulses, second not weaker". The spawn point is not guaranteed to be dry.
// 🪽 The double jump is a PURCHASE (Springbok Sinew accessory) as of 2026-08-05c, so every
// test that exercises jump #2 has to equip it first and hand the slots back afterwards —
// `progress` is the persistent save object, not test-local state.
let _savedAcc = null;
function equipSinew(){
  _savedAcc = progress.accessories.slice();
  progress.unlocked.add('springbok_sinew');
  if(!progress.accessories.includes('springbok_sinew')) progress.accessories[0] = 'springbok_sinew';
}
function unequipSinew(){
  _savedAcc = progress.accessories.slice();
  progress.accessories = progress.accessories.map(a => a==='springbok_sinew' ? null : a);
}
function restoreAccessories(){ if(_savedAcc){ progress.accessories = _savedAcc; _savedAcc = null; } }

function standOnDryLand(){
  const before = { x:player.pos.x, z:player.pos.z };
  for(let r=0; r<=240; r+=6){
    for(let a=0; a<12; a++){
      const th = a*Math.PI/6, x = Math.cos(th)*r, z = Math.sin(th)*r;
      const y = terrainY(x,z);
      if(inWaterAt(x, z, y+0.1)) continue;
      if(waterHoles.some(w=>Math.hypot(x-w.x, z-w.z) < w.r + 6)) continue;
      player.pos.set(x, y+0.1, z);
      pinPlayer();
      return before;
    }
  }
  pinPlayer();
  return before;
}

test('jump: two jumps per airborne trip, weaker second, refilled only by landing', ()=>{
  const home = standOnDryLand();
  equipSinew();                       // 🪽 jump #2 is bought, not default
  const detail = {}, DT = 1/60;
  detail.startedDry = !player.swimming;
  detail.sinewEquipped = maxJumps() === 2;
  const clearAir = ()=>{ keys['Space']=false; player._jumpDown=false; };
  // settle on the ground
  clearAir();
  for(let i=0;i<10;i++) updatePlayer(DT);
  detail.groundedJumps = player.jumpsLeft;

  // one press = one jump: hold Space DOWN for many frames and it must fire exactly once
  const heights = [];
  keys['Space']=true;
  updatePlayer(DT); const v1 = player.vel.y;
  for(let i=0;i<20;i++) updatePlayer(DT);            // still held — must NOT spend jump 2
  detail.heldDidNotDoubleSpend = player.jumpsLeft === 1;
  // release + press again in the air → the double jump
  keys['Space']=false; updatePlayer(DT);
  keys['Space']=true;  updatePlayer(DT); const v2 = player.vel.y;
  detail.firstImpulse  = Math.round(v1*100)/100;
  detail.secondImpulse = Math.round(v2*100)/100;
  detail.secondIsWeaker = v2 > 0 && v2 < v1;
  detail.ratio = Math.round((v2/PLAYER.jumpForce)*100)/100;
  detail.jumpsAfterBoth = player.jumpsLeft;
  // a third press in the air must do NOTHING
  keys['Space']=false; updatePlayer(DT);
  const vBefore = player.vel.y;
  keys['Space']=true;  updatePlayer(DT);
  detail.thirdPressIgnored = player.vel.y < vBefore;   // gravity only, no new impulse
  clearAir();

  // …and land, then do it all again TWICE more. A counter that refills wrongly shows up here.
  let cycles = 0;
  for(let c=0;c<3;c++){
    for(let i=0;i<240 && !player.onGround;i++) updatePlayer(DT);
    if(!player.onGround) break;
    detail['refilledOnLanding'+c] = player.jumpsLeft === maxJumps();
    keys['Space']=true;  updatePlayer(DT); const a = player.vel.y;
    keys['Space']=false; updatePlayer(DT);
    keys['Space']=true;  updatePlayer(DT); const b = player.vel.y;
    keys['Space']=false; player._jumpDown=false;
    heights.push([Math.round(a*100)/100, Math.round(b*100)/100]);
    if(a > 0 && b > 0 && b < a) cycles++;
  }
  detail.cycles = cycles;
  detail.impulsesPerCycle = heights;
  // every cycle must look the same — this is the "works once then leaks" assertion
  detail.allCyclesIdentical = heights.length > 0 &&
    heights.every(h => Math.abs(h[0]-heights[0][0]) < 0.01 && Math.abs(h[1]-heights[0][1]) < 0.01);
  clearAir();
  for(let i=0;i<300 && !player.onGround;i++) updatePlayer(DT);
  player.pos.x = home.x; player.pos.z = home.z; pinPlayer();

  restoreAccessories();
  // ⚠ literal 2, not maxJumps() — the slots are already handed back on the line above,
  // so maxJumps() reads 1 again here and would score a correct build as a failure.
  const pass = detail.startedDry && detail.sinewEquipped &&
               detail.groundedJumps === 2 && detail.heldDidNotDoubleSpend &&
               detail.secondIsWeaker && detail.ratio >= 0.75 && detail.ratio <= 0.85 &&
               detail.jumpsAfterBoth === 0 && detail.thirdPressIgnored &&
               detail.cycles === 3 && detail.allCyclesIdentical;
  return { pass, detail };
});

// The coyote rule, which the jump COUNTER introduces: walking off a ledge must still give
// you the strong ground jump for a moment, and must NOT keep giving it forever.
test('jump: coyote grace gives the strong jump just after walking off, then expires', ()=>{
  const home = standOnDryLand();
  equipSinew();                       // 🪽 the weak late jump IS the air jump — needs the buy
  const DT = 1/60, detail = {};
  keys['Space']=false; player._jumpDown=false;
  for(let i=0;i<10;i++) updatePlayer(DT);

  // simulate walking off an edge: airborne with a full counter, no jump spent
  player.onGround = false; player.airT = 0; player.jumpsLeft = maxJumps();
  player.pos.y = terrainY(player.pos.x, player.pos.z) + 4;
  player.vel.set(0,0,0);
  updatePlayer(DT);                                   // inside the grace window
  detail.airTInGrace = Math.round(player.airT*1000)/1000;
  detail.jumpsInGrace = player.jumpsLeft;
  keys['Space']=true; updatePlayer(DT);
  detail.graceImpulse = Math.round(player.vel.y*100)/100;
  detail.graceGaveFullJump = Math.abs(player.vel.y - PLAYER.jumpForce) < 0.01;

  // now let the grace lapse without jumping
  keys['Space']=false; player._jumpDown=false;
  player.onGround = false; player.airT = 0; player.jumpsLeft = maxJumps();
  player.pos.y = terrainY(player.pos.x, player.pos.z) + 8;
  player.vel.set(0,0,0);
  for(let i=0;i<20;i++) updatePlayer(DT);             // 0.33 s > jumpCoyote
  detail.jumpsAfterGrace = player.jumpsLeft;
  const vB = player.vel.y;
  keys['Space']=true; updatePlayer(DT);
  detail.lateImpulse = Math.round(player.vel.y*100)/100;
  detail.lateGaveWeakJump = player.vel.y > vB &&
                            Math.abs(player.vel.y - PLAYER.jumpForce*PLAYER.doubleJumpMul) < 0.01;
  keys['Space']=false; player._jumpDown=false;
  for(let i=0;i<400 && !player.onGround;i++) updatePlayer(DT);

  // ⚠ MOBILE. doTouchAction('jump') pulses Space for 130 ms, and a fast double-tap lands
  // INSIDE that window — so without an explicit release first the second tap produces no
  // rising edge and the air jump silently never fires on a phone. Drive the real handler.
  // ⚠ RE-STAND ON DRY LAND FIRST, and note this block must run BEFORE `home` is restored.
  // `standOnDryLand()` returns the position it found you at, NOT the dry one it moved you
  // to — so restoring `home` can drop you straight back into a pond, and then the swim
  // branch replaces gravity and Space becomes hold-to-rise. The tell is unmistakable once
  // you know it: touchFirst reads exactly WATER.SWIM_UP (4.2) instead of jumpForce (12).
  standOnDryLand();
  player.pos.y = terrainY(player.pos.x, player.pos.z) + 0.1; player.vel.set(0,0,0);
  player.onGround = true; player.swimming = false; player.jumpsLeft = maxJumps(); player.airT = 0;
  keys['Space'] = false; player._jumpDown = false;
  updatePlayer(DT);
  doTouchAction('jump'); updatePlayer(DT); detail.touchFirst = Math.round(player.vel.y*100)/100;
  doTouchAction('jump'); updatePlayer(DT); detail.touchSecond = Math.round(player.vel.y*100)/100;
  detail.touchDoubleTapWorks = detail.touchSecond > 0 &&
    Math.abs(detail.touchSecond - PLAYER.jumpForce*PLAYER.doubleJumpMul) < 0.01;
  keys['Space'] = false; player._jumpDown = false;
  for(let i=0;i<400 && !player.onGround;i++) updatePlayer(DT);
  player.pos.x = home.x; player.pos.z = home.z; pinPlayer();   // leave the world as we found it

  restoreAccessories();
  const pass = detail.touchDoubleTapWorks &&
               detail.jumpsInGrace === 2 && detail.graceGaveFullJump &&
               detail.jumpsAfterGrace === 1 && detail.lateGaveWeakJump;
  return { pass, detail };
});

// 🪽 THE PURCHASE GATE (2026-08-05c). Steven's ask was to BUY the double jump; it had
// shipped unlocked. The multi-instance shape here is REPETITION ACROSS THE TRANSITION:
// three full jump cycles locked, then equip, then three unlocked, then unequip and three
// more — because the failure mode for a gated counter is that it latches on the first
// read (or the ground snap keeps refilling to the old max after the item comes off).
test('jump: the air jump is gated on buying the Springbok Sinew', ()=>{
  const home = standOnDryLand();
  const DT = 1/60, detail = {};
  const clearAir = ()=>{ keys['Space']=false; player._jumpDown=false; };
  const settle = ()=>{ clearAir(); for(let i=0;i<400 && !player.onGround;i++) updatePlayer(DT);
                       pinPlayer(); for(let i=0;i<6;i++) updatePlayer(DT); };
  // Drive one complete airborne trip; returns every impulse the trip produced.
  const trip = ()=>{
    settle();
    const out = [];
    keys['Space']=true;  updatePlayer(DT); out.push(Math.round(player.vel.y*100)/100);
    // ⚠ COAST 20 FRAMES BEFORE THE SECOND PRESS, and detect the jump as a RISE in vel.y.
    // Both halves of that are load-bearing, and each one on its own gets the answer wrong:
    //   · a fraction-of-the-first-impulse threshold scores a correctly-LOCKED build as
    //     double-jumping, because two frames of gravity off a 12 still leaves 11.27;
    //   · pressing immediately scores a correctly-UNLOCKED build as locked, because the
    //     air jump ASSIGNS 9.6 and 9.6 is *below* the 11.27 it is replacing.
    // Twenty frames puts vel.y at ~4.67 (apex is frame 33, so still rising), where 9.6 is
    // unambiguously a rise and continued decay is unambiguously not.
    clearAir();
    for(let i=0;i<20;i++) updatePlayer(DT);
    const vBefore = player.vel.y;
    keys['Space']=true;  updatePlayer(DT);
    if(player.vel.y > vBefore) out.push(Math.round(player.vel.y*100)/100);
    clearAir();
    return out;
  };

  unequipSinew();
  detail.lockedMaxJumps = maxJumps();
  detail.lockedTrips = [trip(), trip(), trip()];
  restoreAccessories();

  equipSinew();
  detail.boughtMaxJumps = maxJumps();
  detail.boughtTrips = [trip(), trip(), trip()];
  restoreAccessories();

  unequipSinew();                                   // …and taking it back off re-locks it
  detail.relockedTrips = [trip(), trip(), trip()];
  restoreAccessories();

  settle();
  player.pos.x = home.x; player.pos.z = home.z; pinPlayer();

  const oneJump  = t => t.length === 1;
  const twoJumps = t => t.length === 2 && t[1] > 0 && t[1] < t[0] &&
                        Math.abs(t[1] - PLAYER.jumpForce*PLAYER.doubleJumpMul) < 0.01;
  detail.lockedGaveOneEachTime   = detail.lockedTrips.every(oneJump);
  detail.boughtGaveTwoEachTime   = detail.boughtTrips.every(twoJumps);
  detail.relockedGaveOneEachTime = detail.relockedTrips.every(oneJump);
  detail.priced                  = itemPrice('springbok_sinew');
  detail.inShop                  = !!SHOP_BY_ID['springbok_sinew'] &&
                                   SHOP_BY_ID['springbok_sinew'].type === 'accessory';
  detail.notAStarter             = !SHOP_BY_ID['springbok_sinew'].starter;

  const pass = detail.lockedMaxJumps === 1 && detail.boughtMaxJumps === 2 &&
               detail.lockedGaveOneEachTime && detail.boughtGaveTwoEachTime &&
               detail.relockedGaveOneEachTime &&
               detail.priced > 0 && detail.inShop && detail.notAStarter;
  return { pass, detail };
});

// =====================================================================
//  FEATURE 5 — 🏠 ROOFS ARE SHELTER, NOT WALLS
// =====================================================================
// Steven: "I can't walk under the roof." Roof AABBs were concat'd into the player's
// horizontal wall push, and that push is purely XZ — so a roof floating 2.16 above the
// feet blocked the player at its footprint edge.
// ⚠ THE MULTI-INSTANCE SHAPE: a LINE of roofs walked end to end. One roof can be made to
// pass by accident (step off its edge, clip a corner); a corridor of them is only
// traversable if the underside genuinely stopped being a barrier, and it also catches a
// fix that leaks state between roofs.
test('roof: walk under a line of roofs unobstructed, and still stand on top', ()=>{
  const detail = {}, DT = 1/60;
  const clearRoofs = ()=>{ clearKitRoofs(); };
  clearRoofs(); clearWalls(); pinPlayer();
  woodCount = 5000;

  // Build a corridor of 5 roofs along +Z, each placed over the player's own feet.
  const X = 40, Z0 = 40, N = 5, STEP = ROOF.SIZE * 0.9;
  for(let i=0;i<N;i++){
    player.pos.set(X, 0, Z0 + i*STEP); pinPlayer();
    placeKitRoof();
  }
  detail.roofsPlaced = kitRoofs.length;
  const a0 = kitRoofs[0].aabb;
  detail.headroom   = r2(a0.min.y - (terrainY(X, Z0) + 0.1));
  detail.headClears = (terrainY(X, Z0) + 0.1 + PLAYER.eyeHeight) < a0.min.y;

  // WALK the corridor end to end, on the ground, through the real push.
  player.pos.set(X, 0, Z0 - 5); pinPlayer();
  let blockedFrames = 0;
  const zEnd = Z0 + (N-1)*STEP + 5;
  for(let f=0; f<3000 && player.pos.z < zEnd; f++){
    pinPlayer();
    const before = player.pos.z;
    player.pos.z += 0.15;
    pushPlayerOutOfWalls();
    if(player.pos.z < before + 0.15 - 1e-6) blockedFrames++;
  }
  detail.blockedFrames = blockedFrames;
  detail.finalZ = r2(player.pos.z);
  detail.walkedThrough = player.pos.z >= zEnd - 0.2;

  // …and the top is STILL a floor: drop onto the middle roof and stand on it.
  const mid = kitRoofs[(N/2)|0].aabb;
  const cx = (mid.min.x+mid.max.x)/2, cz = (mid.min.z+mid.max.z)/2;
  player.pos.set(cx, mid.max.y + 1.2, cz);
  player.vel.set(0,0,0); player.onGround = false;
  player.inTree = false; player.climbing = false; player.swimming = false;
  for(let f=0; f<240 && !player.onGround; f++){
    player.health = 100; player.hunger = 100; gameState='playing';
    updatePlayer(DT);
  }
  detail.landedOnRoof   = player.onGround && player.pos.y > mid.max.y - 0.05;
  detail.standingHeight = r2(player.pos.y);
  detail.roofTop        = r2(mid.max.y);
  // it is a floor, not a trampoline: stay put for a second
  for(let f=0; f<60; f++){ player.health=100; player.hunger=100; gameState='playing'; updatePlayer(DT); }
  detail.stillOnRoof = player.onGround && player.pos.y > mid.max.y - 0.05;

  clearRoofs(); pinPlayer();
  const pass = detail.roofsPlaced === N && detail.headClears &&
               detail.blockedFrames === 0 && detail.walkedThrough &&
               detail.landedOnRoof && detail.stillOnRoof;
  return { pass, detail };
});

// =====================================================================
//  🏢 MULTI-STOREY — walls stack on roofs, wall → roof → wall → roof → …
// =====================================================================
// ⚠ THE BUG SHAPE THESE EXIST TO CATCH is the one this whole feature could have shipped
// with: `pushOutOfAABB` is purely XZ, so every wall is an INFINITE VERTICAL COLUMN. Put a
// wall on a third-storey roof and, without the layering, it blocks a lion standing on the
// ground under it and blocks you at ground level too. A one-storey smoke test cannot see
// that — you need several storeys AND to walk every level against every level, which is
// what the N×N matrix below does. Assert the ZEROES, not just the ones.
const STOREY_X = 60, STOREY_Z = 60;                 // a fixed build site, well clear of the ponds
function clearRoofs(){ clearKitRoofs(); }
// Plant the player somewhere solid without touching updatePlayer (used mid-build, where
// the feet are deliberately up on a deck rather than on the terrain).
function standAt(x, y, z){
  player.pos.set(x, y, z); player.vel.set(0,0,0);
  player.onGround = true; player.inTree = false; player.climbing = false; player.swimming = false;
  player.health = 100; player.hunger = 100; player.poisonT = 0; gameState = 'playing';
}
// A bare stack of N decks — roofs only, no walls. Returns each deck's TOP y (the surface
// you stand on and the surface a wall placed there is based at).
function buildDecks(n, x, z){
  const floors = [];
  let feet = terrainY(x, z) + 0.1;
  for(let s=0; s<n; s++){
    standAt(x, feet, z);
    if(!placeKitRoof()) break;
    floors.push(kitRoofs[kitRoofs.length-1].aabb.max.y);
    feet = floors[floors.length-1] + 0.1;
  }
  return floors;
}
// Walk the player at `feetY` straight along +Z into (x,z) and report whether anything
// stopped them. Drives the REAL push, not a reimplementation of it.
function walkIntoBlocked(x, z, feetY, fromDist){
  standAt(x, feetY, z - (fromDist || 6));
  let blocked = 0;
  for(let i=0; i<300 && player.pos.z < z - 0.4; i++){
    const before = player.pos.z;
    player.pos.z += 0.08;
    pushPlayerOutOfWalls();
    if(player.pos.z < before + 0.08 - 1e-6) blocked++;
  }
  return { blocked, stoppedAt: r2(z - player.pos.z) };
}

// THE MATRIX. Five decks, one wall on ONE deck at a time, then walk every level including
// true ground. A wall must block on its own deck and be invisible everywhere else — and
// invisible to the animals' 2-D world at every level, always.
test('storeys: a wall blocks on its own deck and on no other', ()=>{
  clearWalls(); clearRoofs(); pinPlayer();
  woodCount = 9000; rockCount = 9000;
  const detail = {}, N = 5, X = STOREY_X, Z = STOREY_Z;
  const floors = buildDecks(N, X, Z);
  detail.decks = floors.map(r2);
  detail.pitch = r2(floors[1] - floors[0]);
  const groundFeet = terrainY(X, Z) + 0.1;
  const levels = [groundFeet].concat(floors.map(f => f + 0.1));   // level 0 = true ground

  const rows = [];
  for(let k=0; k<N; k++){
    clearWalls();
    standAt(X, floors[k] + 0.1, Z); yaw = 0;          // fwd = (0,0,-1) → the -Z rim of deck k
    const placed = placeKitWall(false);
    const bb = wallAABBs[0];
    // ⚠ keep the RAW base for the equality check — comparing an r2()-rounded value to an
    // unrounded deck height with a 1e-6 tolerance scores a correct build as a failure.
    const row = { deck:k, placed, base:r2(bb.min.y), _rawBase:bb.min.y,
                  top:r2(bb.max.y), elevated:!!bb.elevated, blocked:[] };
    for(let f=0; f<levels.length; f++) row.blocked.push(walkIntoBlocked(X, Z, levels[f]).blocked > 0 ? 1 : 0);
    // …and the 2-D world: a ground creature walking the same line, plus the swept
    // segment test the movement anti-tunnel guard uses.
    const cp = new THREE.Vector3(X, terrainY(X, Z-6), Z-6);
    let cblk = 0;
    for(let i=0;i<300 && cp.z < Z-0.4; i++){
      const b = cp.z; cp.z += 0.08; cp.y = terrainY(cp.x, cp.z);
      collideWalls(cp, 0.7); collideStoneWalls(cp, 0.7);
      if(cp.z < b + 0.08 - 1e-6) cblk++;
    }
    row.creatureBlocked = cblk > 0 ? 1 : 0;
    row.segBlocked = segCrossesWall(X, Z-6, X, Z+6, 0.7) ? 1 : 0;
    rows.push(row);
  }
  detail.rows = rows;
  // Every wall sat on its deck, exactly.
  detail.basedOnDeck   = rows.every((r,k) => Math.abs(r._rawBase - floors[k]) < 1e-6);
  detail.allElevated   = rows.every(r => r.elevated);
  // The identity matrix: blocked[level] is 1 iff level === deck+1 (level 0 is the ground).
  detail.identity      = rows.every((r,k) => r.blocked.every((v,f) => v === (f === k+1 ? 1 : 0)));
  // ⚠ The assertion that would have caught the whole bug class: the GROUND row is all
  // zeroes, i.e. no floating wall ever blocks a player standing underneath it.
  detail.groundRowClear = rows.every(r => r.blocked[0] === 0);
  detail.creaturesClear = rows.every(r => r.creatureBlocked === 0 && r.segBlocked === 0);

  clearWalls(); clearRoofs(); pinPlayer();
  const pass = floors.length === N && detail.basedOnDeck && detail.allElevated &&
               detail.identity && detail.groundRowClear && detail.creaturesClear;
  return { pass, detail };
});

// Placement legality: a wall needs a roof under it. Also pins the rim snap, which is the
// only reason a 4.4-wide deck can be walled at all from a 2.5 reach.
test('storeys: a wall needs a roof under it, and the rim snap is what makes a deck wallable', ()=>{
  clearWalls(); clearRoofs(); pinPlayer();
  woodCount = 9000; rockCount = 9000;
  const detail = {}, X = STOREY_X, Z = STOREY_Z;
  const floors = buildDecks(2, X, Z);
  const deck = kitRoofs[0].aabb;

  // 1. From the deck centre, all four cardinals: each must land ON the deck, at its top.
  const rim = [];
  for(let k=0;k<4;k++){
    clearWalls();
    standAt(X, floors[0] + 0.1, Z); yaw = k * Math.PI/2;
    const plan = wallPlacementPlan();
    const ok = placeKitWall(false);
    const bb = wallAABBs[0];
    rim.push({ ok, elevated:plan.elevated, snapped:plan.snapped,
               base:r2(bb.min.y), onDeckTop: Math.abs(bb.min.y - deck.max.y) < 1e-6,
               insideFootprint: plan.x >= deck.min.x-1e-6 && plan.x <= deck.max.x+1e-6 &&
                                plan.z >= deck.min.z-1e-6 && plan.z <= deck.max.z+1e-6,
               yawIsCardinal: Math.abs((plan.yaw % (Math.PI/2))) < 1e-9 });
  }
  detail.fourCardinals = rim;
  detail.allFourLanded = rim.every(r => r.ok && r.elevated && r.snapped &&
                                        r.onDeckTop && r.insideFootprint && r.yawIsCardinal);

  // 2. Stand ON the rim and aim OUT — beyond the snap slack, so it must refuse and the
  //    refusal must be free (the classic "charged for a wall it never built").
  clearWalls();
  standAt(deck.max.x - 0.05, deck.max.y + 0.1, (deck.min.z + deck.max.z)/2);
  yaw = -Math.PI/2;                                    // fwd = (+1,0,0), straight off the edge
  woodCount = 500;
  const wallsBefore = wallAABBs.length, woodBefore = woodCount;
  const refusedPlan = wallPlacementPlan();
  const refused = placeKitWall(false);
  detail.midAir = { blocked: !!refusedPlan.blocked, reason: refusedPlan.blocked,
                    returned: refused, wallsAdded: wallAABBs.length - wallsBefore,
                    woodCharged: woodBefore - woodCount };
  detail.midAirRefused = refusedPlan.blocked && refused === false &&
                         detail.midAir.wallsAdded === 0 && detail.midAir.woodCharged === 0;

  // 3. Ground placement is UNTOUCHED — open savannah, well away from the tower.
  clearWalls(); pinPlayer();
  const gOk = placeAheadAt(X - 40, Z - 40, ()=>placeKitWall(false));
  const gbb = wallAABBs[0];
  detail.ground = { placed:gOk, elevated: !!(gbb && gbb.elevated),
                    onTerrain: !!gbb && Math.abs(gbb.min.y - terrainY((gbb.min.x+gbb.max.x)/2,
                                                                     (gbb.min.z+gbb.max.z)/2)) < 0.05 };
  detail.groundUnchanged = detail.ground.placed && !detail.ground.elevated && detail.ground.onTerrain;

  // 4. Standing on a WALL TOP is not standing on a storey — it still drops an ordinary
  //    ground wall, exactly as it did before storeys existed. (No silent regression for
  //    anyone who builds by walking along their own palisade.)
  standAt((gbb.min.x+gbb.max.x)/2, gbb.max.y + 0.1, (gbb.min.z+gbb.max.z)/2);
  yaw = Math.PI;
  const wtPlan = wallPlacementPlan();
  const wtOk = placeKitWall(false);
  detail.fromWallTop = { placed:wtOk, elevated:wtPlan.elevated, blocked:wtPlan.blocked };
  detail.wallTopUnchanged = wtOk === true && wtPlan.elevated === false && !wtPlan.blocked;

  clearWalls(); clearRoofs(); pinPlayer();
  const pass = floors.length === 2 && detail.allFourLanded && detail.midAirRefused &&
               detail.groundUnchanged && detail.wallTopUnchanged;
  return { pass, detail };
});

// The playable loop, end to end: jump up INSIDE an enclosed tower storey by storey, prove
// each storey's ring really does enclose you and its doorway really does let you out, and
// confirm the top deck is still the one-way platform db8d212 made it.
//
// ⚠ THE TOWER HERE HAS NO GROUND-FLOOR RING ON PURPOSE. An enclosed ground floor is a
// perfectly good house but it makes the "walk under your own overhang" assertion untestable
// — you would be stopped by a ground wall and score it as the storeys leaking downward.
// Every ring sits on a deck, so at ground level the whole tower is overhang.
test('storeys: jump up an enclosed tower, out through its door, and off the one-way top', ()=>{
  clearWalls(); clearRoofs(); pinPlayer();
  equipSinew();                       // 🪽 storey-to-storey hops are what the Sinew buys
  woodCount = 9000; rockCount = 9000;
  const detail = {}, DT = 1/60, X = STOREY_X, Z = STOREY_Z, N = 4;
  const clearAir = ()=>{ keys['Space'] = false; player._jumpDown = false; };
  detail.sinew = maxJumps() === 2;

  // Deck 0 first (no ring under it), then a THREE-wall ring on every deck: the missing
  // fourth side is the doorway, and it faces -Z on every storey.
  const floors = [];
  standAt(X, terrainY(X, Z) + 0.1, Z);
  placeKitRoof(); floors.push(kitRoofs[0].aabb.max.y);
  for(let s=0; s<N-1; s++){
    const feet = floors[s] + 0.1;
    for(let k=1;k<4;k++){ standAt(X, feet, Z); yaw = k*Math.PI/2; placeKitWall(false); }  // skip k=0 → the door
    standAt(X, feet, Z);
    if(!placeKitRoof()) break;
    floors.push(kitRoofs[kitRoofs.length-1].aabb.max.y);
  }
  detail.decks = floors.map(r2);
  detail.walls = wallAABBs.length;
  detail.elevatedWalls = wallAABBs.filter(a=>a.elevated).length;
  detail.groundWalls   = wallAABBs.filter(a=>!a.elevated).length;

  // ⚠ THE OVERHANG ASSERTION: nine walls hang overhead. Cross the whole footprint at
  // ground level, on the X axis, and nothing up there may touch you.
  standAt(X - 8, terrainY(X-8, Z) + 0.1, Z);
  let underBlocked = 0;
  for(let i=0;i<400 && player.pos.x < X + 8; i++){
    const b = player.pos.x;
    player.pos.y = terrainY(player.pos.x, player.pos.z) + 0.1;
    player.pos.x += 0.08;
    pushPlayerOutOfWalls();
    if(player.pos.x < b + 0.08 - 1e-6) underBlocked++;
  }
  detail.walkedUnderTower = { blockedFrames: underBlocked, finalX: r2(player.pos.x),
                              cleared: player.pos.x >= X + 7.9 };

  // CLIMB, for real: stand under your own deck and jump UP THROUGH it. This is the
  // documented one-way platform in the upward direction — you pass through the slab on
  // the way up and the swept `crossed` test catches your feet on the way down.
  // ⚠ ONE SINGLE JUMP PER DECK, not a double. Measured on clear ground: a single jump
  // peaks 3.373, and a deck-to-deck hop is 2.595, so one press clears one storey with 0.78
  // to spare. Spending the air jump here would OVERSHOOT — from the ground a well-timed
  // double reaches 5.547, i.e. straight past deck 0 and onto deck 1 — and the test would
  // then score "landed two decks up" as a failure to climb one.
  const hops = [];
  standAt(X, terrainY(X, Z) + 0.1, Z);
  clearAir();
  for(let i=0;i<10;i++) updatePlayer(DT);
  for(let d=0; d<floors.length; d++){
    const want = floors[d] + 0.1;
    clearAir();
    player.jumpsLeft = maxJumps();
    keys['Space'] = true; updatePlayer(DT);
    clearAir();                                       // release at once — no air jump
    for(let i=0;i<400 && !(player.onGround && player.pos.y > want - 0.05); i++) updatePlayer(DT);
    hops.push({ deck:d, want:r2(want), got:r2(player.pos.y),
                landed: player.onGround && Math.abs(player.pos.y - want) < 0.05 });
    if(!hops[d].landed) break;
  }
  detail.hops = hops;
  detail.climbedEveryDeck = hops.length === floors.length && hops.every(h=>h.landed);

  // ENCLOSURE: on the TOPMOST RINGED deck, walk into the +Z wall — blocked. Then walk out
  // through the -Z doorway — not blocked. Same storey, same ring, opposite results.
  // ⚠ Deliberately NOT the top deck: rings sit on decks 0..N-2 (each ring is the storey
  // BETWEEN two decks), so the top deck is open sky and would score a free, meaningless
  // pass on both halves.
  const ringedDeck = floors[floors.length-2];
  const wallSide = walkIntoBlocked(X, Z + 4, ringedDeck + 0.1, 4);   // into the +Z ring wall
  standAt(X, ringedDeck + 0.1, Z);
  let outBlocked = 0;
  for(let i=0;i<200 && player.pos.z > Z - 5; i++){
    const b = player.pos.z; player.pos.z -= 0.08; pushPlayerOutOfWalls();
    if(player.pos.z > b - 0.08 + 1e-6) outBlocked++;
  }
  detail.enclosure = { deck: r2(ringedDeck), intoWallBlockedFrames: wallSide.blocked,
                       stoppedShortOf: wallSide.stoppedAt,
                       outTheDoorBlockedFrames: outBlocked, exitedTo: r2(player.pos.z) };
  detail.ringHolds = wallSide.blocked > 0 && outBlocked === 0 && player.pos.z <= Z - 4.9;

  // ONE-WAY PLATFORM, PRESERVED: stand on the TOP deck, walk off the rim, and fall.
  const top = kitRoofs[kitRoofs.length-1].aabb;
  standAt((top.min.x+top.max.x)/2, top.max.y + 0.1, (top.min.z+top.max.z)/2);
  clearAir();
  for(let i=0;i<20;i++) updatePlayer(DT);
  const startY = player.pos.y;
  let leftTheDeck = false;
  for(let i=0;i<600;i++){
    if(!leftTheDeck) player.pos.x += 0.08;
    updatePlayer(DT);
    if(player.pos.x > top.max.x + 1.2) leftTheDeck = true;
    if(leftTheDeck && player.onGround) break;
  }
  detail.walkOffTop = { startY: r2(startY), endY: r2(player.pos.y),
                        fell: player.pos.y < startY - 2, landed: player.onGround };

  clearAir(); restoreAccessories();
  clearWalls(); clearRoofs(); pinPlayer();
  const pass = detail.sinew && floors.length === N && detail.groundWalls === 0 &&
               detail.elevatedWalls === (N-1)*3 &&
               detail.walkedUnderTower.blockedFrames === 0 && detail.walkedUnderTower.cleared &&
               detail.climbedEveryDeck && detail.ringHolds &&
               detail.walkOffTop.fell && detail.walkOffTop.landed;
  return { pass, detail };
});

// Scale + teardown. Twenty decks is far past anything Steven will build by hand, which is
// the point: if a per-storey leak exists it is 20× more visible here, and the disposal
// invariant (killObj on every removal path) has to hold all the way down.
test('storeys: twenty decks up and all the way down, leaving nothing behind', ()=>{
  clearWalls(); clearRoofs(); pinPlayer();
  woodCount = 90000; rockCount = 90000;
  const detail = {}, X = STOREY_X, Z = STOREY_Z, N = 20;
  const geo0 = renderer.info.memory.geometries, tex0 = renderer.info.memory.textures;
  const meshes0 = scene.children.length;

  const floors = [];
  let feet = terrainY(X, Z) + 0.1;
  for(let s=0; s<N; s++){
    for(let k=0;k<2;k++){ standAt(X, feet, Z); yaw = k*Math.PI; placeKitWall(false); }
    standAt(X, feet, Z);
    if(!placeKitRoof()) break;
    floors.push(kitRoofs[kitRoofs.length-1].aabb.max.y);
    feet = floors[floors.length-1] + 0.1;
  }
  detail.decksBuilt = floors.length;
  detail.topDeckY   = r2(floors[floors.length-1]);
  detail.pitchUniform = floors.every((f,i) => i===0 || Math.abs((f - floors[i-1]) - 2.595) < 0.01);
  detail.walls = wallAABBs.length;
  detail.elevatedWalls = wallAABBs.filter(a=>a.elevated).length;
  detail.lockstep = wallMeshes.length === wallAABBs.length && kitWalls.length === wallMeshes.length;
  // every deck is genuinely standable at its own height
  detail.everyDeckSupports = floors.every(f =>
    Math.abs(wallSupportY(X, Z, f + 0.1, f + 0.1, 0) - f) < 1e-6);

  // FRAME BUDGET at full height — the player push is the per-frame cost that scales with
  // the tower, so time the real function rather than asserting from theory.
  standAt(X, floors[0] + 0.1, Z);
  const t0 = performance.now();
  for(let i=0;i<600;i++) pushPlayerOutOfWalls();
  detail.pushUsPerFrame = Math.round((performance.now()-t0)/600*1000);

  // TEAR IT ALL DOWN through the real removal paths.
  while(wallMeshes.length) removeWallAt(wallMeshes.length-1);
  kitWalls.length = 0;
  clearKitRoofs();
  detail.after = { wallMeshes: wallMeshes.length, wallAABBs: wallAABBs.length,
                   kitWalls: kitWalls.length, kitRoofs: kitRoofs.length };
  detail.orphansInScene = scene.children.filter(c => c.name === 'wall' || c.name === 'roof').length;
  detail.geometriesLeaked = renderer.info.memory.geometries - geo0;
  detail.texturesLeaked   = renderer.info.memory.textures - tex0;
  detail.sceneDelta       = scene.children.length - meshes0;

  pinPlayer();
  const pass = detail.decksBuilt === N && detail.pitchUniform && detail.lockstep &&
               detail.elevatedWalls === (N-1)*2 && detail.everyDeckSupports &&
               detail.after.wallMeshes === 0 && detail.after.wallAABBs === 0 &&
               detail.after.kitRoofs === 0 && detail.orphansInScene === 0 &&
               detail.geometriesLeaked <= 0 && detail.texturesLeaked <= 0 &&
               detail.sceneDelta <= 0;
  return { pass, detail };
});

// The animals' half of the contract, asserted BOTH ways. "Nothing was blocked" is a
// worthless green on its own — it is also what a completely broken collision system
// prints — so every creature that walks freely under the deck must then be stopped dead
// by a ground wall in the very same spot.
test('storeys: ground creatures walk under an upper deck, and still hit a ground wall', ()=>{
  clearWalls(); clearRoofs(); pinPlayer();
  woodCount = 9000; rockCount = 9000;
  const detail = {}, X = STOREY_X, Z = STOREY_Z;
  // a deck with four walls around it, floating above open ground
  const floors = buildDecks(2, X, Z);
  for(let k=0;k<4;k++){ standAt(X, floors[0] + 0.1, Z); yaw = k*Math.PI/2; placeKitWall(false); }
  detail.elevatedWalls = wallAABBs.filter(a=>a.elevated).length;
  detail.groundWalls   = wallAABBs.filter(a=>!a.elevated).length;

  // Several body radii — a wild dog, a lion, a rhino, a cheetah, an elephant-ish bulk.
  const BODIES = [0.55, 0.7, 1.1, 0.6, 1.4];
  const cross = ()=> BODIES.map(r=>{
    const p = new THREE.Vector3(X, terrainY(X, Z-8), Z-8);
    let blocked = 0;
    for(let i=0;i<400 && p.z < Z+8; i++){
      const b = p.z; p.z += 0.08; p.y = terrainY(p.x, p.z);
      collideWalls(p, r); collideStoneWalls(p, r);
      if(p.z < b + 0.08 - 1e-6) blocked++;
    }
    return { r, blocked, crossed: p.z >= Z + 7.9 };
  });
  detail.underTheDeck = cross();
  detail.allWalkedUnder = detail.underTheDeck.every(x => x.blocked === 0 && x.crossed);
  detail.segClearUnder  = !segCrossesWall(X, Z-8, X, Z+8, 0.7) && !segHitsWall(X, Z-8, X, Z+8);

  // …now a GROUND wall in the same footprint. Every one of them must stop.
  standAt(X, terrainY(X,Z) + 0.1, Z - 2.5); yaw = Math.PI;      // fwd = (0,0,1) → wall at Z
  const gOk = placeKitWall(false);
  detail.groundWallPlaced = gOk && wallAABBs.filter(a=>!a.elevated).length === 1;
  detail.atTheGroundWall = cross();
  detail.allStopped = detail.atTheGroundWall.every(x => x.blocked > 0 && !x.crossed);
  detail.segBlocksNow = segCrossesWall(X, Z-8, X, Z+8, 0.7);

  clearWalls(); clearRoofs(); pinPlayer();
  const pass = detail.elevatedWalls === 4 && detail.groundWalls === 0 &&
               detail.allWalkedUnder && detail.segClearUnder &&
               detail.groundWallPlaced && detail.allStopped && detail.segBlocksNow;
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
//  FEATURE 6 — 🐊 the crocodile ambush (2026-08-05 overhaul)
// =====================================================================
// ⚠ MULTI-INSTANCE, and it has to be: every croc on the map is driven through the SAME
// sortie in the same frames and the totals are asserted. The failure being guarded against
// is per-croc state that is secretly shared or secretly global — a burst clock, a dry
// timer or a leash that one croc's sortie resets for all of them.
test('crocodile: every croc bursts out, hunts to the land ring, and walks home', ()=>{
  const detail = {}, DT = 1/60;
  const crocs = crocMeshes.filter(C=>C.health>0);
  if(crocs.length < 2) return { pass:false, detail:'need at least 2 live crocodiles' };
  if(crocGrab.croc) crocEndGrab(false);
  crocGrab.graceT = 0;
  // ⚠ Grabs are suppressed by pinning grabCd, NOT by crocGrab.graceT. Using the grace
  // window looks like the obvious "make me un-grabbable" switch and it silently breaks the
  // whole test: crocPickTarget skips the player entirely while graceT > 0, so the crocs
  // never acquired, never lunged, and every row read 3.4 u/s of ordinary cruising. With
  // grabCd pinned the croc still hunts and still bites — it just cannot seize.
  const noGrabs = ()=>crocs.forEach(X=>{ X.grabCd = 9; });
  const saved = crocs.map(C=>({ C, x:C.pos.x, z:C.pos.z, st:C.state, hp:C.health }));
  // ⚠ updateCrocodiles drives EVERY croc on the map, and the ponds are tens of metres
  // apart — so a croc left mid-sortie from the previous subject keeps reacting to a player
  // who has since walked to a different pond, and its numbers land in the wrong row. Reset
  // the whole population between subjects; only the one we parked at the player engages.
  // ⚠ THE PLAYER MUST BE THE ONLY CANDIDATE, or this measures the wrong animal. crocPickTarget
  // scans prey, lions, dogs, cheetahs, snakes and secretary birds and takes the NEAREST — and a
  // pond is exactly where the ecosystem congregates. First cut of this test read `target:'other'`
  // on every croc: they were chasing zebras that happened to be closer than the parked player, and
  // the numbers described a hunt the test never set up. Everything else is stashed off-map for the
  // duration; only updateCrocodiles runs, so nothing else moves or notices.
  const others = [].concat(preyMeshes, lionMeshes, dogMeshes, cheetahMeshes, snakeMeshes, secretaryMeshes)
                   .map(e=>({ e, x:e.pos.x, z:e.pos.z }));
  others.forEach(o=>{ o.e.pos.x += 5000; });
  const restoreOthers = ()=>others.forEach(o=>{ o.e.pos.x = o.x; o.e.pos.z = o.z; });

  const parkAll = ()=>crocs.forEach(C=>{
    const w=C.pool;
    C.pos.set(w.x, terrainY(w.x,w.z), w.z); C.mesh.position.copy(C.pos);
    C.state='CRUISE'; C.stateT=0; C.target=null; C.targetKind=null; C.dest=null;
    C.health=C.maxHealth; C.lungeCd=0; C.lungeT=0; C.dryT=0; C.grabCd=9;
  });
  const rows = [];
  for(const C of crocs.slice(0, 3)){
    parkAll();
    const w = C.pool;
    // park the subject at the rim and the player out on dry land, inside the land ring
    C.pos.set(w.x + w.r*0.8, terrainY(w.x+w.r*0.8, w.z), w.z); C.mesh.position.copy(C.pos);
    // ⚠ far enough out that GRAB_R (3.4) does not cap how far it gets: it stops reachR
    // short of the target, so the player has to stand well past the old 7 m ring for the
    // croc to be able to prove it can cross it.
    const px = w.x + w.r + CROC.LAND_RANGE*0.85;
    player.pos.set(px, terrainY(px, w.z)+0.1, w.z);
    player.vel.set(0,0,0); player.onGround = true; player.inTree = false;
    player.health = 100; gameState = 'playing';

    let maxSpd = 0, lunged = false, sawReturn = false, maxJump = 0, chasedPlayer = false;
    let maxOut = Math.hypot(C.pos.x-w.x, C.pos.z-w.z) - w.r;
    const sx = C.pos.x, sz = C.pos.z;
    const step = (n, keepPlayer)=>{
      for(let i=0;i<Math.round(n/DT);i++){
        const bx=C.pos.x, bz=C.pos.z;
        noGrabs();
        updateCrocodiles(DT);
        if(keepPlayer){ player.pos.y = terrainY(player.pos.x, player.pos.z)+0.1; player.health = 100; }
        if(C.state==='LUNGE')  lunged = true;
        if(C.target === player) chasedPlayer = true;
        if(C.state==='RETURN') sawReturn = true;     // ⚠ tracked across ALL phases: a croc
        maxOut = Math.max(maxOut, Math.hypot(C.pos.x-w.x, C.pos.z-w.z) - w.r);
        // ⚠ THE TELEPORT ASSERTION. No single frame may move the croc further than its own
        // fastest speed allows — that is exactly what the old hard leash clamp did when the
        // sortie ended, and "not just teleport" was Steven's explicit requirement.
        maxJump = Math.max(maxJump, Math.hypot(C.pos.x-bx, C.pos.z-bz));
      }
    };
    // --- the burst. Sample the croc's own ground speed over the first BURST_TIME.
    step(CROC.BURST_TIME, true);
    const burstDist = Math.hypot(C.pos.x-sx, C.pos.z-sz);
    maxSpd = burstDist / CROC.BURST_TIME;
    // --- the chase, out across dry land
    step(3.0, true);
    // --- the escape. Put the player well outside the ring; the croc must turn for home.
    const fx = w.x + w.r + CROC.LAND_RANGE + 15;
    player.pos.set(fx, terrainY(fx, w.z)+0.1, w.z);
    step(14.0, true);
    const endOut = Math.hypot(C.pos.x-w.x, C.pos.z-w.z) - w.r;
    rows.push({
      lunged, sawReturn, chasedPlayer,
      burstSpeed: Math.round(maxSpd*10)/10,
      burstDist:  Math.round(burstDist*10)/10,
      maxPastRim: Math.round(maxOut*10)/10,
      endPastRim: Math.round(endOut*10)/10,
      maxFrameStep: Math.round(maxJump*1000)/1000,
      homeState: C.state,
    });
  }
  detail.perCroc = rows;
  detail.landRange = CROC.LAND_RANGE;
  // the burst must beat a player sprint, or it is not an ambush
  detail.burstBeatsSprint = rows.every(r => r.burstSpeed > PLAYER.sprintSpeed);
  detail.allLunged        = rows.every(r => r.lunged);
  // …and it must genuinely reach well past the OLD 7 m ring, which is the whole complaint
  detail.oldRing = 7.0;
  detail.reachedPastOldRing = rows.every(r => r.maxPastRim > 10.0);
  detail.withinLandRange  = rows.every(r => r.maxPastRim <= CROC.LAND_RANGE + 0.6);
  detail.allReturned      = rows.every(r => r.sawReturn);
  detail.allGotHome       = rows.every(r => r.endPastRim <= CROC.BANK_MARGIN + 0.6);
  // no frame may exceed the burst speed's per-frame travel (with a little slack)
  const maxStep = CROC.SPD_CHARGE * CROC.BURST_MUL * DT * 1.35;
  detail.noTeleport = rows.every(r => r.maxFrameStep <= maxStep);
  detail.perFrameCap = Math.round(maxStep*1000)/1000;

  detail.everyCrocChasedThePlayer = rows.every(r => r.chasedPlayer);
  restoreOthers();
  saved.forEach(s=>{ s.C.pos.set(s.x, terrainY(s.x,s.z), s.z); s.C.mesh.position.copy(s.C.pos);
    s.C.state=s.st; s.C.health=s.hp; s.C.target=null; s.C.dryT=0; s.C.lungeT=0; s.C.lungeCd=0; });
  crocGrab.graceT = 0;
  pinPlayer();
  const pass = detail.allLunged && detail.burstBeatsSprint && detail.reachedPastOldRing &&
               detail.withinLandRange && detail.allReturned && detail.allGotHome &&
               detail.noTeleport && detail.everyCrocChasedThePlayer;
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
