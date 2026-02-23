#!/bin/bash
# Backup SQLite Database from Fly.io

set -e

echo "💾 Backing up Cricket Mela database from Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first."
    exit 1
fi

# Create backups directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cricketmela_backup_$TIMESTAMP.db"

echo "📥 Downloading database from Fly.io..."
cd backend
flyctl ssh sftp get /app/data/data.db "../$BACKUP_FILE"

if [ -f "../$BACKUP_FILE" ]; then
    echo "✅ Database backed up successfully to: $BACKUP_FILE"

    # Get file size
    SIZE=$(ls -lh "../$BACKUP_FILE" | awk '{print $5}')
    echo "📊 Backup size: $SIZE"

    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lht ../$BACKUP_DIR/*.db | head -5
else
    echo "❌ Backup failed!"
    exit 1
fi

