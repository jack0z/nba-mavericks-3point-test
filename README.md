# NBA Dallas Mavericks 3-Point Test

This project tests Dallas Mavericks players' 3-point shooting averages using Playwright and the SportsData API.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Set up your SportsData API key:
   
   Create a `.env` file in the project root with your API key:
   ```
   API_KEY=your_api_key_here
   ```
   
   You can use the provided `.env.example` as a template:
   ```bash
   cp .env.example .env
   # Then edit .env with your API key
   ```

   Alternatively, you can set it as an environment variable:
   ```bash
   # Windows
   SET API_KEY=your_api_key_here
   
   # Linux/Mac
   export API_KEY=your_api_key_here
   ```

## Running Tests

### Local Testing

Run tests with default settings (1 worker):
```bash
npm test
```

Run tests in headless mode (1 worker):
```bash
npm run test:headless
```

Run tests with parallel workers:
```bash
npm run test:parallel
```

### Platform-Specific Scripts

**Windows (PowerShell):**
```powershell
# Run in headless mode with 1 worker (default)
.\run-test.ps1

# Run with visible browser with 1 worker
.\run-test.ps1 visible

# Run with visible browser with 3 workers
.\run-test.ps1 visible 3

# Run with HTML reports and open them automatically (3 workers)
.\run-test.ps1 report 3

# Run in CI mode with reports (5 workers)
.\run-test.ps1 ci 5
```

**Windows (Batch):**
```bash
# Run with 1 worker (default) in headless mode
run-test.bat

# Run with 4 workers in headless mode
run-test.bat 4
```

**Linux/Mac (Shell):**
```bash
# Make script executable (first time only)
chmod +x run-test.sh

# Run in headless mode with 1 worker (default)
./run-test.sh

# Run with visible browser (2 workers)
./run-test.sh visible 2

# Run with HTML reports (3 workers)
./run-test.sh report 3

# Run in CI mode with reports (4 workers)
./run-test.sh ci 4
```

### View Test Report

After running tests with HTML reporting enabled:
```bash
npm run report
```

This will open the HTML report in your default browser.

## CI/CD Integration

The project is configured for CI/CD integration with GitHub Actions and other CI systems.

To run the tests in a CI environment:
```bash
npm run test:ci
```

This generates HTML and JSON reports in the `playwright-report` directory.

### GitHub Actions Setup

The project includes a GitHub Actions workflow in `.github/workflows/test.yml` that:
1. Runs on push to main, pull requests, or manual triggers
2. Uses the API key from GitHub Secrets or workflow input
3. Generates an HTML and JSON report
4. Uploads test results as artifacts

### Setting up API Key in GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Set the name as `SPORTSDATA_API_KEY` and paste your API key as the value
5. Click "Add secret"

### Integrating with Other CI Systems

For Jenkins, GitLab CI, CircleCI, etc.:

1. Add the following step to your CI pipeline:
   ```yaml
   - name: Run NBA 3-Point Test
     run: npm run test:ci
     env:
       API_KEY: $YOUR_SECRET_API_KEY
   ```

2. Configure artifact storage for the `playwright-report` directory

## Project Structure

- `nba.test.js` - Main test file with player tests and summary generation
- `playwright.config.js` - Playwright configuration
- `package.json` - Project configuration and scripts
- `run-test.bat` - Convenience script for Windows (Batch)
- `run-test.ps1` - PowerShell script for Windows users
- `run-test.sh` - Shell script for Linux/Mac users
- `.github/workflows/test.yml` - GitHub Actions workflow

## Test Details

The test verifies that Dallas Mavericks players have a 3-pointer average >= 1 for their last 5 games.

The workflow:
1. Fetches Dallas Mavericks players from the SportsData API
2. For each player, visits their NBA.com profile page
3. Extracts the 3PM (3-pointer) average from their last 5 games
4. Determines if they pass the criteria (3PM average >= 1)
5. Generates a report of passing and failing players

## Features

