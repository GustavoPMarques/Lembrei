set -euo pipefail

: "${ORACLE_CI_PASSWORD:?Defina a senha temporaria do banco de CI.}"

docker run -d --name lembrei-oracle-ci \
  -p 127.0.0.1:1521:1521 \
  -e ORACLE_PASSWORD="$ORACLE_CI_PASSWORD" \
  -e APP_USER=lembrei_ci \
  -e APP_USER_PASSWORD="$ORACLE_CI_PASSWORD" \
  gvenzl/oracle-free:23-slim-faststart

oracle_ready=false
for attempt in $(seq 1 60); do
  health="$(docker inspect --format '{{.State.Health.Status}}' lembrei-oracle-ci)"
  if [ "$health" = healthy ]; then
    oracle_ready=true
    break
  fi
  echo "Aguardando Oracle: tentativa $attempt de 60."
  sleep 5
done

if [ "$oracle_ready" != true ]; then
  echo 'Oracle descartavel nao iniciou no prazo.' >&2
  exit 1
fi

mkdir -p ci-logs
for script in \
  database/lembrei_01_ddl.sql \
  database/lembrei_03_procedures.sql \
  database/lembrei_04_packages.sql \
  database/lembrei_05_triggers.sql \
  database/lembrei_06_testes.sql; do
  script_name="$(basename "$script" .sql)"
  echo "Executando $script_name."
  {
    printf 'SET ECHO OFF\nSET VERIFY OFF\nSET DEFINE OFF\nSET SQLBLANKLINES ON\n'
    printf 'WHENEVER OSERROR EXIT FAILURE ROLLBACK\n'
    printf 'WHENEVER SQLERROR EXIT FAILURE ROLLBACK\n'
    printf 'CONNECT lembrei_ci/"%s"@//localhost:1521/FREEPDB1\n' "$ORACLE_CI_PASSWORD"
    cat "$script"
    printf '\nEXIT SUCCESS ROLLBACK\n'
  } | docker exec -i lembrei-oracle-ci sqlplus -L -S /nolog \
      | tee "ci-logs/$script_name.log"

  if grep -Eq '^[[:space:]]*(ORA-|SP2-|PLS-)' "ci-logs/$script_name.log"; then
    echo "Falha Oracle em $script_name." >&2
    exit 1
  fi
done

grep -Eq '^SUCESSO: [0-9]+ verificacoes aprovadas; dados de teste desfeitos\.' \
  ci-logs/lembrei_06_testes.log

printf '## Oracle\n\nScripts instalados e verificacoes SQL aprovadas em banco descartavel.\n' \
  >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
