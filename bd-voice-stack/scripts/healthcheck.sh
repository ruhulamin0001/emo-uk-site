#!/usr/bin/env bash
# exit 0 when everything is healthy; prints one line per check. Run from the repo root on the VPS.
cd "$(dirname "$0")/.."
fail=0
c(){ if eval "$2" >/dev/null 2>&1; then echo "OK   $1"; else echo "FAIL $1"; fail=1; fi; }
c "asterisk container"   "[ \"\$(docker inspect -f '{{.State.Health.Status}}' bdvs-asterisk)\" = healthy ]"
c "ai-bridge container"  "[ \"\$(docker inspect -f '{{.State.Health.Status}}' bdvs-ai-bridge)\" = healthy ]"
c "db container"         "[ \"\$(docker inspect -f '{{.State.Health.Status}}' bdvs-db)\" = healthy ]"
reg=$(docker compose exec -T asterisk asterisk -rx 'pjsip show registrations' 2>/dev/null | grep -c Registered)
tot=$(awk 'NR>1 && NF' deploy/trunks.csv | wc -l)
c "trunks registered $reg/$tot" "[ $reg -ge $tot ]"
c "dialplan ai-agent loaded" "docker compose exec -T asterisk asterisk -rx 'dialplan show ai-agent' | grep -q AudioSocket"
c "UUID function present"    "docker compose exec -T asterisk asterisk -rx 'core show function UUID' | grep -qi uuid"
c "AMI user aibridge"        "docker compose exec -T asterisk asterisk -rx 'manager show user aibridge' | grep -q aibridge"
c "postgres tables"          "docker compose exec -T db psql -U aibridge -d aibridge -tAc \"select count(*) from information_schema.tables where table_name in ('calls','callbacks','orders')\" | grep -q '^3\$'"
c "disk < 85%"               "[ \$(df / | awk 'NR==2{print \$5+0}') -lt 85 ]"
exit $fail
