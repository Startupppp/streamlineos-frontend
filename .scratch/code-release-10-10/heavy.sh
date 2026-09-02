#!/bin/zsh
# Serialize heavy commands (typecheck / build / jest) across concurrent agents.
# Usage: .scratch/code-release-10-10/heavy.sh <slot-count> -- <command...>
# Example: heavy.sh 2 -- pnpm typecheck
#
# Uses mkdir as an atomic mutex. Holds at most N slots repo-wide.
# Stale locks (>45 min) are reclaimed.

set -u
LOCKROOT="/private/tmp/claude-501/streamline-heavy-locks"
mkdir -p "$LOCKROOT"

SLOTS="${1:-2}"
shift
[ "${1:-}" = "--" ] && shift

acquire() {
  local waited=0
  while true; do
    for i in $(seq 1 "$SLOTS"); do
      local d="$LOCKROOT/slot-$i"
      if mkdir "$d" 2>/dev/null; then
        echo $$ > "$d/pid"
        date +%s > "$d/ts"
        SLOT="$d"
        return 0
      fi
      # reclaim stale
      if [ -f "$d/ts" ]; then
        local age=$(( $(date +%s) - $(cat "$d/ts" 2>/dev/null || echo 0) ))
        if [ "$age" -gt 2700 ]; then
          rm -rf "$d" 2>/dev/null
        fi
      fi
    done
    sleep 5
    waited=$((waited + 5))
    if [ "$waited" -gt 3600 ]; then
      echo "heavy.sh: waited 60m for a slot, giving up" >&2
      return 1
    fi
  done
}

acquire || exit 1
trap 'rm -rf "$SLOT" 2>/dev/null' EXIT INT TERM

nice -n 10 "$@"
exit $?
