#!/bin/bash

echo -e "\e[1;32mNBA Dallas Mavericks 3-Point Test\e[0m"
echo -e "\e[1;32m==================================\e[0m"

# API KEY Setup
export API_KEY=58957574730c4ee1b809da2f53525997

# Process command line argument
mode=$1

case "$mode" in
  "visible")
    echo -e "\e[1;36mRunning test with visible browser (1 worker)...\e[0m"
    # Run with visible browser (no HEADLESS env var)
    npm test
    ;;
  "report")
    echo -e "\e[1;36mRunning test with HTML reports (1 worker)...\e[0m"
    export HEADLESS=true
    npm run test:ci
    # Open the report after completion
    echo -e "\e[1;36mOpening test report...\e[0m"
    npm run report
    ;;
  "ci")
    echo -e "\e[1;36mRunning test in CI mode with reports (1 worker)...\e[0m"
    export HEADLESS=true
    npm run test:ci
    ;;
  *)
    echo -e "\e[1;36mRunning test in headless mode (1 worker)...\e[0m"
    export HEADLESS=true
    npm run test:headless
    ;;
esac

echo -e "\e[1;32mTest complete!\e[0m" 