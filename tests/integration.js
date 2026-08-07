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

// ---- 💧 DRY GROUND, OR THE TEST IS MEASURING A SWIM ---------------------------
// ⚠ READ THIS BEFORE HARD-CODING A COORDINATE IN THIS FILE. `chooseWaterHoles()` places
// three pools of radius 20–29 **at random, once per page load**, and `resetGame()`
// deliberately does not re-roll them. Every fixed spot in this suite is therefore a
// per-page-load coin flip, and a wet one fails in ways that look like a product
// regression: a bramble refuses to place ("too deep"), a tower is built underwater and
// the player swims instead of jumping, a lion walks a line of fences that were never
// there and takes 0 damage.
//
// This has now been found FOUR times: the mobile double-tap check (974c06e), the storey
// build site (2026-08-07, which made a "25/25 baseline" read 24/25), and both bramble
// tests plus the new fire test on the very next page load. Stop hard-coding. Ask.
//
// `clear` is how much dry ground the test needs AROUND the point — a fence line, a walk
// path, a tower footprint. Sampled on the rim as well as the centre, because a pond edge
// inside the footprint is still a pond.
function dryPatchNear(x0, z0, clear){
  clear = clear || 12;
  const dry = (x, z)=>{
    if(Math.abs(x) > MAPR-10 || Math.abs(z) > MAPR-10) return false;
    if(waterSpeedMul(x, z) !== 1) return false;
    for(let a=0; a<8; a++){
      const t = a*Math.PI/4;
      if(waterSpeedMul(x + Math.cos(t)*clear, z + Math.sin(t)*clear) !== 1) return false;
    }
    return true;
  };
  for(let ring=0; ring<=MAPR-30; ring+=8){
    for(let a=0; a<16; a++){
      const t = a*Math.PI/8;
      const x = x0 + Math.cos(t)*ring, z = z0 + Math.sin(t)*ring;
      if(dry(x, z)) return { x: Math.round(x), z: Math.round(z) };
    }
  }
  return { x:x0, z:z0 };            // nowhere dry → let it fail loudly rather than silently
}

