#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:?Usage: scripts/restore.sh <backup-dir>}"

docker compose exec -T postgres psql -U postgress -d casegraph_le < "$BACKUP_DIR/casegraph_le.sql"
docker run --rm -v caseapp_uploads_data:/uploads -v "$(pwd)/$BACKUP_DIR:/backup" alpine sh -c "tar xzf /backup/uploads.tar.gz -C /uploads"

echo "Restore completed from $BACKUP_DIR"
