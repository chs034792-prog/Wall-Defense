window.runBot = function (maxWave, opts) {
  opts = opts || {};
  start(false); S.paused = true;
  const tp = (x, y) => { S.probe.x = x + .5; S.probe.y = y + .5; };
  const put = (type, x, y) => { S.sel = type; tp(Math.max(5, x - 2), y); const ok = place(x, y); S.sel = null; return ok; };
  const pylonSpots = []; for (let y = 14; y <= 20; y += 2) for (let x = 7; x <= 21; x += 2) pylonSpots.push([x, y]);
  const cannonSpots = [[24, 15], [24, 17], [24, 19], [24, 28], [24, 30], [24, 32], [22, 16], [22, 18], [22, 29], [22, 31], [20, 15], [20, 32], [22, 20], [22, 27]];
  const statueSpots = [[26, 17], [26, 30]];
  let log = [];
  function act() {
    // 입구 벽: x=27,28 강화벽, 29 벽
    for (const ys of [[16, 17, 18], [29, 30, 31]]) for (const y of ys) { if (!S.grid[idx(28, y)]) put('steel', 28, y); }
    for (const ys of [[16, 17, 18], [29, 30, 31]]) for (const y of ys) { if (!S.grid[idx(29, y)]) put('wall', 29, y); }
    while (S.workers < 10 && S.min >= 50) train('worker');
    if (count('cannon') < 2) for (const [x, y] of cannonSpots.slice(0, 2)) put('cannon', x, y);
    for (const [x, y] of pylonSpots) { if (count('pylon') >= 20 || S.min < costOf('pylon').min + 100) break; if (!S.grid[idx(x, y)]) put('pylon', x, y); }
    for (const [x, y] of GEYSERS) if (!S.grid[idx(x, y)] && S.min > 300) put('refinery', x, y);
    if (S.up.income < 5 && afford(upCost('income')) && S.min > upCost('income').min + 100) buyUp('income');
    if (count('battery') < 2 && S.min > 400) { put('battery', 25, 21); put('battery', 25, 26); }
    for (const k of ['gateway', 'cyber', 'robo', 'stargate', 'fleet']) if (!S.tech[k] && S.wave > 6) { if (afford(TECH[k]) && S.min > TECH[k].min + 200) research(k); break; }
    for (const [x, y] of cannonSpots) { if (S.min < 400) break; if (!S.grid[idx(x, y)]) put('cannon', x, y); }
    if (S.tech.gateway) for (const [x, y] of statueSpots) if (!S.grid[idx(x, y)] && afford(BLD.statue)) put('statue', x, y);
    // 유닛
    for (let i = 0; i < 4; i++) { const k = S.tech.fleet ? 'carrier' : S.tech.robo ? 'colossus' : S.tech.cyber ? 'dragoon' : null; if (!k || S.units.length > 40) break; if (afford(UNITS[k]) && S.min > UNITS[k].min + 300) train(k); }
    for (let i = 0; i < 30; i++) { const k = ['wall', 'def', 'unit', 'def'][i % 4]; if (afford(upCost(k)) && S.min > upCost(k).min + 300) buyUp(k); }
    tp(25, 23); // 수리 위치
    if (S.bombCd <= 0) { let best = null, bc = 0; for (const m of S.mons) { let c = 0; for (const o of S.mons) if (Math.hypot(o.x - m.x, o.y - m.y) < 3) c++; if (c > bc) { bc = c; best = m; } } if (best && bc > 15) bomb(best.x, best.y); }
    if (S.chronoCd <= 0 && S.wave > 0) chrono();
  }
  S.rally = { x: 22.5, y: 23.5 };
  let lastW = -1, i = 0; window._r = null; window._log = log;
  const t0 = performance.now();
  function chunk() {
    const c0 = performance.now();
    while (performance.now() - c0 < 200) {
      if (i % 20 === 0) act();
      update(0.05); i++;
      if (S.wave !== lastW) { lastW = S.wave; if (S.wave % 10 === 0 || opts.verbose) log.push(`${S.wave}:m${S.mons.length},inc${incomeAmount()},u${S.units.length},c${count('cannon')},up${S.up.wall}/${S.up.def}/${S.up.unit}/${S.up.income},$${S.min | 0},g${S.gas | 0}`); }
      if (S.over || S.wave >= maxWave || i > 20 * 3600 * 1.2) {
        window._r = log.join(' | ') + (S.won ? ' → 승리' : S.over ? ` → 패배 웨이브 ${S.wave}` : ` → 진행중 웨이브 ${S.wave}`) + ` (게임 ${(i * .05 / 60).toFixed(0)}분, 실제 ${((performance.now() - t0) / 1000).toFixed(0)}초)`;
        return;
      }
    }
    window._prog = `wave ${S.wave} mons ${S.mons.length} ms/upd ${(200 / 1).toFixed(0)}`;
    setTimeout(chunk, 0);
  }
  chunk();
  return 'started';
};
'loaded';