// ---- 🚫 …AND EMPTY OF OTHER ANIMALS ------------------------------------------
// ⚠ Dry is not enough for a test that fires a PROJECTILE. `updateThrownRocks` walks the
// species blocks in order and stops at the first body it touches (`if(!hit) …`), so any
// creature that happens to be standing inside the hit cylinder absorbs the shot and the
// intended target scores 0 — which reads exactly like "this animal is immune", the bug
// those tests exist to catch.
//
// This bit on 2026-08-07 the moment hippos were added: six new pond animals with a ~3 m
// hit radius, and the porcupine weapon test intermittently scored spear/bolt/rock = 0
// because a hippo sat between the muzzle and the porcupine. Melee and the boomerang kept
// passing, which makes it a particularly nasty half-failure to read.
function clearGroundNear(x0, z0, clear, empty){
  clear = clear || 10; empty = empty || 24;
  const far = (x, z)=>{
    let ok = true;
    allCreatureLists().forEach(([list])=>{
      if(!ok || !list) return;
      for(let i=0;i<list.length;i++){
        const e = list[i];
        if(e && e.health > 0 && Math.hypot(e.pos.x-x, e.pos.z-z) < empty){ ok = false; return; }
      }
    });
    return ok;
  };
  for(let ring=0; ring<=MAPR-30; ring+=10){
    for(let a=0; a<24; a++){
      const t = a*Math.PI/12;
      const x = x0 + Math.cos(t)*ring, z = z0 + Math.sin(t)*ring;
      if(Math.abs(x) > MAPR-12 || Math.abs(z) > MAPR-12) continue;
      if(waterSpeedMul(x, z) !== 1) continue;
      const d = dryPatchNear(x, z, clear);
      if(d.x === Math.round(x) && d.z === Math.round(z) && far(x, z)) return d;
    }
  }
  return dryPatchNear(x0, z0, clear);      // fall back to dry-only rather than to nothing
}

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
    // ⚠ was a hard-coded (0,0) — see dryPatchNear. The fence line spans 12 m and the
    // walk runs from -4 to +16, so it needs a genuinely open 22 m of dry ground.
    const _s = dryPatchNear(0, 0, 22);
    const x0 = _s.x, z0 = _s.z;
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

  // ⚠ THE SINGLE-FENCE SUB-CASES NEED THEIR OWN DRY GROUND TOO. These three used a
  // hard-coded (0,0) and were the last survivors of the pond lottery — caught only by
  // deliberately dropping a 26 m pond on the origin. They scored 0/0/0 (fence refused,
  // "too deep") while the five-fence measurements above passed, which is a particularly
  // nasty half-failure to read. See dryPatchNear.
  const _o = dryPatchNear(0, 0, 14);
  const OX = _o.x, OZ = _o.z;
  clearBrambles(); brambleCount = 100; pinPlayer();
  placeAheadAt(OX, OZ, placeKitBramble);
  player.pos.set(OX, 0, OZ - 4); pinPlayer();
  let hp0 = player.health;
  for(let f=0; f<400 && player.pos.z < OZ + 6; f++){
    player.pos.z += 5.6/60; pinPlayer(false); updateBrambles(1/60);
  }
  detail.singleFence = r2(hp0 - player.health);

  // Damage is per CROSSING, so a victim who parks in the thorns is pricked exactly
  // once — "proximity doesn't chunk a stationary player". The slow is the punishment
  // for standing there.
  clearBrambles(); brambleCount = 100; pinPlayer();
  placeAheadAt(OX, OZ, placeKitBramble);
  player.pos.set(OX, 0, OZ); pinPlayer();
  hp0 = player.health;
  for(let f=0; f<300; f++){ pinPlayer(false); updateBrambles(1/60); }   // 5 s parked
  detail.parked5s = r2(hp0 - player.health);

  // …but stepping fully out and back in re-arms it, once RECHARGE has run.
  hp0 = player.health;
  for(let f=0; f<60; f++){ player.pos.z = OZ + 9; pinPlayer(false); updateBrambles(1/60); }  // out, 1 s
  for(let f=0; f<10; f++){ player.pos.z = OZ;     pinPlayer(false); updateBrambles(1/60); }  // back in
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
  // ⚠ was a hard-coded (60,60) — see dryPatchNear. On the page load that caught this,
  // a 21 m pond sat at (64,74) and every fence was refused, so the lion walked through
  // nothing at all and scored 0. That reads exactly like the bug this test guards.
  const _bs = dryPatchNear(60, 60, 22);
  const BX = _bs.x, BZ = _bs.z;
  for(let i=0;i<5;i++) placeAheadAt(BX, BZ + i*3.0, placeKitBramble);
  const L = lionMeshes[0];
  if(!L) return { pass:false, detail:'no lion on the map' };
  if(kitBrambles.length !== 5) return { pass:false, detail:{ placed:kitBrambles.length, site:_bs } };
  L.pos.set(BX, 0, BZ - 4);
  // ⚠ Accumulate the damage and top the lion back up every frame instead of reading
  // its end HP: a lion carries 58 and five fences are 100, so it DIES after three and
  // the raw before/after read scores a correct build as 60. (That is what this
  // assertion looked like on the first run — a test bug that mimics the real bug.)
  const dt = 1/60;
  let dealt = 0, bites = 0;
  for(let f=0; f<3000 && L.pos.z < BZ + 16; f++){
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
// ⚠ UPDATED 2026-08-07: a COBRA now drops THREE things — skin, spine and its morph's
// FANG — because Steven's crafted-item recipes are keyed on "red / green / blue / purple
// cobra fang" and no such drop existed. Pythons and worms are unchanged (neither has the
// hollow front fangs the recipes are about, and neither has a morph table). This test
// caught the change on the first run, which is what it is for; the assertion now pins the
// new contract, including that each morph's fang is DISTINCT — a table where all five
// cobras dropped one generic "cobra fang" would defeat the entire point of the recipes.
test('loot: serpents drop skin AND spine AND a per-morph fang; worms drop slime only', ()=>{
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
  // 🦷 EVERY morph must yield its OWN fang — multi-instance, all five at once, because a
  // table that collapsed them to one key would still pass a single-morph check while
  // making four of Steven's six cobra recipes uncraftable.
  const morphs = COBRA_COLORS.map(c=>c.id);
  detail.fangs = {};
  morphs.forEach(id=>{ detail.fangs[id] = cobraFangKey(fake(id)); });
  const fangKeys = morphs.map(id=>detail.fangs[id]);
  detail.fangsAllPresent  = fangKeys.every(k=>!!k && !!BONE_KINDS[k]);
  detail.fangsAllDistinct = new Set(fangKeys).size === morphs.length;
  detail.fangLabels = fangKeys.map(k=>BONE_KINDS[k].label);
  detail.fangLabelsDistinct = new Set(detail.fangLabels).size === morphs.length;
  // …and the colour NAMES must match what Steven asked for, morph by morph
  detail.namesMatchBrief = detail.fangs.crimson  === 'cobra_fang_crimson'  &&
                           detail.fangs.acid     === 'cobra_fang_acid'     &&
                           detail.fangs.midnight === 'cobra_fang_midnight' &&
                           detail.fangs.violet   === 'cobra_fang_violet';
  // a python and a worm must NOT gain a fang
  detail.pythonHasNoFang = cobraFangKey({ v: SNAKE_VARIANTS.python }) === null;
  detail.wormHasNoFang   = cobraFangKey({ v: SNAKE_VARIANTS.worm })   === null;
  // and the serpent drops must be genuinely different objects, not the same key repeated
  detail.acidLootDistinct = new Set(detail.acidLoot).size === detail.acidLoot.length;
  const pass = detail.acid === 'cobra_green' && detail.midnight === 'cobra' &&
               detail.python === 'python' && detail.worm === 'worm' &&
               detail.greenLabel === 'green cobra skin' && detail.isActuallyGreen &&
               detail.acidLoot.length === 3 && detail.pythonLoot.length === 2 &&
               detail.acidLoot[1] === 'serpent_spine' && detail.pythonLoot[1] === 'serpent_spine' &&
               detail.acidLoot[2] === 'cobra_fang_acid' && detail.acidLootDistinct &&
               detail.fangsAllPresent && detail.fangsAllDistinct && detail.fangLabelsDistinct &&
               detail.namesMatchBrief && detail.pythonHasNoFang && detail.wormHasNoFang &&
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
// ⚠ THE BUILD SITE IS CHOSEN AGAINST THE ACTUAL WORLD, NOT HARD-CODED — and that is the
// third time this exact bug has been found in this suite (see the mobile double-tap check,
// 974c06e). It used to be `const STOREY_X = 60, STOREY_Z = 60` with the comment "well clear
// of the ponds". It is not: `chooseWaterHoles()` places three pools of radius 20–29 at
// RANDOM, once per page load, and `resetGame()` deliberately does not re-roll them — so
// (60,60) is dry on some loads and 18 m under water on others. On a wet load the whole
// tower is built in a pond, the player swims instead of jumping, and the storey tests fail
// with numbers that look like a collision regression. Measured on the load that caught it:
// pond at (78,62) r=28, `terrainY(60,60) = -3.32`, `waterSpeedMul(60,60) = 1/3`.
//
// A fixed site cannot be right in a world with random water. Ask the world instead: sweep a
// grid and take the first spot whose whole build+walk footprint is dry. The footprint has to
// cover more than the tower — `walkedUnderTower` marches ±8 on X — so it is checked out to
// SITE_CLEAR, not just at the centre.
// ⚠ The tower footprint plus the ±8 X-axis walk in `walkedUnderTower` needs 12 m clear.
const SITE_CLEAR = 12;
function pickBuildSite(){ return dryPatchNear(60, 60, SITE_CLEAR); }
const _SITE = pickBuildSite();
const STOREY_X = _SITE.x, STOREY_Z = _SITE.z;
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
  // ⚠ Stand somewhere DRY and EMPTY before firing anything — see clearGroundNear. The
  // projectile chain stops at the first body it touches, so a bystander between the
  // muzzle and the porcupine makes a working weapon score 0.
  const _p = clearGroundNear(player.pos.x, player.pos.z, 8, 26);
  player.pos.set(_p.x, 0, _p.z); pinPlayer();
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
  // ⚠ …AND THIS LIST IS BUILT FROM THE REGISTRY, NOT BY HAND — it used to be a literal
  // `[].concat(preyMeshes, lionMeshes, dogMeshes, cheetahMeshes, snakeMeshes,
  // secretaryMeshes)`, and on 2026-08-07 it silently stopped being complete: crocs gained
  // GORILLAS as a valid target, gorillas were not in that list, and a croc that found one
  // near its pond chased it instead of the player. One row in three then read
  // `lunged:false, chasedPlayer:false` and the whole test failed intermittently — which
  // looks like a crocodile regression and is actually a stale list.
  // This is the SAME BUG SHAPE the session's product fixes were about, in the test file.
  // Build it from `allCreatureLists()` and a new species can never be forgotten again.
  const others = [];
  allCreatureLists().forEach(([list])=>{
    if(!list || list === crocMeshes) return;      // the crocs are the subject, not a distraction
    list.forEach(e=>{ if(e) others.push({ e, x:e.pos.x, z:e.pos.z }); });
  });
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
//  🐊 THE ROOF-REACH BUG — a croc must not grab you off an upper storey
// =====================================================================
// 🐛 Steven, live: standing on a second-storey roof, a crocodile on the ground below still
// grabbed him. Every reach test in the croc module was purely XZ, so a croc four metres
// below was, to the code, standing next to him — the same category error as
// `pushOutOfAABB` treating a wall as an infinite vertical column.
//
// ⚠ THE SHAPE THIS EXISTS TO CATCH is a fix that overreaches. The obvious repair is to
// gate on `playerOffGround()` like every other predator — and that would have DELETED the
// crocodile, because inside a pond `terrainY` is the dug bed, so a player swimming at the
// surface measures ~5.4 above the ground beneath them and reads as "off the ground". So
// this test asserts BOTH directions at once, at several heights, across every croc on the
// map: nothing is grabbable from up high, everything still is at ground level and in deep
// water. A lone "no grab happened" is also what a broken crocodile prints.
test('crocodile: cannot reach a player on a roof — but still takes one on the ground or swimming', ()=>{
  const crocs = crocMeshes.filter(C => C.health > 0);
  if(!crocs.length) return { pass:false, detail:'no crocodile on the map' };
  const detail = {}, DT = 1/60;
  if(crocGrab.croc) crocEndGrab(false);
  crocGrab.croc = null; crocGrab.taps = 0; crocGrab.graceT = 0;
  const saved = crocs.map(C => ({ C, x:C.pos.x, z:C.pos.z, st:C.state, hp:C.health }));

  // Park every other creature far away: `crocPickTarget` takes the NEAREST candidate, and
  // a pond is where the ecosystem congregates — a zebra closer than the player would make
  // "no grab" mean nothing. (Built from the registry, not by hand.)
  const others = [];
  allCreatureLists().forEach(([list])=>{
    if(!list || list === crocMeshes) return;
    list.forEach(e=>{ if(e) others.push({ e, x:e.pos.x, z:e.pos.z }); });
  });
  others.forEach(o=>{ o.e.pos.x += 5000; });

  // Put ONE croc on the bank beside a spot, hold the player at height `h` above the
  // terrain there, and run the real updateCrocodiles for N frames.
  const trial = (C, h, opts)=>{
    const w = C.pool;
    const bx = w.x + w.r + 2, bz = w.z;
    const ty = terrainY(bx, bz);
    // reset every croc so a leftover sortie from a previous trial can't bleed in
    crocs.forEach(X=>{ const ww = X.pool;
      X.pos.set(ww.x, terrainY(ww.x, ww.z), ww.z); X.mesh.position.copy(X.pos);
      X.state='CRUISE'; X.stateT=0; X.target=null; X.targetKind=null; X.dest=null;
      X.health=X.maxHealth; X.grabCd=0; X.biteCd=0; X.lungeCd=0; X.lungeT=0; X.dryT=0; });
    C.pos.set(bx - 1.2, ty, bz); C.mesh.position.copy(C.pos);
    if(crocGrab.croc) crocEndGrab(false);
    crocGrab.croc = null; crocGrab.graceT = 0;
    const place = ()=>{
      if(opts && opts.swim){
        player.pos.set(w.x, poolSurfaceY(w) - 0.4, w.z);
        player.onGround = false; player.swimming = true;
      } else {
        player.pos.set(bx, ty + h, bz);
        player.onGround = true; player.swimming = false;
      }
      player.vel.set(0,0,0); player.inTree = false; player.climbing = false;
      player.health = 100; player.hunger = 100; gameState = 'playing';
    };
    place();
    let grabbed = false; const hp0 = player.health;
    for(let f=0; f<420; f++){
      place();                       // hold the player pinned at the test height
      updateCrocodiles(DT);
      if(playerGrabbed()){ grabbed = true; break; }
    }
    const bitten = player.health < hp0 - 0.001;
    if(crocGrab.croc) crocEndGrab(false);
    crocGrab.croc = null; crocGrab.graceT = 0;
    return { grabbed, bitten };
  };

  // ---- 1. UP HIGH: every croc, at every elevation a player can actually stand at ----
  // 2.44 = a roof deck (ROOF.CLEARANCE 2.3 + half its thickness); 2.2 = a wall top;
  // 4.0 = Steven's "4 m platform"; 5.0 = a second storey.
  const HEIGHTS = [2.2, 2.44, 4.0, 5.0];
  const high = [];
  crocs.forEach((C, ci)=>{
    HEIGHTS.forEach(h=>{
      const r = trial(C, h);
      high.push({ croc:ci, h, grabbed:r.grabbed, bitten:r.bitten });
    });
  });
  detail.elevated = high;
  detail.elevatedTrials   = high.length;
  detail.grabsFromHeight  = high.filter(r=>r.grabbed).length;
  detail.bitesFromHeight  = high.filter(r=>r.bitten).length;

  // ---- 2. THE CONTROLS — the same crocs must still be lethal where they should be ----
  // ⚠ Without these, this test passes just as happily against a crocodile that has been
  // accidentally disabled outright.
  const ground = crocs.map((C, ci)=>({ croc:ci, ...trial(C, 0.1) }));
  const water  = crocs.map((C, ci)=>({ croc:ci, ...trial(C, 0.1, { swim:true }) }));
  detail.atGroundLevel = ground;
  detail.inDeepWater   = water;
  detail.grabsOnGround = ground.filter(r=>r.grabbed).length;
  detail.grabsSwimming = water.filter(r=>r.grabbed).length;

  // ---- 3. the predicate itself, including the trap it must not fall into ----
  const C0 = crocs[0], w0 = C0.pool;
  C0.pos.set(w0.x, terrainY(w0.x, w0.z), w0.z); C0.mesh.position.copy(C0.pos);
  player.pos.set(w0.x, poolSurfaceY(w0) - 0.4, w0.z);
  player.swimming = true; player.onGround = false; player.inTree = false; gameState = 'playing';
  detail.swimmerLooksOffGround = playerOffGround();          // TRUE — the trap
  detail.crocStillReachesSwimmer = crocCanReachPlayer(C0);   // …and must still be TRUE
  player.swimming = false;
  // ⚠ THE PROBE MUST STAND ON GENUINELY DRY LAND, and an early version used
  // `C0.pos.x + 3`, which lands INSIDE the pond whenever the croc is cruising mid-water.
  // Four metres above a pond BED is still a metre and a half UNDER the surface, so
  // `crocCanReachPlayer` correctly returned true and the probe scored a correct build as
  // broken. Use the bank, outside the rim, and assert it is dry before trusting the answer.
  const bankX = w0.x + w0.r + 4, bankZ = w0.z;
  const gy = terrainY(bankX, bankZ);
  detail.probeSpotIsDry = waterSpeedMul(bankX, bankZ) === 1;
  C0.pos.set(bankX - 1.5, terrainY(bankX - 1.5, bankZ), bankZ); C0.mesh.position.copy(C0.pos);
  player.pos.set(bankX, gy + 0.1, bankZ); player.onGround = true;
  detail.reachesOnGround = crocCanReachPlayer(C0);
  player.pos.y = gy + 4.0;
  detail.refusesOnPlatform = !crocCanReachPlayer(C0);
  player.inTree = true; player.pos.y = gy + 0.1;
  detail.refusesTreedPlayer = !crocCanReachPlayer(C0);
  player.inTree = false;

  // restore the world
  others.forEach(o=>{ o.e.pos.x = o.x; o.e.pos.z = o.z; });
  saved.forEach(s=>{ s.C.pos.set(s.x, terrainY(s.x, s.z), s.z); s.C.mesh.position.copy(s.C.pos);
    s.C.state = s.st; s.C.health = s.hp; s.C.target = null; s.C.targetKind = null; });
  if(crocGrab.croc) crocEndGrab(false);
  crocGrab.croc = null; crocGrab.graceT = 0;
  pinPlayer();

  const pass = detail.elevatedTrials >= 8 &&
               detail.grabsFromHeight === 0 && detail.bitesFromHeight === 0 &&
               detail.grabsOnGround === crocs.length &&      // the control, both ways
               detail.grabsSwimming === crocs.length &&
               detail.swimmerLooksOffGround && detail.crocStillReachesSwimmer &&
               detail.probeSpotIsDry &&
               detail.reachesOnGround && detail.refusesOnPlatform && detail.refusesTreedPlayer;
  return { pass, detail };
});

// =====================================================================
//  FEATURE 6 — a warthog you kill YOURSELF is worth 🪙100
// =====================================================================
// Multi-instance in the sense this file cares about: the bounty is driven through
// EVERY player weapon (melee, boomerang, thrown spear, pounce) and every non-player
// death (cheetah, wild dog pack, and a plain world death with no attacker at all),
// then the whole balance is asserted at once. A build that paid on any hog death,
// or paid twice for a corpse still sitting in preyMeshes, passes a one-weapon smoke
// test and fails this.
// ⚠ THE BOUNTY MOVED FROM WARTHOG TO GIRAFFE (2026-08-07). It was on the warthog for one
// day; Steven pulled it because it broke the economy exactly as its own shipping note
// predicted (open_defects #6) — a 30-HP hog that dies to ONE spear, spawns in 1-3s and is
// restocked by the ecosystem made the whole price table reachable on day 1-2.
// So this test now pins BOTH halves of that decision, because only asserting the new one
// would let the old one quietly keep paying: the giraffe pays the full bounty on every
// player weapon, and **the warthog pays exactly 0 to the same blow**.
// ⚠ The bounty rose 100 → 1000 on 2026-08-07c. The per-case assertions read `BOUNTY` off
// `KILL_BOUNTY.giraffe` rather than hard-coding a number, so they followed on their own —
// but `giraffeIsTheEarner` pins the literal on purpose, so a silent re-tune of the single
// most economy-shaping constant in the game cannot pass unnoticed.
test('bounty: only YOUR killing blow on a giraffe pays 1000 — and a warthog now pays 0', ()=>{
  pinPlayer();
  const detail = {}, spawned = [];
  const BOUNTY = KILL_BOUNTY.giraffe;
  const coinsBefore = progress.coins;          // restored at the end — the suite must not mint currency
  const tall = (x, z)=>{ const G = makePrey('giraffe', x, z, 'bounty-test'); spawned.push(G); return G; };

  // Ground with no other animal inside `r`, so the quarry put here is unambiguously the
  // one the pounce scan and the projectile find.
  // ⚠ The candidate list is built from the REGISTRY, not by hand — the hand-written
  // version here omitted crocs, hippos and porcupines, and a bystander inside a
  // projectile's hit cylinder absorbs the shot and scores the real target 0.
  const emptySpot = (r)=>{
    for(let k=0;k<400;k++){
      const x = rand(-MAPR+30, MAPR-30), z = rand(-MAPR+30, MAPR-30);
      if(waterSpeedMul(x, z) !== 1) continue;                       // dry land only
      let ok = true;
      allCreatureLists().forEach(([L])=>{
        if(!ok || !L) return;
        for(let i=0;i<L.length;i++){
          const e = L[i];
          if(e && Math.hypot(e.pos.x-x, e.pos.z-z) <= r){ ok = false; return; }
        }
      });
      if(ok) return { x, z };
    }
    return null;
  };
  // Every case is measured as a DELTA around one synchronous blow — no world update
  // runs inside the measurement, so nothing else on the map can move the balance.
  const cases = {};
  const blow = (name, fn)=>{
    const before = progress.coins;
    const H = fn();
    cases[name] = { paid: progress.coins - before, died: !!H && H.health <= 0 };
  };

  // ---- 1. THE PLAYER'S OWN KILLS — one giraffe per weapon, real damage numbers ----
  blow('melee_hammer', ()=>{ const G = tall(player.pos.x + 3, player.pos.z);
    dealKitMelee({ kind:'prey', o:G }, 67, MELEE_TOOL.hammer); return G; });
  blow('boomerang', ()=>{ const G = tall(player.pos.x - 3, player.pos.z);
    boomerangStrike('prey', G); return G; });

  // The spear goes through the REAL updateThrownRocks path (projHit, damage table,
  // kill line) — cleared first so no stray projectile from an earlier test is in flight.
  // ⚠ A GIRAFFE TAKES THREE SPEARS, and that is the whole point of moving the bounty on
  // to it: `updateThrownRocks` special-cases the species at `maxHealth/3`, where a warthog
  // takes the full `maxHealth` from one throw. So this case throws until it drops and
  // asserts the count — if a future edit made a giraffe a one-spear kill, the bounty would
  // silently become farmable again and this is the line that would notice.
  thrownRocks.length = 0;
  let spearsNeeded = 0;
  blow('thrown_spear', ()=>{
    const s = emptySpot(20); if(!s) return null;
    const G = tall(s.x, s.z);
    for(let n=0; n<6 && G.health > 0; n++){
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1,4,3), new THREE.MeshBasicMaterial());
      m.position.set(G.pos.x, G.pos.y + 0.5, G.pos.z); scene.add(m);
      thrownRocks.push({ mesh:m, vel:new THREE.Vector3(0,0,0.01), dist:0, mult:1, spear:true });
      updateThrownRocks(1/60);
      spearsNeeded++;
    }
    return G;
  });
  thrownRocks.length = 0;
  detail.spearsToDownAGiraffe = spearsNeeded;

  // The pounce path stays in the set because it is the one weapon whose bounty call sits
  // outside a conditional branch (the warthog's gore-back), so it is the call site most
  // likely to be broken by an edit. Needs the necklace gate, an empty patch, and a camera
  // actually looking at the animal.
  const sp = { x:player.pos.x, z:player.pos.z }, ownedNecklace = hasNecklace();
  blow('pounce', ()=>{
    const s = emptySpot(14); if(!s) return null;
    if(!ownedNecklace) progress.accessories.push('lion_necklace');
    player.pos.set(s.x, terrainY(s.x, s.z), s.z); pinPlayer();
    const G = tall(s.x, s.z + 2.5);
    camera.position.set(player.pos.x, player.pos.y + 1.7, player.pos.z);
    camera.lookAt(G.pos.x, G.pos.y + 0.5, G.pos.z);
    player._pounceCd = 0; player._hidden = false; player.crouching = false;
    pouncePrey();
    return G;
  });
  if(!ownedNecklace){ const i = progress.accessories.indexOf('lion_necklace'); if(i >= 0) progress.accessories.splice(i,1); }
  player.pos.set(sp.x, terrainY(sp.x, sp.z), sp.z); player.knockback.set(0,0,0); pinPlayer();

  // ---- 2. DEATHS THAT ARE NOT YOURS — must pay nothing ----
  // Real predator bite functions, driven the way the game drives them.
  const C = cheetahMeshes[0], D = dogMeshes[0];
  if(C){
    const st = { t:C.target, k:C.targetKind };
    blow('cheetah_kill', ()=>{ const G = tall(player.pos.x + 6, player.pos.z);
      C.target = G; C.targetKind = 'prey'; cheetahBite(C); return G; });
    C.target = st.t; C.targetKind = st.k;
  }
  if(D){
    const st = D._preyTarget;
    blow('wilddog_kill', ()=>{ const G = tall(player.pos.x - 6, player.pos.z);
      D._preyTarget = G; dogBite(D,'prey'); dogBite(D,'prey'); return G; });   // 22 a bite — the pack needs two
    D._preyTarget = st;
  }
  // …and a death with no attacker at all (fell off a cliff / drowned / starved).
  blow('no_attacker', ()=>{ const G = tall(player.pos.x, player.pos.z + 6); G.health = 0; return G; });

  // ---- 2b. ⚠ THE WARTHOG MUST NOW PAY NOTHING ----
  // The half of Steven's decision that is easy to leave untested. Same weapons, same
  // delta measurement, a species that used to pay 100 — every one must read 0.
  const hog = (x, z)=>{ const H = makePrey('warthog', x, z, 'bounty-test'); spawned.push(H); return H; };
  blow('warthog_melee', ()=>{ const H = hog(player.pos.x + 9, player.pos.z);
    dealKitMelee({ kind:'prey', o:H }, 67, MELEE_TOOL.hammer); return H; });
  blow('warthog_boomerang', ()=>{ const H = hog(player.pos.x - 9, player.pos.z);
    boomerangStrike('prey', H); return H; });

  // ---- 3. THE REAP MUST NOT PAY AGAIN ----
  // Every corpse above is still sitting in preyMeshes. updatePrey turns them into
  // carcasses and killObj's the meshes; not one coin may fall out of that loop.
  const beforeReap = progress.coins;
  updatePrey(0.05);
  detail.reapPaid   = progress.coins - beforeReap;
  detail.allReaped  = spawned.every(H => preyMeshes.indexOf(H) < 0);   // disposal ran on every one

  // ---- assertions ----
  const mine   = ['melee_hammer','boomerang','thrown_spear','pounce'];
  const theirs = ['cheetah_kill','wilddog_kill','no_attacker'].filter(k => cases[k]);
  const hogs   = ['warthog_melee','warthog_boomerang'];
  detail.bounty     = BOUNTY;
  detail.cases      = cases;
  detail.playerKillsPaid   = mine.map(k => cases[k] && cases[k].paid);
  detail.nonPlayerKillsPaid= theirs.map(k => cases[k] && cases[k].paid);
  detail.warthogKillsPaid  = hogs.map(k => cases[k] && cases[k].paid);
  detail.everyKillLanded   = mine.concat(theirs, hogs).every(k => cases[k] && cases[k].died);
  detail.eachPlayerKillPaidExactly = mine.every(k => cases[k] && cases[k].paid === BOUNTY);
  detail.noNonPlayerKillPaid       = theirs.every(k => cases[k].paid === 0);
  // ⚠ the moved-off half: a warthog killed by the player's own blow pays exactly 0
  detail.warthogPaysNothing        = hogs.every(k => cases[k].paid === 0);
  detail.warthogOffTheTable        = KILL_BOUNTY.warthog === undefined;
  detail.giraffeIsTheEarner        = KILL_BOUNTY.giraffe === 1000;
  // …and a giraffe must genuinely be 3 spears, not 1 — the reason it can hold the bounty
  detail.giraffeTakesThreeSpears   = spearsNeeded === 3;
  detail.totalPaid  = progress.coins - coinsBefore;
  detail.expectTotal= mine.length * BOUNTY;

  const pass = detail.everyKillLanded && detail.eachPlayerKillPaidExactly &&
               detail.noNonPlayerKillPaid && detail.reapPaid === 0 &&
               detail.allReaped && detail.totalPaid === detail.expectTotal &&
               detail.warthogPaysNothing && detail.warthogOffTheTable &&
               detail.giraffeIsTheEarner && detail.giraffeTakesThreeSpears;

  progress.coins = coinsBefore; saveProgress();    // leave the player's purse as we found it
  pinPlayer();
  return { pass, detail };
});

// =====================================================================
//  🌿 THE BRAMBLE COVERAGE BUG  (2026-08-07)
// =====================================================================
// ⚠ THE BUG SHAPE: `updateBrambles` ended in a hand-written list of nine species arrays,
// and `crocMeshes` was not one of them — so a crocodile crossed a thorn fence for ZERO.
// A test that only walked a lion through would have passed the whole time it was broken.
// So this drives ONE MEMBER OF EVERY SPECIES ARRAY IN THE GAME through a real fence and
// asserts that not one of them is free — and it reads the species list from the registry
// itself, so a creature added tomorrow is covered without editing this file.
test('bramble: every creature in the registry takes damage, none crosses free', ()=>{
  clearBrambles(); pinPlayer();
  const detail = {}, DT = 1/60;
  // A fence somewhere dry and empty, well away from the player.
  const site = dryPatchNear(60, 60, 14);      // ⚠ ask for the fence's own dry patch —
  const fx = site.x, fz = site.z;            // do NOT offset off a site verified elsewhere
  brambleCount = 99;
  detail.placed = placeAheadAt(fx, fz, ()=>placeKitBramble());
  const fence = kitBrambles[kitBrambles.length-1];
  if(!fence) return { pass:false, detail:{ error:'fence refused', site, placed:detail.placed } };

  // One live member of every registry list, stood ON the fence, topped up each frame so
  // nothing dies mid-measurement (the documented trap: never read end-HP when the
  // expected damage exceeds the victim's pool).
  const seen = {}, taken = {}, expected = {};
  allCreatureLists().forEach(([list, kind])=>{
    if(!list || !list.length) return;
    const e = list.find(o => o.health > 0 && !o.dying);
    if(!e) return;
    seen[kind] = true;
    expected[kind] = brambleDamageFor(e, kind);
    const home = { x:e.pos.x, y:e.pos.y, z:e.pos.z };
    e.pos.set(fence.pos.x, terrainY(fence.pos.x, fence.pos.z), fence.pos.z);
    if(e.mesh) e.mesh.position.copy(e.pos);
    e._brambleCds = {};                       // fresh crossing
    let acc = 0;
    for(let f=0; f<4; f++){
      const before = e.health;
      updateBrambles(DT);
      acc += Math.max(0, before - e.health);
      e.health = e.maxHealth;                 // top up — measure damage, not survival
    }
    taken[kind] = Math.round(acc*100)/100;
    e.pos.set(home.x, home.y, home.z); if(e.mesh) e.mesh.position.copy(e.pos);
  });
  detail.speciesTested = Object.keys(seen).length;
  detail.damage = taken;
  detail.expected = expected;
  // ⚠ ASSERT THE ZEROES: the failure this exists to catch is a species scoring 0.
  detail.freeCrossers = Object.keys(taken).filter(k => !(taken[k] > 0));
  detail.wrongAmount  = Object.keys(taken).filter(k => Math.abs(taken[k] - expected[k]) > 0.01);
  // …and the crocodile specifically, because it is the one that was broken.
  detail.crocCovered = taken.crocodile > 0;
  detail.crocPerTemplate = taken.crocodile === BRAMBLE_DMG.crocodile;
  // per-template must actually DIFFER, or the table is decorative
  detail.templatesDiffer = new Set(Object.values(expected)).size > 1;

  clearBrambles(); pinPlayer();
  const pass = detail.placed && detail.speciesTested >= 8 &&
               detail.freeCrossers.length === 0 && detail.wrongAmount.length === 0 &&
               detail.crocCovered && detail.crocPerTemplate && detail.templatesDiffer;
  return { pass, detail };
});

// =====================================================================
//  👻 PLACEMENT PREVIEWS  (2026-08-07)
// =====================================================================
// ⚠ THE SHAPE: a preview that recomputes its own target is a preview that can LIE. Every
// placeable has exactly one `*PlacementPlan()`, and the ghost and the placer both read it.
// So this asserts the two agree for ALL FOUR placeables — not one — and that a refused
// plan builds nothing and charges nothing.
test('ghosts: all four placeables preview exactly where they land, and refuse in red', ()=>{
  clearWalls(); clearRoofs(); clearBrambles(); pinPlayer();
  const detail = {}, X = STOREY_X, Z = STOREY_Z;
  woodCount = 9000; rockCount = 9000; brambleCount = 9000;
  // ⚠ Each sub-case gets its OWN dry patch rather than an offset off X — an offset
  // leaves the verified-dry radius and is the pond lottery again. See dryPatchNear.
  const spot = (dx, dz)=>dryPatchNear(X + dx, Z + dz, 8);
  standAt(X, terrainY(X, Z) + 0.1, Z); yaw = Math.PI;

  // ---- 1. every tool has a ghost, and only ONE is ever visible ----
  const ids = ['kit_wall','kit_stonewall','kit_gate','kit_roof','kit_bramble'];
  detail.allToolsHaveGhosts = ids.every(id => !!GHOST_FOR[id]);
  const visibleFor = id => { progress.abilities[progress.activeAbility] = id;
    gameState = 'playing'; updatePlacementGhosts();
    return Object.keys(_ghosts).filter(k => _ghosts[k].visible); };
  detail.oneAtATime = ids.every(id => visibleFor(id).length === 1);
  progress.abilities[progress.activeAbility] = 'kit_axe';
  detail.noneWhenNotBuilding = visibleFor('kit_axe').length === 0;

  // ---- 2. THE GHOST AND THE PLACER AGREE, for each placeable ----
  // Drawn position vs where the real object actually lands. This is the whole contract.
  const agree = {};
  const drawnAt = id => { progress.abilities[progress.activeAbility] = id;
    updatePlacementGhosts(); const g = _ghosts[GHOST_FOR[id].key];
    return { x:g.position.x, z:g.position.z }; };
  standAt(X, terrainY(X, Z) + 0.1, Z); yaw = Math.PI;
  let d = drawnAt('kit_wall');  placeKitWall(false);
  const w = wallMeshes[wallMeshes.length-1];
  agree.wall = Math.hypot(w.position.x - d.x, w.position.z - d.z) < 0.01;
  let sp = spot(12, 0);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z); yaw = Math.PI;
  d = drawnAt('kit_bramble'); placeKitBramble();
  const b = kitBrambles[kitBrambles.length-1];
  agree.bramble = Math.hypot(b.pos.x - d.x, b.pos.z - d.z) < 0.01;
  sp = spot(24, 0);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z); yaw = Math.PI;
  d = drawnAt('kit_gate'); placeKitGate();
  const gt = kitGates[kitGates.length-1];
  agree.gate = Math.hypot(gt.mesh.position.x - d.x, gt.mesh.position.z - d.z) < 0.01;
  sp = spot(36, 0);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z);
  d = drawnAt('kit_roof'); placeKitRoof();
  const rf = kitRoofs[kitRoofs.length-1];
  agree.roof = Math.hypot(rf.mesh.position.x - d.x, rf.mesh.position.z - d.z) < 0.01;
  detail.ghostMatchesPlacement = agree;
  detail.allAgree = Object.keys(agree).every(k => agree[k]);

  // ---- 3. RED MEANS REFUSED, AND REFUSED MEANS FREE ----
  const refusals = {};
  // a wall on top of a wall
  standAt(X, terrainY(X, Z) + 0.1, Z); yaw = Math.PI;
  const woodBefore = woodCount, wallsBefore = kitWalls.length;
  refusals.wallOccupied = ghostKeyFor(wallPlacementPlan()) === 'blocked';
  refusals.wallRefused  = placeKitWall(false) === false;
  refusals.wallFree     = (woodCount === woodBefore && kitWalls.length === wallsBefore);
  // a roof in mid-air
  player.onGround = false;
  refusals.roofMidAir = ghostKeyFor(roofPlacementPlan()) === 'blocked';
  const roofsBefore = kitRoofs.length, woodBefore2 = woodCount;
  refusals.roofRefused = placeKitRoof() === false;
  refusals.roofFree = (kitRoofs.length === roofsBefore && woodCount === woodBefore2);
  player.onGround = true;
  // a free-standing gate is AMBER — legal, but flagged
  sp = spot(-60, 0);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z); yaw = Math.PI;
  refusals.loneGateIsAmber = ghostKeyFor(gatePlacementPlan()) === 'warn';
  refusals.loneGateStillPlaces = placeKitGate() === true;
  detail.refusals = refusals;
  detail.refusalsHold = Object.keys(refusals).every(k => refusals[k]);

  // ---- 4. a corner join must NOT read as occupied, or you cannot build a ring ----
  sp = spot(60, 0);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z); yaw = Math.PI;   placeKitWall(false);
  standAt(sp.x, terrainY(sp.x, sp.z) + 0.1, sp.z); yaw = Math.PI/2;
  detail.cornerNotBlocked = ghostKeyFor(wallPlacementPlan()) === 'ground';

  clearWalls(); clearRoofs(); clearBrambles(); pinPlayer();
  const pass = detail.allToolsHaveGhosts && detail.oneAtATime && detail.noneWhenNotBuilding &&
               detail.allAgree && detail.refusalsHold && detail.cornerNotBlocked;
  return { pass, detail };
});

