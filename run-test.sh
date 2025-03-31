#!/bin/bash

echo -e "\e[1;32mNBA Dallas Mavericks 3-Point Test\e[0m"
echo -e "\e[1;32m==================================\e[0m"

# Load API key from .env file if it exists
if [ -f ".env" ]; then
    echo -e "\e[90mLoading environment variables from .env file...\e[0m"
    # Export API_KEY from .env file
    export $(grep -v '^#' .env | grep "API_KEY" | xargs)
else
    echo -e "\e[33mWARNING: .env file not found. Please create one with your API_KEY.\e[0m"
fi

# Check if API_KEY is set
if [ -z "$API_KEY" ]; then
    echo -e "\e[31mERROR: API_KEY is not set. Please create a .env file with your API key.\e[0m"
    echo -e "\e[90mExample content for .env file:\e[0m"
    echo -e "\e[90mAPI_KEY=your_api_key_here\e[0m"
    exit 1
fi

# Process command line arguments
mode=$1
workers=${2:-1}  # Default to 1 worker if not specified

# Set worker count
export WORKERS=$workers
echo -e "\e[1;33mUsing $workers worker(s)\e[0m"

# Special variable to indicate if we should create a fresh results file
export FRESH_RESULTS=true

case "$mode" in
  "visible")
    echo -e "\e[1;36mRunning test with visible browser...\e[0m"
    # Run with visible browser (no HEADLESS env var)
    npx playwright test --grep-invert "@summary" --workers=$workers
    export FRESH_RESULTS=false
    echo -e "\e[1;36mGenerating final summary report...\e[0m"
    npx playwright test --grep "@summary" --workers=1
    ;;
  "report")
    echo -e "\e[1;36mRunning test with HTML reports...\e[0m"
    export HEADLESS=true
    # First run player tests
    npx playwright test --grep-invert "@summary" --workers=$workers --reporter=html,json
    export FRESH_RESULTS=false
    # Then run summary
    echo -e "\e[1;36mGenerating final summary report...\e[0m"
    npx playwright test --grep "@summary" --workers=1 --reporter=html,json
    # Open the report after completion
    echo -e "\e[1;36mOpening test report...\e[0m"
    npx playwright show-report
    ;;
  "ci")
    echo -e "\e[1;36mRunning test in CI mode with reports...\e[0m"
    export HEADLESS=true
    # First run player tests
    npx playwright test --grep-invert "@summary" --workers=$workers --reporter=html,json
    export FRESH_RESULTS=false
    # Then run summary
    echo -e "\e[1;36mGenerating final summary report...\e[0m"
    npx playwright test --grep "@summary" --workers=1 --reporter=html,json
    ;;
  *)
    echo -e "\e[1;36mRunning test in headless mode...\e[0m"
    export HEADLESS=true
    # First run player tests
    npx playwright test --grep-invert "@summary" --workers=$workers
    export FRESH_RESULTS=false
    # Then run summary
    echo -e "\e[1;36mGenerating final summary report...\e[0m"
    npx playwright test --grep "@summary" --workers=1
    ;;
esac

echo -e "\e[1;32mTest complete!\e[0m" 