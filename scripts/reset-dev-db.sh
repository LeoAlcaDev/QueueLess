#!/usr/bin/env bash
# Resetea la base de datos de desarrollo: tira las tablas y deja que Flyway
# vuelva a aplicar V1, V2 y V99 desde cero. Útil cuando experimentas seeds.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Deteniendo contenedores y limpiando volumen..."
docker compose down -v

echo "Levantando Postgres limpio..."
docker compose up -d postgres
sleep 3

echo "Listo. Arranca el backend con perfil dev:"
echo "  cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev"