// =====================================================================
//  🦛 THE HIPPO  (2026-08-07)
// =====================================================================
// ⚠ MULTI-INSTANCE: every hippo on the map is driven, not one. The two triggers point
// OPPOSITE ways (crowd it → charge, hurt it → retreat) and a single-instance check could
// pass while one pond's hippo was stuck — so both are asserted across the whole population.
test('hippo: floats, swims faster than it walks, charges when crowded, bolts when hurt', ()=>{
  pinPlayer();
  const detail = {}, DT = 1/60;
  detail.population = hippoMeshes.length;
  if(!detail.population) return { pass:false, detail:{ error:'no hippos spawned' } };
  // park the player far away so nothing is provoked by the measurement itself
  const home = { x:player.pos.x, z:player.pos.z };
  player.pos.set(-MAPR+10, 0, -MAPR+10); pinPlayer();

  // ---- 1. EVERY hippo floats at its pond's surface, not on the bed ----
  hippoMeshes.forEach(H=>{ H.state='WALLOW'; H.calmT=99; H.stunTimer=0;
    H.pos.set(H.pool.x, terrainY(H.pool.x, H.pool.z), H.pool.z); H.mesh.position.copy(H.pos); });
  for(let i=0;i<200;i++) updateHippos(DT);
  // ⚠ THE ASSERTION IS CONDITIONAL ON BEING IN WATER, and the first version was not —
  // which made it fail for a legitimate reason. A hippo runs a live FSM: 200 frames in,
  // one of them had wandered into the shallows at the rim to graze, where the correct
  // height IS the terrain. Demanding every hippo sit at the float line at an arbitrary
  // moment asserts that the animal never does anything, which is the opposite of the
  // design. Assert the RULE ("in water → at the water line"), not a snapshot.
  detail.depths = hippoMeshes.map(H => ({ inWater: hippoInWater(H),
                                          depth: r2(H.pos.y - poolSurfaceY(poolAt(H.pos.x,H.pos.z) || H.pool)) }));
  // ⚠ Assert the SCALED depth, not the base constant. `HIPPO.FLOAT_DEPTH` is authored for
  // a scale-1.0 hippo and `hippoFloatDepth()` multiplies it through `HIPPO_SCALE` — so
  // when the hippo was resized to match the rhino (1.0 → 1.24) this assertion started
  // measuring 1.30 against a correct 1.61. Read the function the engine reads.
  detail.floatDepthExpected = r2(hippoFloatDepth());
  detail.allFloat = hippoMeshes.every(H => !hippoInWater(H) ||
    Math.abs((H.pos.y - poolSurfaceY(poolAt(H.pos.x,H.pos.z) || H.pool)) + hippoFloatDepth()) < 0.05);
  detail.someInWater = hippoMeshes.filter(H => hippoInWater(H)).length;
  // …plus the deterministic half: dropped on the BED at its pond centre, every hippo must
  // rise to the surface. This is the bug that shipped — buoyancy that only ran while the
  // animal was walking, so one that spawned on the bed stayed 3.66 m under.
  const bedTest = hippoMeshes.map(H=>{
    H.pos.set(H.pool.x, terrainY(H.pool.x, H.pool.z), H.pool.z); H.mesh.position.copy(H.pos);
    H.state = 'WALLOW'; H.calmT = 99;
    for(let i=0;i<120;i++) hippoFloat(H, DT);
    return r2(H.pos.y - poolSurfaceY(H.pool));
  });
  detail.roseOffTheBed = bedTest;
  detail.noneOnTheBed = bedTest.every(d => Math.abs(d + hippoFloatDepth()) < 0.05);

  // ---- 2. WATER DOES NOT SLOW IT — the "swims when in water" rule ----
  // Same hippo, same speed argument, same frame count: in its pond vs on dry bank.
  const H0 = hippoMeshes[0], w0 = H0.pool;
  const runFor = (inWater)=>{
    if(inWater) H0.pos.set(w0.x, poolSurfaceY(w0)-HIPPO.FLOAT_DEPTH, w0.z);
    else { const bx = w0.x + w0.r + 8; H0.pos.set(bx, terrainY(bx, w0.z), w0.z); }
    H0.mesh.position.copy(H0.pos);
    const s = { x:H0.pos.x, z:H0.pos.z };
    for(let i=0;i<60;i++) hippoStep(H0, H0.pos.x + 3, H0.pos.z, HIPPO.SPEED_ROAM, DT);
    return r2(Math.hypot(H0.pos.x-s.x, H0.pos.z-s.z));
  };
  detail.distInWater = runFor(true);
  detail.distOnLand  = runFor(false);
  detail.swimsFasterThanItWalks = detail.distInWater > detail.distOnLand;

  // ---- 3. HURT → RETREAT, for EVERY hippo, and it must actually reach water ----
  const retreats = [];
  hippoMeshes.forEach(H=>{
    const w = H.pool, bx = w.x + w.r + 13;
    H.pos.set(bx, terrainY(bx, w.z), w.z); H.mesh.position.copy(H.pos);
    H.state='GRAZE'; H.calmT=0; H.stunTimer=0; H.health=H.maxHealth; H._prevHealth=H.health;
    H.health -= 25;                                  // any damage at all
    updateHippos(DT);
    const went = H.state === 'RETREAT';
    // ⚠ MEASURE THE TRANSITION, NOT THE AFTERMATH. The first version asserted
    // `hippoInWater(H)` after 900 frames and failed on a CORRECT build: the hippo reaches
    // its pond around frame 200, switches to WALLOW, and then goes on living — by frame
    // 700 it may legitimately be grazing the shallows again. "Did it get to water" is a
    // question about the retreat; "is it in water 15 s later" is a question about nothing.
    let arrived = false, arrivedAt = -1;
    for(let i=0;i<900 && !arrived;i++){
      updateHippos(DT);
      if(hippoInWater(H)){ arrived = true; arrivedAt = i; }
    }
    retreats.push({ enteredRetreat: went, reachedWater: arrived, atFrame: arrivedAt });
    H.health = H.maxHealth; H._prevHealth = H.health;
  });
  detail.retreats = retreats;
  detail.allRetreated = retreats.every(r => r.enteredRetreat && r.reachedWater);

  // ---- 4. CROWDED → CHARGE, and the gore is the number ----
  player.pos.set(home.x, 0, home.z); pinPlayer();
  const H1 = hippoMeshes[0], w1 = H1.pool;
  const bank = { x:w1.x + w1.r + 6, z:w1.z };
  H1.pos.set(bank.x, terrainY(bank.x, bank.z), bank.z); H1.mesh.position.copy(H1.pos);
  H1.state='GRAZE'; H1.calmT=0; H1.health=H1.maxHealth; H1._prevHealth=H1.health; H1.stunTimer=0;
  progress.accessories = [null, null]; EQUIP = computeEquipMods();   // no cloak in the way
  player.pos.set(bank.x + 5, 0, bank.z); pinPlayer(false);
  dn.isDay = true;
  // ⚠ Give the STAGGERED target scan time to fire. `hippoPickTarget` is the hippo's
  // dominant per-frame cost, so it runs once every `HIPPO.SCAN_EVERY` frames offset by
  // index — a single `updateHippos(DT)` may land on a frame that does not scan. Asserting
  // after one frame started failing the moment that optimisation went in, on a hippo that
  // charges perfectly well two frames later. Worst case here is ~100 ms, against a 9 m
  // trigger radius.
  let framesToCharge = 0;
  for(; framesToCharge < HIPPO.SCAN_EVERY + 2 && H1.state !== 'CHARGE'; framesToCharge++) updateHippos(DT);
  detail.framesToCharge = framesToCharge;
  detail.chargedWhenCrowded = H1.state === 'CHARGE' && H1.targetKind === 'player';
  detail.tookNoDamageToProvoke = H1.health === H1.maxHealth;
  // …the tusk thrust itself
  player.pos.set(H1.pos.x + 2.5, 0, H1.pos.z); pinPlayer(false);
  player.health = 100; H1.goreCd = 0;
  updateHippos(DT);
  detail.goreDamage = r2(100 - player.health);
  detail.goreIsTheNumber = Math.abs(detail.goreDamage - HIPPO.GORE_DMG) < 0.01;

  // ---- 5. NIGHT: it leaves the water, and the 70 m leash HOLDS ----
  player.pos.set(-MAPR+10, 0, -MAPR+10); pinPlayer();
  dn.isDay = false;
  // ⚠ PICK THE HIPPO WITH ROOM TO ROAM, not hippoMeshes[0]. Ponds are placed at random and
  // one can sit hard against the map edge — and both the ROAM destination and `hippoStep`
  // clamp to the boundary, so a hippo whose pond is 50 m from the rim physically cannot
  // demonstrate a 70 m range however correct the code is. Measured: this failed twice on a
  // load whose first pond was at z = -192 with MAPR 244, and passed on the next layout.
  // The claim under test is "at night it ranges past grazing distance"; give it a pond
  // that can express that. (Same lesson as dryPatchNear — control for world geometry the
  // test does not own.)
  const roomiest = hippoMeshes.slice().sort((a, b)=>{
    const room = H => MAPR - Math.max(Math.abs(H.pool.x), Math.abs(H.pool.z)) - H.pool.r;
    return room(b) - room(a);
  })[0];
  const H2 = roomiest, w2 = H2.pool;
  detail.roamPondClearance = r2(MAPR - Math.max(Math.abs(w2.x), Math.abs(w2.z)) - w2.r);
  H2.state='ROAM'; H2.calmT=99; H2.dest=null; H2.health=H2.maxHealth; H2._prevHealth=H2.health;
  // ⚠ ROAM picks a RANDOM destination in the ring every ~9 s, so how far it actually gets
  // in a fixed window is luck. A 100 s window scored 36.8 m against a 41.4 m bar and failed
  // a correct build. Run long enough that the random walk has to leave the shore (300 s of
  // game time), and keep the bar at what the DAY leash would allow — the claim being tested
  // is "at night it goes further than grazing range", not "it reaches exactly X".
  let maxD = 0;
  for(let i=0;i<18000;i++){ updateHippos(DT);
    maxD = Math.max(maxD, Math.hypot(H2.pos.x-w2.x, H2.pos.z-w2.z)); }
  detail.nightMaxDist  = r2(maxD);
  detail.dayLeash      = r2(w2.r + HIPPO.GRAZE_RANGE);
  detail.nightLeash    = r2(w2.r + HIPPO.NIGHT_RANGE);
  detail.leftTheWater  = maxD > w2.r + HIPPO.GRAZE_RANGE;
  detail.leashHeld     = maxD <= w2.r + HIPPO.NIGHT_RANGE + 0.5;

  // ---- 6. it shares the pond: NO croc was harmed by any of the above ----
  detail.crocsAlive = crocMeshes.length;
  detail.crocsUnharmed = crocMeshes.every(C => C.health === C.maxHealth);

  dn.isDay = true;
  player.pos.set(home.x, 0, home.z); pinPlayer();
  hippoMeshes.forEach(H=>{ H.health = H.maxHealth; H._prevHealth = H.health; H.state='WALLOW'; });
  const pass = detail.allFloat && detail.noneOnTheBed && detail.swimsFasterThanItWalks &&
               detail.allRetreated && detail.chargedWhenCrowded && detail.tookNoDamageToProvoke &&
               detail.goreIsTheNumber && detail.leftTheWater && detail.leashHeld &&
               detail.crocsUnharmed;
  return { pass, detail };
});

