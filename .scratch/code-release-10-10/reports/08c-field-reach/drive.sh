#!/bin/zsh
# drive.sh <in.json> <tag>  — one bite round: rebuild the hermetic tree, delete,
# typecheck, and write the surviving set. Never touches the shared working tree.
set -u
S=/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08
B=/Users/tarunchintakunta/Personal/streamline/streamlineos-backend
HEAVY=/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/heavy.sh
IN=$1
TAG=$2

node $S/bite-round.mjs $IN $S/$TAG-delete.json $S/$TAG-defer.json

rm -rf $S/bite && mkdir -p $S/bite
rsync -a --exclude node_modules --exclude dist --exclude .git \
  "$B/src" "$B/test" "$B/evals" "$B/tsconfig.json" "$B/tsconfig.build.json" \
  "$B/tsconfig.test.json" "$B/package.json" $S/bite/
ln -sfn "$B/node_modules" $S/bite/node_modules
node $S/mutate.mjs $S/bite $S/$TAG-delete.json

cd $S/bite
$HEAVY 2 -- node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.test.json > $S/$TAG.log 2>&1
RC=$?
echo "TSC EXIT=$RC  errors=$(grep -c 'error TS' $S/$TAG.log)"

node -e '
const fs=require("fs");
const S="'$S'";const TAG="'$TAG'";
const log=fs.readFileSync(`${S}/${TAG}.log`,"utf8");
const names=new Set();
for(const m of log.matchAll(/([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/g)) names.add(m[1]);
for(const m of log.matchAll(/.([A-Za-z_$][A-Za-z0-9_$]*)./g)) names.add(m[1]);
const del=JSON.parse(fs.readFileSync(`${S}/${TAG}-delete.json`,"utf8"));
const defer=JSON.parse(fs.readFileSync(`${S}/${TAG}-defer.json`,"utf8"));
const rejected=del.filter(x=>names.has(x.field));
const survivors=del.filter(x=>!names.has(x.field));
fs.writeFileSync(`${S}/${TAG}-survivors.json`,JSON.stringify(survivors.concat(defer),null,1));
fs.writeFileSync(`${S}/${TAG}-rejected.json`,JSON.stringify(rejected,null,1));
console.log(`rejected by tsc: ${rejected.length}   survivors(+deferred ${defer.length}): ${survivors.length+defer.length}`);
'
