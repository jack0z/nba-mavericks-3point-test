Write-Host "NBA Dallas Mavericks 3-Point Test" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# API KEY Setup
$env:API_KEY = "58957574730c4ee1b809da2f53525997"

$testMode = $args[0]

switch ($testMode) {
    "visible" {
        Write-Host "Running test with visible browser (1 worker)..." -ForegroundColor Cyan
        # No HEADLESS env var means visible browser
        npm test
    }
    "report" {
        Write-Host "Running test with HTML reports (1 worker)..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        npm run test:ci
        # Open the report after completion
        Write-Host "Opening test report..." -ForegroundColor Cyan
        npm run report
    }
    "ci" {
        Write-Host "Running test in CI mode with reports (1 worker)..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        npm run test:ci
    }
    default {
        Write-Host "Running test in headless mode (1 worker)..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        npm run test:headless
    }
}

Write-Host "Test complete!" -ForegroundColor Green 