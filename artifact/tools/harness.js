// usage: node harness.js <siteDir> <outJson> [historyCsv]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = process.argv[2], out = process.argv[3], hist = process.argv[4];
const live = fs.readFileSync(path.join(__dirname, 'db/live_scan.json'), 'utf8');
const Q = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.QFILE || 'questions.json'), 'utf8'));
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(site, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const ct = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'text/plain';
  res.writeHead(200, { 'content-type': ct }); fs.createReadStream(f).pipe(res);
}).listen(0);
(async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage(); const errs = []; const info = {};
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto(`http://127.0.0.1:${port}/`);
  await pg.evaluate(s => localStorage.setItem('alexaligned.scan.v1', JSON.stringify({ savedAt: 'test', source: 'device', scan: JSON.parse(s) })), live);
  await pg.reload(); await pg.waitForTimeout(1500);
  if (hist) {
    const t0 = Date.now();
    await pg.setInputFiles('#hxFile', hist);
    await pg.waitForFunction(() => /Loaded:/.test((document.querySelector('#hxStatus')||{}).textContent||''), null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(800);
    info.hist = await pg.evaluate(() => [document.querySelector('#hxStatus').innerText, document.querySelector('#hxNote').innerText]);
    info.histMs = Date.now() - t0;
  }
  // every pane's text, to prove other tabs are unaffected
  const panes = await pg.evaluate(() => Array.from(document.querySelectorAll('section.pane')).map(s => [s.id, s.innerText.length, s.innerHTML.length]));
  const answers = [];
  await pg.evaluate(() => { document.querySelector('#tab-qry').click(); });
  for (const q of Q) {
    const n0 = await pg.evaluate(() => document.querySelectorAll('#qmThread .qm-turn').length);
    await pg.evaluate(q => { document.querySelector('#qmInput').value = q; document.querySelector('#qmGo').click(); }, q);
    await pg.waitForFunction(n => document.querySelectorAll('#qmThread .qm-turn').length > n, n0, { timeout: 20000 }).catch(() => {});
    const t = await pg.evaluate(() => { const a = document.querySelectorAll('#qmThread .qm-turn'); const x = a[a.length - 1]; return x ? x.querySelector('.qm-a').innerText.replace(/\(\d+ ms\)/g, '(ms)') : 'NO ANSWER'; });
    answers.push({ q, a: t });
  }
  // master ask box too
  await pg.evaluate(() => { const i = document.querySelector('#mstAskInput'); i.value = 'Which are the 10 least volatile symbols in rising subsectors?'; document.querySelector('#mstAskGo').click(); });
  await pg.waitForTimeout(500);
  const mst = await pg.evaluate(() => { const x = document.querySelector('#mstAskThread .qm-a'); return x ? x.innerText.replace(/\(\d+ ms\)/g, '(ms)') : 'NO ANSWER'; });
  fs.writeFileSync(out, JSON.stringify({ errs, info, panes, answers, mst }, null, 1));
  console.log('errors:', errs.length, errs.slice(0, 10)); console.log('answers:', answers.length);
  await b.close(); srv.close();
})();
