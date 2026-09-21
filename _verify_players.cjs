const https = require('https');
const key = '1c674b12cfcb84b6897da822dec98b39';
function get(path) {
  return new Promise((resolve, reject) => {
    https.get({ host: 'v3.football.api-sports.io', path, headers: { 'x-apisports-key': key } }, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
(async () => {
  for (const league of [140, 2, 143, 556]) {
    for (const season of [2026, 2025]) {
      const pl = await get(`/players?team=529&league=${league}&season=${season}`);
      const arr = pl.response || [];
      const first = arr[0];
      console.log(`league=${league} season=${season} results=${pl.results} errors=${JSON.stringify(pl.errors)} first=${first ? first.player.name + ' apps=' + (first.statistics[0].games.appearences) : 'NONE'}`);
    }
  }
})();