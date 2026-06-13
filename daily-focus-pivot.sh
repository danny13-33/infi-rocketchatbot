#!/bin/bash
# Daily auto-pivot: read yesterday's Netradyne event counts from infi-central prod,
# pick the worst metric, write scorecard-latest.json into the bot repo, commit+push.
# The bot's getDailyFocus() then biases the safety rotation toward that metric.
#
# SAFE BY DESIGN:
#  - No rows for yesterday (table empty / not scraped yet) => writes NO focus (clears it) and exits clean. Never pivots off nothing.
#  - Only commits/pushes if the focus actually CHANGED (no empty daily commits).
#  - Read-only against prod (one SELECT). No writes to infi-central.
#
# Install: LaunchAgent com.dsp.bot-focus-pivot runs this ~6:30am daily.
set -euo pipefail

REPO="$HOME/Documents/infi-rocketchat/infi-rocketchatbot"
FOCUS_FILE="$REPO/scorecard-latest.json"
SSH_KEY="$HOME/.ssh/vultr_danny"
IC_HOST="root@144.202.23.181"
LOG="$REPO/.focus-pivot.log"

ts() { date "+%Y-%m-%d %H:%M:%S"; }
log() { echo "$(ts) $*" >> "$LOG"; }

cd "$REPO"

# Pull yesterday's team-wide event sums from infi-central prod (read-only).
# Output: one line "metric|count" for the worst metric, or empty if no rows.
WORST=$(ssh -o ConnectTimeout=15 -o BatchMode=yes -i "$SSH_KEY" "$IC_HOST" '
  PW=$(docker exec infi-central-postgres printenv POSTGRES_PASSWORD 2>/dev/null)
  docker exec -e PGPASSWORD="$PW" infi-central-postgres psql -U infi -d infi_central -tAc "
    WITH sums AS (
      SELECT
        COALESCE(SUM(speeding),0)    AS speeding,
        COALESCE(SUM(distraction),0) AS distraction,
        COALESCE(SUM(seatbelt),0)    AS seatbelt,
        COUNT(*)                     AS rows
      FROM \"DailyDrivingMetric\"
      WHERE date = (CURRENT_DATE - INTERVAL '\''1 day'\'')::date
    )
    SELECT CASE WHEN rows = 0 THEN '\''NONE'\''
      ELSE (
        SELECT m FROM (VALUES
          ('\''speeding'\'', speeding),
          ('\''distraction'\'', distraction),
          ('\''seatbelt'\'', seatbelt)
        ) AS t(m, c)
        WHERE c = GREATEST(speeding, distraction, seatbelt) AND c > 0
        ORDER BY c DESC LIMIT 1
      )
    END || '\''|'\'' || GREATEST(speeding, distraction, seatbelt) || '\''|'\'' || rows
    FROM sums;
  " 2>/dev/null
' 2>>"$LOG" || true)

WORST=$(echo "$WORST" | tr -d '[:space:]')
log "query result: '$WORST'"

# Parse "metric|count|rows"
METRIC=$(echo "$WORST" | cut -d'|' -f1)
COUNT=$(echo "$WORST"  | cut -d'|' -f2)
ROWS=$(echo "$WORST"   | cut -d'|' -f3)

# No data yet, or no events => clear focus (let the rotation run neutral). Do NOT pivot off nothing.
if [ -z "$WORST" ] || [ "$METRIC" = "NONE" ] || [ -z "$METRIC" ] || [ "${COUNT:-0}" = "0" ]; then
  NEW='{"weakestMetric":"","source":"netradyne-daily","note":"no events yesterday or no data","rows":'"${ROWS:-0}"'}'
else
  NEW='{"weakestMetric":"'"$METRIC"'","source":"netradyne-daily","events":'"$COUNT"',"rows":'"$ROWS"'}'
fi

OLD=""
[ -f "$FOCUS_FILE" ] && OLD=$(cat "$FOCUS_FILE")

# Only push if the focus metric actually changed (avoid empty daily commits).
OLD_METRIC=$(echo "$OLD" | grep -o '"weakestMetric":"[^"]*"' || true)
NEW_METRIC=$(echo "$NEW" | grep -o '"weakestMetric":"[^"]*"' || true)

if [ "$OLD_METRIC" = "$NEW_METRIC" ] && [ -f "$FOCUS_FILE" ]; then
  log "focus unchanged ($NEW_METRIC) — no push"
  exit 0
fi

echo "$NEW" > "$FOCUS_FILE"
git add scorecard-latest.json
git commit -q -m "auto-focus: $(echo "$NEW_METRIC" | sed 's/.*:"//;s/"//') (Netradyne daily, $(date +%F))" || { log "nothing to commit"; exit 0; }
git push origin HEAD >>"$LOG" 2>&1 && log "pushed focus: $NEW_METRIC"
