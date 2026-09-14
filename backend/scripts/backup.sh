#!/bin/bash

# Database Backup Script for GadgetHub
# Run this script regularly via cron job

set -e

# Configuration
BACKUP_DIR="/var/backups/gadgethub"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gadgethub_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30
LOG_FILE="/var/log/gadgethub-backup.log"

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-gadgethub}"
DB_USER="${DB_USER:-postgres}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Perform backup
log "Creating backup: $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Backup completed successfully: $BACKUP_FILE"
    
    # Calculate backup size
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log "Backup size: $SIZE"
    
    # Clean up old backups
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "gadgethub_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    OLD_COUNT=$(find "$BACKUP_DIR" -name "gadgethub_*.sql.gz" | wc -l)
    log "Retained $OLD_COUNT backup files"
    
    # Optional: Upload to S3 or other cloud storage
    # if command_exists aws; then
    #     aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" s3://your-backup-bucket/gadgethub/
    #     log "Backup uploaded to S3"
    # fi
    
    log "Backup process completed successfully"
else
    log "ERROR: Backup failed!"
    exit 1
fi