// =====================================================================
//  ⚒️ THE CRAFTED TIER  (2026-08-07)
// =====================================================================
// ⚠ MULTI-INSTANCE over the CATALOGUE: all eleven recipes are gated, priced and spent —
// not one sampled item. The failure being guarded against is the one the old three-slot
// craft system would have produced: a recipe whose material key nothing checks, so the
// item is silently free.
test('craft: all eleven recipes gate on their material, charge it, and none is free', ()=>{
  pinPlayer();
  const detail = {}, IDS = ['gorilla_club','fire_wand','cobra_dagger','poison_bottle',
    'slime_flask','croc_grabber','invis_cloak','retal_cloak','endurance_charm',
    'python_coil','night_shoes'];
  const coins0 = progress.coins, unlocked0 = new Set(progress.unlocked);
  const bones0 = JSON.stringify(boneCounts);
  detail.count = IDS.length;
  detail.allInCatalogue = IDS.every(id => !!SHOP_BY_ID[id]);
  detail.allPriced      = IDS.every(id => itemPrice(id) > 0);
  detail.allHaveRecipe  = IDS.every(id => { const c = SHOP_BY_ID[id].craft;
    return c && Object.keys(c).length > 0; });
  // every material key must be REAL — a typo here is an uncraftable item
  detail.unknownMaterials = [];
  IDS.forEach(id => Object.keys(SHOP_BY_ID[id].craft).forEach(k => {
    if(!BONE_KINDS[k] && !LEGACY_MAT[k]) detail.unknownMaterials.push(id+':'+k); }));

  // ---- with coins but NO materials, every single one must refuse ----
  progress.coins = 100000;
  IDS.forEach(id => progress.unlocked.delete(id));
  boneCounts = {}; toothCount = 0; tuskCount = 0; hornCount = 0;
  detail.refusedWithoutMaterial = IDS.filter(id => { unlockItem(id);
    return !progress.unlocked.has(id); }).length;

  // ---- give exactly the recipe, and every one must unlock AND consume it ----
  const charged = {};
  IDS.forEach(id => {
    const c = SHOP_BY_ID[id].craft;
    boneCounts = {}; toothCount = 0; tuskCount = 0; hornCount = 0;
    for(const k in c) boneCounts[k] = c[k];              // exactly enough, no slack
    progress.unlocked.delete(id);
    const before = {}; for(const k in c) before[k] = craftMatHave(k);
    unlockItem(id);
    const after = {}; for(const k in c) after[k] = craftMatHave(k);
    charged[id] = { got: progress.unlocked.has(id),
                    spent: Object.keys(c).every(k => before[k] - after[k] === c[k]) };
  });
  detail.charged = charged;
  detail.allUnlocked   = IDS.every(id => charged[id].got);
  detail.allChargedMat = IDS.every(id => charged[id].spent);

  // ---- 🟡 THE GOLD FANG IS A WILDCARD, and it is spent LAST ----
  boneCounts = { cobra_fang_gold: 1 };
  detail.goldCoversEveryColour = ['fire_wand','cobra_dagger','poison_bottle','invis_cloak']
    .every(id => canCraft(SHOP_BY_ID[id]));
  boneCounts = { cobra_fang_crimson: 1, cobra_fang_gold: 1 };
  craftMatSpend('cobra_fang_crimson', 1);
  detail.spendsColouredFirst = boneCounts.cobra_fang_crimson === 0 && boneCounts.cobra_fang_gold === 1;
  craftMatSpend('cobra_fang_crimson', 1);
  detail.fallsBackToGold = boneCounts.cobra_fang_gold === 0;
  // …and an ordinary material must NOT be wildcarded by it
  boneCounts = { cobra_fang_gold: 5 };
  detail.goldIsNotUniversal = !canCraft(SHOP_BY_ID['night_shoes']);

  // ---- the legacy three-slot recipes still mean what they always meant ----
  boneCounts = {}; tuskCount = 1;
  detail.legacyStillWorks = canCraft(SHOP_BY_ID['kit_boomerang']);
  tuskCount = 0;
  detail.legacyStillGates = !canCraft(SHOP_BY_ID['kit_boomerang']);

  // restore everything this test touched
  progress.coins = coins0; progress.unlocked = unlocked0;
  boneCounts = JSON.parse(bones0); toothCount = 0; tuskCount = 0; hornCount = 0;
  saveProgress(); pinPlayer();
  const pass = detail.allInCatalogue && detail.allPriced && detail.allHaveRecipe &&
               detail.unknownMaterials.length === 0 &&
               detail.refusedWithoutMaterial === IDS.length &&
               detail.allUnlocked && detail.allChargedMat &&
               detail.goldCoversEveryColour && detail.spendsColouredFirst &&
               detail.fallsBackToGold && detail.goldIsNotUniversal &&
               detail.legacyStillWorks && detail.legacyStillGates;
  return { pass, detail };
});

