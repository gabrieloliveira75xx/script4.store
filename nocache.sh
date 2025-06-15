docker compose down
docker system prune -a --volumes
docker compose build --no-cache
docker compose up