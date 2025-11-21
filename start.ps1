# Start the Chat System Application

Write-Host "🚀 Starting Real-Time Chat System..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""
Write-Host "Building and starting services..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

# Start Docker Compose
docker-compose up --build

# If user stops with Ctrl+C, clean up
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    docker-compose down
}
