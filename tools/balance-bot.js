// 밸런스 확인용 자동 플레이 봇.
// 사용법: index.html 을 연 뒤 콘솔에 이 파일 내용을 붙여 넣고 runBot(101) → 끝나면 window._r 에 결과.
// 브라우저가 멈추지 않도록 200ms 씩 나눠서 돌린다. opts.diff 로 난이도('easy'|'normal'|'hard'|'nightmare') 지정.
window.runBot = function (maxWave, opts) {
  opts = opts || {};
  start(false, opts.diff || 'normal'); S.paused = true;
  const tp = (x, y) => { S.probe.x = x + .5; S.probe.y = y + .5; };
  const put = (type, x, y) => { if (S.grid[idx(x, y)]) return false; S.sel = type; tp(Math.max(5, x - 2), y); const ok = place(x, y); S.sel = null; return ok; };
  const pylonSpots = []; for (let y = 15; y <= 21; y += 2) for (let x = 7; x <= 21; x += 2) pylonSpots.push([x, y]);
  const cannonSpots = [[26, 16], [26, 18], [26, 29], [26, 31], [25, 17], [25, 30], [22, 16], [22, 18], [22, 29], [22, 31], [20, 15], [20, 32], [22, 20], [22, 27]];
  const northCannons = [[13, 14], [17, 14], [12, 15], [18, 15]], southCannons = [[13, 33], [17, 33], [12, 32], [18, 32]];
  const log = [];
  function walls() {
    for (const y of [16, 17, 18, 29, 30, 31]) { put(S.tech.forge ? 'neo' : 'steel', 28, y); put('wall', 29, y); }
    if (S.wave >= 25) for (const x of [14, 15, 16]) { put(S.tech.forge ? 'neo' : 'steel', x, 11); put('wall', x, 12); }
    if (S.wave >= 55) for (const x of [14, 15, 16]) { put(S.tech.forge ? 'neo' : 'steel', x, 36); put('wall', x, 35); }
  }
  function act() {
    walls();
    while (S.workers < 10 && S.min >= 50) train('worker');
    for (const [x, y] of cannonSpots.slice(0, 4)) put('cannon', x, y);
    if (count('cannon') < 4) return;
    for (const [x, y] of pylonSpots) { if (count('pylon') >= 20 || S.min < costOf('pylon').min + 100) break; put('pylon', x, y); }
    for (const [x, y] of GEYSERS) if (S.min > 300) put('refinery', x, y);
    if (S.up.income < 5 && afford(upCost('income')) && S.min > upCost('income').min + 100) buyUp('income');
    if (count('battery') < 2 && S.min > 400) { put('battery', 25, 21); put('battery', 25, 26); }
    for (const k of ['gateway', 'forge', 'cyber', 'robo', 'robobay', 'stargate', 'fleet']) if (!S.tech[k] && S.wave > 5) { if (afford(TECH[k]) && S.min > TECH[k].min + 200) research(k); break; }
    for (const [x, y] of cannonSpots) { if (S.min < 400) break; put('cannon', x, y); }
    if (S.wave >= 25) for (const [x, y] of northCannons) { if (S.min < 400) break; put('cannon', x, y); }
    if (S.wave >= 55) for (const [x, y] of southCannons) { if (S.min < 400) break; put('cannon', x, y); }
    if (S.tech.gateway) for (const [x, y] of [[26, 17], [26, 30]]) if (afford(BLD.statue)) put('statue', x, y);
    for (const b of S.blds) if (BLD[b.type].tiers && b.tier < BLD[b.type].tiers && S.min > 1500) upgradeBld(b);
    if (S.wave >= 36) for (const [x, y] of [[14, 22], [20, 26], [20, 20]]) if (S.min > 300) put('sensor', x, y);
    for (const m of S.mons) if (m.kind === 'nydus' && m.detected && S.cd.bomb <= 0) useAbility('bomb', m.x, m.y);
    if (count('bank') < 3 && S.min > 2500) put('bank', 7 + count('bank') * 2, 31);
    for (let i = 0; i < 4; i++) { const k = S.tech.fleet ? 'carrier' : S.tech.robobay ? 'colossus' : S.tech.cyber ? 'dragoon' : null; if (!k) break; if (afford(UNITS[k]) && S.min > UNITS[k].min + 300) { if (!train(k)) break; } }
    if (supplyUsed() > supplyCap() - 8) mergeUnits();
    for (let i = 0; i < 30; i++) { const k = ['wallHp', 'def', 'groundW', 'airW', 'shields', 'wallArmor'][i % 6]; if (afford(upCost(k)) && S.min > upCost(k).min + 300) buyUp(k); }
    tp(25, 23);
    if (S.cd.bomb <= 0) { const c = densest(40, 24, 40, 3); if (c && c.n > 15) useAbility('bomb', c.x, c.y); }
    if (S.cd.chrono <= 0 && S.wave > 0) useAbility('chrono');
    if (S.bossAlive && S.cd.overcharge <= 0) useAbility('overcharge');
  }
  S.rally = { x: 22.5, y: 23.5 };
  let lastW = -1, i = 0; window._r = null; window._log = log;
  const t0 = performance.now();
  function chunk() {
    const c0 = performance.now();
    while (performance.now() - c0 < 200) {
      if (i % 20 === 0) act();
      update(0.05); i++;
      if (S.wave !== lastW) { lastW = S.wave; if (S.wave % 10 === 0 || opts.verbose) log.push(`${S.wave}:m${S.mons.length},inc${incomeAmount()},u${S.units.length},sup${supplyUsed()}/${supplyCap()},c${count('cannon')},$${S.min | 0},g${S.gas | 0}`); }
      if (S.over || S.wave >= maxWave || i > 20 * 3600 * 1.2) {
        window._r = log.join(' | ') + (S.won ? ' → 승리' : S.over ? ` → 패배 웨이브 ${S.wave}` : ` → 진행 중 웨이브 ${S.wave}`) + ` (게임 ${(i * .05 / 60).toFixed(0)}분, 실제 ${((performance.now() - t0) / 1000).toFixed(0)}초)`;
        return;
      }
    }
    window._prog = `웨이브 ${S.wave} 적 ${S.mons.length} 유닛 ${S.units.length}`;
    setTimeout(chunk, 0);
  }
  chunk();
  return 'started';
};
'loaded';
