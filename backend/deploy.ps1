# GadgetHub Backend Deployment Script (PowerShell)
# This script automates the deployment process for Windows environments

$ErrorActionPreference = "Stop"

# Configuration
$APP_DIR = "C:\inetpub\gadgethub-api"
$BACKUP_DIR = "C:\backups\gadgethub"
$LOG_FILE = "C:\logs\gadgethub-deploy.log"

# Function to log messages
function Log-Message {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to print status
function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Start deployment
Log-Message "🚀 Starting GadgetHub Backend Deployment..."

# Check prerequisites
Log-Message "Checking prerequisites..."

if (-not (Test-Command "node")) {
    Print-Error "Node.js is not installed"
    exit 1
}

if (-not (Test-Command "npm")) {
    Print-Error "npm is not installed"
    exit 1
}

Print-Success "All prerequisites installed"

# Create necessary directories
Log-Message "Creating directories..."
$directories = @(
    $APP_DIR,
    $BACKUP_DIR,
    "C:\uploads\gadgethub",
    "C:\logs\gadgethub"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Print-Success "Directories created"

# Backup current deployment if exists
if (Test-Path $APP_DIR) {
    Log-Message "Backing up current deployment..."
    $backupName = "gadgethub-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backupPath = Join-Path $BACKUP_DIR "$backupName.zip"
    
    try {
        Compress-Archive -Path "$APP_DIR\*" -DestinationPath $backupPath -Force
        Print-Success "Backup created: $backupName"
    } catch {
        Print-Warning "Backup creation failed, continuing..."
    }
}

# Navigate to app directory
Set-Location $APP_DIR

# Install dependencies
Log-Message "Installing dependencies..."
npm ci --production
Print-Success "Dependencies installed"

# Generate Prisma client
Log-Message "Generating Prisma client..."
npm run prisma:generate
Print-Success "Prisma client generated"

# Run database migrations
Log-Message "Running database migrations..."
npm run prisma:deploy
Print-Success "Database migrations completed"

# Build TypeScript
Log-Message "Building TypeScript..."
npm run build
Print-Success "TypeScript build completed"

# Optional: Seed database
# Log-Message "Seeding database..."
# npm run db:seed
# Print-Success "Database seeded"

# Restart application
if (Test-Command "pm2") {
    Log-Message "Restarting application with PM2..."
    
    $pm2List = pm2 list
    if ($pm2List -match "gadgethub-api") {
        pm2 reload gadgethub-api
    } else {
        pm2 start ecosystem.config.js
    }
    
    pm2 save
    Print-Success "Application restarted with PM2"
} else {
    Print-Warning "PM2 not found, install it for process management"
    Log-Message "Starting application directly..."
    
    # Stop existing process if running
    $pidFile = "C:\logs\gadgethub.pid"
    if (Test-Path $pidFile) {
        try {
            $oldPid = Get-Content $pidFile
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignore if process doesn't exist
        }
    }
    
    # Start new process
    Start-Process -FilePath "node" -ArgumentList "dist\src\server.js" -NoNewWindow -RedirectStandardOutput "C:\logs\gadgethub\app.log" -RedirectStandardError "C:\logs\gadgethub\error.log"
    $newPid = (Get-Process node | Where-Object { $_.Path -like "*node.exe" }).Id
    $newPid | Out-File -FilePath $pidFile
    
    Print-Success "Application started with PID: $newPid"
}

# Cleanup old backups (keep last 7 days)
Log-Message "Cleaning up old backups..."
$cutoffDate = (Get-Date).AddDays(-7)
Get-ChildItem -Path $BACKUP_DIR -Filter "gadgethub-*.zip" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Force
Print-Success "Old backups cleaned up"

# Health check
Log-Message "Performing health check..."
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Print-Success "Health check passed"
    } else {
        Print-Error "Health check failed with status: $($response.StatusCode)"
        exit 1
    }
} catch {
    Print-Error "Health check failed: $($_.Exception.Message)"
    exit 1
}

Log-Message "Deployment completed successfully!"
Write-Host "🎉 GadgetHub Backend deployed successfully!" -ForegroundColor Green
Write-Host "Application is running at: http://localhost:4000/api/v1"