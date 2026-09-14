#!/bin/bash

# GadgetHub Monitoring Script
# Checks health and performance metrics

set -e

API_URL="${API_URL:-http://localhost:4000}"
METRICS_TOKEN="${METRICS_TOKEN:-}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
LOG_FILE="/var/log/gadgethub-monitor.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

log "Starting GadgetHub health check..."

# Check API health
log "Checking API health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_status "API health check passed"
    log "API Status: $HEALTH_BODY"
else
    print_error "API health check failed (HTTP $HTTP_CODE)"
    # Send alert email (configure mail command)
    # echo "GadgetHub API health check failed" | mail -s "Health Alert" "$ALERT_EMAIL"
fi

# Check APM health if token is available
if [ -n "$METRICS_TOKEN" ]; then
    log "Checking APM health..."
    APM_RESPONSE=$(curl -s -H "Authorization: Bearer $METRICS_TOKEN" -w "\n%{http_code}" "$API_URL/api/v1/apm/health")
    APM_CODE=$(echo "$APM_RESPONSE" | tail -n1)
    
    if [ "$APM_CODE" = "200" ]; then
        print_status "APM health check passed"
    else
        print_warning "APM health check returned: $APM_CODE"
    fi
fi

# Check disk space
log "Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    print_warning "Disk usage is high: ${DISK_USAGE}%"
else
    print_status "Disk usage: ${DISK_USAGE}%"
fi

# Check memory usage
log "Checking memory usage..."
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
if [ "$MEM_USAGE" -gt 80 ]; then
    print_warning "Memory usage is high: ${MEM_USAGE}%"
else
    print_status "Memory usage: ${MEM_USAGE}%"
fi

# Check if processes are running
log "Checking processes..."
if pgrep -f "node.*server.js" > /dev/null; then
    print_status "API process is running"
else
    print_error "API process is not running"
fi

if pgrep redis-server > /dev/null; then
    print_status "Redis is running"
else
    print_warning "Redis may not be running"
fi

if pgrep postgres > /dev/null; then
    print_status "PostgreSQL is running"
else
    print_warning "PostgreSQL may not be running"
fi

# Check log file sizes
log "Checking log files..."
if [ -f "/var/log/gadgethub/api-error.log" ]; then
    ERROR_LOG_SIZE=$(du -h /var/log/gadgethub/api-error.log | cut -f1)
    log "Error log size: $ERROR_LOG_SIZE"
fi

log "Health check completed"

# Summary
echo ""
echo "=== GadgetHub Health Summary ==="
echo "API Status: $([ "$HTTP_CODE" = "200" ] && echo "Healthy" || echo "Unhealthy")"
echo "Disk Usage: ${DISK_USAGE}%"
echo "Memory Usage: ${MEM_USAGE}%"
echo "Time: $(date)"
echo "================================"