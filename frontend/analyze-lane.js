const fs = require('fs');
const data = JSON.parse(fs.readFileSync('rc.json', 'utf8'));
const myFiles = [
  'hooks/api/ai.ts', 'hooks/api/ai-summaries.ts', 'hooks/api/ai-confirm-action.ts',
  'hooks/api/meetings-ai.ts', 'hooks/api/automations.ts', 'hooks/api/automation-ai-nodes.ts',
  'hooks/api/webhooks.ts', 'hooks/api/integrations.ts', 'hooks/api/git-integration.ts',
  'hooks/api/public-booking.ts',
];
function inLane(c) {
  const f = c.file.replace(/\\/g, '/');
  if (myFiles.includes(f)) return true;
  if (f.startsWith('hooks/api/workflows-')) return true;
  if (f.startsWith('hooks/api/renderer/')) return true;
  if (f.startsWith('hooks/common/')) return true;
  if (f.startsWith('lib/api/')) return true;
  if (f.startsWith('lib/prefetch/')) return true;
  if (f === 'lib/ably.ts') return true;
  if (f.startsWith('components/')) return true;
  if (f.startsWith('app/(authenticated)/')) return true;
  return false;
}
const lane = data.calls.filter(inLane);
const unvalidated = lane.filter(c => !c.validated);
console.log('Total in lane:', lane.length);
console.log('Unvalidated:', unvalidated.length);
console.log('');
unvalidated.forEach(c => {
  const f = c.file.replace(/\\/g, '/');
  console.log(f + ':' + c.line, c.method, JSON.stringify(c.route));
});