- Fetches active Dallas players from the SportsData API
- Uses Playwright to directly navigate to each player's profile on NBA.com using their player ID
- Extracts 3PM statistics from the "Last 5 Games" table
- Validates that each player's 3PM average for the last 5 games is >= 1
- Displays clear, formatted output for each player test
- Generates a comprehensive summary report showing which players passed or failed
- Supports parallel test execution with multiple workers
- Two-stage test approach: player tests first, then summary generation
- Cross-platform script support (Windows, Linux, Mac)

## Requirements

- Node.js 14+
- NPM

## How the Test Works

The test process:

1. Fetches Dallas Mavericks players from the SportsData API
2. Creates a separate test for each player (can run in parallel with multiple workers)
3. For each player:
   - Navigates directly to their NBA.com profile page using their unique ID
   - Handles cookie consent if needed
   - Navigates to the Profile tab if not already active
   - Locates the "Last 5 Games" statistics table
   - Extracts the 3PM values from each game
   - Calculates the average 3PM for the last 5 games
   - Displays the formatted result with colored pass/fail indicator
   - Saves results to a shared file for later reporting
4. After all player tests complete, the summary test:
   - Collects all player results
   - Sorts them for consistent display
   - Generates a formatted summary report
   - Validates that results were collected for at least half of the players

## Output Format

The test produces clean, easy-to-read output:

```
1. Player Name (PlayerID)
   - 3PM Average: 2.50
   - Result: PASS
-----------------------------------
```

At the end, it produces a summary:

```
===== TEST RESULTS SUMMARY =====
Total players tested: 17
Results found: 17
Passed: 10 | Failed: 7

✅ Players that met criteria (3PM average >= 1):
   1. Dante Exum
   2. Jaden Hardy
   3. Kessler Edwards
   4. Klay Thompson
   5. Kyrie Irving
   6. Luka Doncic
   7. Max Christie
   8. P.J. Washington
   9. Spencer Dinwiddie
   10. Tim Hardaway Jr.

❌ Players that failed to meet criteria:
   1. Anthony Davis
   2. Brandon Williams
   3. Caleb Martin
   4. Daniel Gafford
   5. Dereck Lively II
   6. Dwight Powell
   7. Naji Marshall
===================================
```

## Advanced Features

### Environment Variables

- `API_KEY`: Your SportsData API key
- `HEADLESS`: Set to "true" to run tests in headless mode
- `WORKERS`: Number of parallel workers for tests
- `FRESH_RESULTS`: Controls whether to initialize a fresh results file
  - Set to "true" when starting player tests
  - Set to "false" when running the summary test to preserve player results

### How Parallel Testing Works

The test framework uses a two-stage approach to support reliable parallel testing:

1. **Player Tests Stage**: All player tests run in parallel (configurable worker count)
   - Each test saves results to a shared JSON file
   - File locking and retry logic prevent conflicts

2. **Summary Stage**: A separate summary test runs after all player tests complete
   - Reads the collected results
   - Waits until results are available for all or most players
   - Generates the final summary report

This approach ensures reliable testing even with many parallel workers.

## Troubleshooting

- **API Issues**: Ensure the API key is valid and check network connectivity
- **NBA.com Structure Changes**: If NBA.com changes their website structure, the test might need to be updated to find the 3PM statistics correctly
- **Network Issues**: Increase timeouts in the test or in the Playwright configuration if tests fail due to slow loading
- **Parallel Test Issues**: If running with many workers (>5), you might face API rate limiting. Consider reducing worker count.
- **Missing Results**: If the summary report shows fewer players than expected, increase the timeout in the summary test

## Script Options

All platform scripts support the following modes:

- **default**: Runs in headless mode with specified workers
- **visible**: Runs with visible browser (not headless)
- **report**: Runs tests and generates HTML reports
- **ci**: Runs in CI mode with HTML/JSON reports

Example usage:
```bash
# Windows Batch
run-test.bat 3            # Run with 3 workers in headless mode

# PowerShell
.\run-test.ps1 visible 2  # Run with 2 workers and visible browser

# Linux/Mac
./run-test.sh report 4    # Run with 4 workers and generate HTML report
```