// =====================================================================
//  🔥 FIRE PROPAGATION  (2026-08-07)
// =====================================================================
// ⚠ MULTI-INSTANCE BY CONSTRUCTION: a LINE of fences, because "fire spreads" that only
// ever consumed the one fence you shot would pass a single-instance check. Also asserts
// the three bounds — the cap, the burn-out, and the disposal — because an unbounded
// spreading fire on a 500×500 map of grass is a game-ending bug, not a feature.
test('fire: spreads down a line of fences, consumes them, then burns out leaving nothing', ()=>{
  clearGroundPatches(); clearBrambles(); pinPlayer();
  const detail = {}, DT = 1/60;
  const site = dryPatchNear(-60, -60, 20);    // ⚠ its own dry patch, not an offset
  const bx = site.x, bz = site.z;
  brambleCount = 999;
  for(let i=0;i<4;i++) placeAheadAt(bx + i*3, bz, ()=>placeKitBramble());
  detail.fencesBefore = kitBrambles.length;

  const geo0 = renderer.info.memory.geometries, tex0 = renderer.info.memory.textures;
  // light the FIRST one only — everything else must catch from it
  addGroundPatch('FIRE', bx, bz);
  detail.litOne = groundPatches.length;
  for(let i=0;i<600;i++) updateGroundPatches(DT);
  detail.fencesAfter = kitBrambles.length;
  detail.spreadDownTheLine = detail.fencesBefore === 4 && detail.fencesAfter === 0;
  detail.capRespected = groundPatches.length <= PATCH.MAX;

  // ---- it BURNS things standing in it ----
  clearGroundPatches();
  const victims = [];
  for(let i=0;i<3;i++){ const P = makePrey('gazelle', bx + i*0.6, bz, 'firetest');
    P.health = 9999; P.maxHealth = 9999; victims.push(P); }
  addGroundPatch('FIRE', bx, bz);
  const hp0 = victims.map(v=>v.health);
  for(let i=0;i<60;i++) updateGroundPatches(DT);
  detail.burnPerSecond = victims.map((v,i)=>r2(hp0[i]-v.health));
  detail.allBurned = detail.burnPerSecond.every(d => Math.abs(d - PATCH.FIRE.dps) < 0.6);
  victims.forEach(v=>{ v.health = 0; }); updatePrey(0.05);

  // ---- …and it BURNS OUT, freeing every resource ----
  for(let i=0;i<60*40;i++) updateGroundPatches(DT);
  detail.patchesLeft = groundPatches.length;
  detail.burnedOut = groundPatches.length === 0;
  clearGroundPatches();
  detail.geoLeaked = renderer.info.memory.geometries - geo0;
  detail.texLeaked = renderer.info.memory.textures - tex0;
  detail.noLeak = detail.geoLeaked <= 0 && detail.texLeaked <= 0;

  // ---- 🫧 slime reaches EVERY mover, because it rides the shared hazard multiplier ----
  const slimeSite = dryPatchNear(site.x + 40, site.z, 6);
  const sx = slimeSite.x, sz = slimeSite.z;
  detail.slimeBefore = r2(hazardSpeedMul(sx, sz));
  addGroundPatch('SLIME', sx, sz);
  detail.slimeAfter  = r2(hazardSpeedMul(sx, sz));
  detail.slimeAlsoOnTheAnimalPath = r2(brambleSpeedMul(sx, sz)) === PATCH.SLIME.slow;
  detail.slimeSlows = detail.slimeBefore === 1 && detail.slimeAfter === PATCH.SLIME.slow;

  clearGroundPatches(); clearBrambles(); pinPlayer();
  const pass = detail.spreadDownTheLine && detail.capRespected && detail.allBurned &&
               detail.burnedOut && detail.noLeak && detail.slimeSlows &&
               detail.slimeAlsoOnTheAnimalPath;
  return { pass, detail };
});

