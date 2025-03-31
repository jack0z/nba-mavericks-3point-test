@echo off
ECHO Running NBA Dallas Mavericks 3-Point Test in headless mode...
ECHO.

:: API KEY Setup
SET API_KEY=58957574730c4ee1b809da2f53525997

:: Enable headless mode for CI
SET HEADLESS=true

:: Run the test with 1 worker
npx playwright test --workers=1

ECHO.
ECHO Test complete! 