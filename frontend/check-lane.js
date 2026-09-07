const raw = require('fs').readFileSync('rc.json','utf8');
const d = JSON.parse(raw);
const calls = d.calls || [];
const lane = calls.filter(x => {
  const f = (x.file || '').replace(/\\/g, '/');
  return (
    /hooks\/api\/hr\/[s-z]/i.test(f) ||
    /features\/hr/i.test(f) ||
    /components\/hr/i.test(f)
  ) && !x.validated;
});
console.log('Lane unvalidated remaining:', lane.length);
lane.slice(0, 20).forEach(x => console.log(' ', x.file, 'line', x.line, x.method));
