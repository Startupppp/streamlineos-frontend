#!/bin/zsh
# Start a cold bootstrap of scratch_boot_d and SIGKILL it once it has committed
# TARGET migrations, so 0628 (pos 350) and 0652 (pos 370) land in the resumed half.
set -u
OUT="$1"
TARGET="${2:-345}"
cd /Users/tarunchintakunta/Personal/streamline/streamlineos-backend
export DATABASE_URL="<redacted-connection-string>"
export DIRECT_DATABASE_URL="$DATABASE_URL"
: > "$OUT/boot-d-part1.log"
nice -n 10 node src/scripts/db-bootstrap.mjs > "$OUT/boot-d-part1.log" 2>&1 &
PID=$!
echo "pid=$PID target=$TARGET"
KILLED=0
for i in {1..6000}; do
  if ! kill -0 "$PID" 2>/dev/null; then echo "process exited before interrupt"; break; fi
  N=$(grep -c '^OK ' "$OUT/boot-d-part1.log" 2>/dev/null || echo 0)
  if [ "$N" -ge "$TARGET" ]; then
    kill -9 "$PID"
    KILLED=1
    echo "SIGKILL sent at OK_count=$N last_line=$(tail -1 "$OUT/boot-d-part1.log")"
    break
  fi
  sleep 0.02
done
wait "$PID" 2>/dev/null
echo "killed=$KILLED"
echo "process_alive_after=$(kill -0 $PID 2>/dev/null && echo yes || echo no)"
