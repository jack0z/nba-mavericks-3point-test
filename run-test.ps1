Write-Host "NBA Dallas Mavericks 3-Point Test" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Load API key from .env file if it exists
if (Test-Path -Path ".env") {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Gray
    Get-Content .env | ForEach-Object {
        if (!$_.StartsWith("#") -and $_.Length -gt 0) {
            $key, $value = $_ -split '=', 2
            if ($key -eq "API_KEY" -and ![string]::IsNullOrEmpty($value)) {
                $env:API_KEY = $value
            }
        }
    }
} else {
    Write-Host "WARNING: .env file not found. Please create one with your API_KEY." -ForegroundColor Yellow
}

# Check if API_KEY is set
if ([string]::IsNullOrEmpty($env:API_KEY)) {
    Write-Host "ERROR: API_KEY is not set. Please create a .env file with your API key." -ForegroundColor Red
    Write-Host "Example content for .env file:" -ForegroundColor Gray
    Write-Host "API_KEY=your_api_key_here" -ForegroundColor Gray
    exit 1
}

# Process arguments
$testMode = $args[0]
$workerCount = if ($args.Length -gt 1) { $args[1] } else { 1 }

# Set worker count
$env:WORKERS = $workerCount
Write-Host "Using $workerCount worker(s)" -ForegroundColor Yellow

# Special variable to indicate if we should create a fresh results file
$env:FRESH_RESULTS = "true"

switch ($testMode) {
    "visible" {
        Write-Host "Running test with visible browser..." -ForegroundColor Cyan
        # No HEADLESS env var means visible browser
        # First run player tests
        npx playwright test --grep-invert "@summary" --workers=$workerCount
        # Now keep the results file for summary
        $env:FRESH_RESULTS = "false"
        Write-Host "Generating final summary report..." -ForegroundColor Cyan
        npx playwright test --grep "@summary" --workers=1
    }
    "report" {
        Write-Host "Running test with HTML reports..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        # First run player tests
        npx playwright test --grep-invert "@summary" --workers=$workerCount --reporter=html,json
        # Now keep the results file for summary
        $env:FRESH_RESULTS = "false"
        Write-Host "Generating final summary report..." -ForegroundColor Cyan
        npx playwright test --grep "@summary" --workers=1 --reporter=html,json
        # Open the report after completion
        Write-Host "Opening test report..." -ForegroundColor Cyan
        npx playwright show-report
    }
    "ci" {
        Write-Host "Running test in CI mode with reports..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        # First run player tests
        npx playwright test --grep-invert "@summary" --workers=$workerCount --reporter=html,json
        # Now keep the results file for summary
        $env:FRESH_RESULTS = "false"
        Write-Host "Generating final summary report..." -ForegroundColor Cyan
        npx playwright test --grep "@summary" --workers=1 --reporter=html,json
    }
    default {
        Write-Host "Running test in headless mode..." -ForegroundColor Cyan
        $env:HEADLESS = "true"
        # First run player tests
        npx playwright test --grep-invert "@summary" --workers=$workerCount
        # Now keep the results file for summary
        $env:FRESH_RESULTS = "false"
        Write-Host "Generating final summary report..." -ForegroundColor Cyan
        npx playwright test --grep "@summary" --workers=1
    }
}

Write-Host "Test complete!" -ForegroundColor Green 