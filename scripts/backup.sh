#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-backups/$(date +%Y%m%d_%H%M%S)}"
mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U postgress casegraph_le > "$BACKUP_DIR/casegraph_le.sql"
docker run --rm -v caseapp_uploads_data:/uploads -v "$(pwd)/$BACKUP_DIR:/backup" alpine sh -c "tar czf /backup/uploads.tar.gz -C /uploads ."
cp .env.example "$BACKUP_DIR/env.example"

echo "Backup written to $BACKUP_DIR"
