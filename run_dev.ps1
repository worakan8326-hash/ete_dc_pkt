# Kill existing processes on standard ports
Write-Host "Cleaning up ports 3002 and 5173..." -ForegroundColor Yellow
try {
    npx kill-port 3002 5173
} catch {
    Write-Host "No processes to kill or npx not found." -ForegroundColor DarkGray
}

Write-Host "Starting ETE DC PKT Development Stack..." -ForegroundColor Cyan

# Start Backend
Write-Host "Launching Backend (Port 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location server; npm run dev"

# Start Frontend
Write-Host "Launching Frontend (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "---------------------------------------------------"
Write-Host "Servers are starting in separate windows." -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3002"
Write-Host "Frontend: http://localhost:5173"
Write-Host "---------------------------------------------------"
