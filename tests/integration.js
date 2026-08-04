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