// =====================================================================
//  🥷 THE INVISIBILITY CLOAK  (2026-08-07)
// =====================================================================
// ⚠ THE SHAPE: Steven asked for "creatures don't aggro" — ALL creatures, not the one you
// happened to test. Detection in this game is per-module (a lion reads a detection radius,
// a cheetah runs its own pick, a croc another), so the only honest test drives EVERY
// predator that can pick the player and asserts a clean zero, then asserts the same set
// DOES aggro uncloaked — because "nothing chased me" is also what a broken spawn prints.
test('cloak: no predator picks a crouched player, and every one of them does uncloaked', ()=>{
  pinPlayer();
  const detail = {}, DT = 1/60;
  const acc0 = progress.accessories.slice();
  const site = dryPatchNear(60, 60, 10);
  player.pos.set(site.x, 0, site.z); pinPlayer();

  // Park everything far away, then bring back only the animal under test — otherwise
  // predators target EACH OTHER and the result says nothing about the player.
  const park = keep => { let k = 0; allCreatureLists().forEach(([list])=>{ if(!list) return;
    list.forEach(e=>{ if(e === keep) return; k++;
      e.pos.set(-MAPR+2+(k%20)*1.5, 0, -MAPR+2+((k/20)|0)*1.5);
      e.pos.y = terrainY(e.pos.x, e.pos.z); if(e.mesh) e.mesh.position.copy(e.pos); }); }); };
  const setCloak = on => { progress.accessories = ['invis_cloak', null];
    player.crouching = on; player._cloakBreak = 0;
    EQUIP = computeEquipMods(); updateStealth(DT); };
  const beside = e => { e.pos.set(player.pos.x + 4, terrainY(player.pos.x+4, player.pos.z), player.pos.z);
    if(e.mesh) e.mesh.position.copy(e.pos); };

  const probes = {
    cheetah:   { list: ()=>cheetahMeshes,   pick: C => { const t = cheetahPickTarget(C); return !!t && t.kind==='player'; } },
    porcupine: { list: ()=>porcupineMeshes, pick: P => { const t = porcPickTarget(P);    return !!t && t.kind==='player'; } },
    hippo:     { list: ()=>hippoMeshes,     pick: H => { const t = hippoPickTarget(H, HIPPO.NIGHT_AGGRO_R); return !!t && t.kind==='player'; } },
    crocodile: { list: ()=>crocMeshes,      pick: C => { C.lungeCd = 0;
                   C.pos.set(C.pool.x, terrainY(C.pool.x, C.pool.z), C.pool.z);
                   player.pos.set(C.pool.x + 3, 0, C.pool.z); pinPlayer();
                   const t = crocPickTarget(C); return !!t && t.kind === 'player'; } },
  };
  // ⚠ SPAWN WHAT IS MISSING RATHER THAN SKIPPING IT. First run of this test probed only
  // 2 of the 4 predators, because earlier tests in the suite kill cheetahs and porcupines
  // and never restock them — so the coverage silently halved depending on run order. A
  // test that quietly tests less is the same failure as a test that passes wrongly.
  const spawned = [];
  if(!cheetahMeshes.length   && typeof spawnCheetah   === 'function'){ spawnCheetah();   spawned.push('cheetah'); }
  if(!porcupineMeshes.length && typeof spawnPorcupine === 'function'){ spawnPorcupine(); spawned.push('porcupine'); }
  detail.spawnedForTest = spawned;

  const cloaked = {}, bare = {};
  detail.missing = [];
  for(const name in probes){
    const p = probes[name], L = p.list();
    if(!L || !L.length){ detail.missing.push(name); continue; }
    const e = L[0];
    player.pos.set(site.x, 0, site.z); pinPlayer();
    park(e); if(name !== 'crocodile') beside(e);
    setCloak(true);  cloaked[name] = p.pick(e);
    player.pos.set(site.x, 0, site.z); pinPlayer();
    park(e); if(name !== 'crocodile') beside(e);
    setCloak(false); bare[name]    = p.pick(e);
  }
  detail.aggroWhileCloaked   = cloaked;
  detail.aggroWhileUncloaked = bare;
  detail.probesRun = Object.keys(cloaked).length;
  detail.noneAggroCloaked = Object.keys(cloaked).every(k => cloaked[k] === false);
  // ⚠ the CONTROL, and it is the important half: a lone "nothing chased me" is exactly
  // what a broken world prints too.
  detail.allAggroUncloaked = Object.keys(bare).every(k => bare[k] === true);

  // ---- THE PRIDE: every lion, driven through the real update ----
  player.pos.set(site.x, 0, site.z); pinPlayer();
  const runPride = on => {
    lionMeshes.forEach((L,i)=>{ const a = i*1.1;
      L.pos.set(player.pos.x+Math.cos(a)*5, 0, player.pos.z+Math.sin(a)*5);
      L.pos.y = terrainY(L.pos.x, L.pos.z); if(L.mesh) L.mesh.position.copy(L.pos);
      L.state = 'wander'; L.health = L.maxHealth; L.fedTimer = 0; L.hunger = 100; });
    setCloak(on);
    for(let i=0;i<240;i++){ pinPlayer(); player.crouching = on; updateLions(DT); }
    return lionMeshes.filter(L => L.state === 'chase').length;
  };
  detail.prideSize        = lionMeshes.length;
  detail.lionsChasingCloaked   = runPride(true);
  detail.lionsChasingUncloaked = runPride(false);

  // ---- attacking BREAKS it, and it re-forms on its own ----
  setCloak(true);
  detail.activeBeforeAttack = cloakActive();
  breakCloak();
  detail.brokenByAttack = !cloakActive();
  for(let i=0;i<Math.ceil(CLOAK_BREAK*60)+10;i++) updateAbilities(DT);
  player.crouching = true;
  detail.reforms = cloakActive();
  // ---- and standing up ends it immediately ----
  player.crouching = false;
  detail.endsOnStandingUp = !cloakActive();

  progress.accessories = acc0; player.crouching = false;
  EQUIP = computeEquipMods(); pinPlayer();
  const pass = detail.probesRun === Object.keys(probes).length &&
               detail.missing.length === 0 &&
               detail.noneAggroCloaked && detail.allAggroUncloaked &&
               detail.prideSize > 0 && detail.lionsChasingCloaked === 0 &&
               detail.lionsChasingUncloaked === detail.prideSize &&
               detail.brokenByAttack && detail.reforms && detail.endsOnStandingUp;
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
