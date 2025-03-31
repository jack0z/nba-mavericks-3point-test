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

3. Set up your SportsData API key as an environment variable:
   ```bash
   # Windows
   SET API_KEY=your_api_key_here
   
   # Linux/Mac
   export API_KEY=your_api_key_here
   ```
   
   Alternatively, you can set it in the run-test.bat file or create a `.env` file in the project root.

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

### Platform-Specific Scripts

**Windows (PowerShell):**
```powershell
# Run in headless mode (default)
.\run-test.ps1

# Run with visible browser
.\run-test.ps1 visible

# Run with HTML reports and open them automatically
.\run-test.ps1 report

# Run in CI mode with reports (without opening)
.\run-test.ps1 ci
```

**Windows (Batch):**
```bash
run-test.bat  # Runs tests in headless mode with 1 worker
```

**Linux/Mac (Shell):**
```bash
# Make script executable (first time only)
chmod +x run-test.sh

# Run in headless mode (default)
./run-test.sh

# Run with visible browser
./run-test.sh visible

# Run with HTML reports and open them automatically
./run-test.sh report

# Run in CI mode with reports (without opening)
./run-test.sh ci
```

### View Test Report

After running tests with HTML reporting enabled:
```bash
npm run report
```

This will open the HTML report in your default browser.

## CI/CD Integration

The project is configured for CI/CD integration with a fixed setting of 1 worker to avoid rate limiting issues.

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

- `nba.test.js` - Main test file
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
- Provides a summary report showing which players passed or failed
- Falls back to sample data if API key is invalid or missing

## Requirements

- Node.js 14+
- NPM

## How the Test Works

The test process:

1. Fetches Dallas Mavericks players from the SportsData API
2. Creates a separate test for each player
3. For each player:
   - Navigates directly to their NBA.com profile page using their unique ID
   - Handles cookie consent if needed
   - Navigates to the Profile tab if not already active
   - Locates the "Last 5 Games" statistics table
   - Extracts the 3PM values from each game
   - Calculates the average 3PM for the last 5 games
   - Displays the formatted result with colored pass/fail indicator
4. Generates a summary report showing:
   - Total number of players tested
   - How many passed vs. failed
   - Lists of players in each category

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
Passed: 10 | Failed: 7

✅ Players that met criteria (3PM average >= 1):
   1. Luka Doncic
   2. Kyrie Irving
   ...

❌ Players that failed to meet criteria:
   1. Daniel Gafford
   2. Josh Green
   ...
```

## Troubleshooting

- **API Issues**: Ensure the API key is valid and check network connectivity
- **NBA.com Structure Changes**: If NBA.com changes their website structure, the test might need to be updated to find the 3PM statistics correctly
- **Network Issues**: Increase timeouts in the test or in the Playwright configuration if tests fail due to slow loading
- **Headless Mode**: The test is configured to use headless mode in CI environments. You can run tests in headless mode locally with `npm run test:headless`

## Configuration

You can adjust test settings:

- In `playwright.config.js` to modify browser settings, timeouts, and other Playwright options
- In `run-test.bat` to modify the API key
- Environment variables:
  - `HEADLESS`: Set to "true" to run tests without showing the browser
  - `API_KEY`: Your SportsData API key
- In `nba.test.js` to update the `EXPECTED_PLAYER_COUNT` if the number of active Dallas players changes 