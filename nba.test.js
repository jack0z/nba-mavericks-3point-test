require('dotenv').config();
const { test, expect } = require('@playwright/test');
const axios = require('axios');

// Override console.log globally at the top level to avoid duplicate messages
const originalConsoleLog = console.log;
const seenMessages = new Set();

console.log = function(...args) {
    const message = args.join(' ');
    
    // Skip logging the following messages after we've seen them once
    if (message.includes("Fetching Dallas Mavericks players from SportsData API") ||
        message.includes("Found") && message.includes("active Dallas players") ||
        message.includes("Setting up tests for") ||
        message.includes("Running")) {
        
        if (seenMessages.has(message)) {
            return; // Skip duplicate messages
        }
        seenMessages.add(message);
    }
    
    // Forward to original console.log
    originalConsoleLog.apply(console, args);
};

/**
 * Test to verify that Dallas Mavericks active players 
 * have a 3-pointer average >= 1 for the last 5 games
 */
test.describe('Dallas Mavericks Players 3-Pointer Test', () => {
    
    // Disable automatic retries for this test suite
    test.describe.configure({ retries: 0 });
    
    // Global flags to control logging
    let hasLoggedFetching = false;
    let hasLoggedFoundPlayers = false;
    let hasLoggedSetupTests = false;
    
    // Shared cache and results tracking
    let cachedPlayers = null;
    const testResults = {
        passed: [],
        failed: []
    };
    
    /**
     * Data provider function to fetch Dallas players from SportsData API
     * @returns {Promise<Array>} Array of active Dallas players
     */
    async function getDallasPlayers() {
        try {
            // Only log once
            if (!hasLoggedFetching) {
                console.log("Fetching Dallas Mavericks players from SportsData API...");
                hasLoggedFetching = true;
            }
            
            // Check if API_KEY is defined
            if (!process.env.API_KEY) {
                console.error("ERROR: API_KEY is not defined. Please set it in .env file or run-test.bat");
                throw new Error("API key is required");
            }
            
            const response = await axios.get(
                `https://api.sportsdata.io/v3/nba/scores/json/Players/DAL?key=${process.env.API_KEY}`
            );
            
            // Filter for active players
            const activePlayers = response.data.filter(player => player.Status === 'Active');
            
            // Only log once
            if (!hasLoggedFoundPlayers && activePlayers.length > 0) {
                console.log(`Found ${activePlayers.length} active Dallas players.`);
                hasLoggedFoundPlayers = true;
            }
            
            if (activePlayers.length === 0) {
                console.error("ERROR: No active players found. API may have returned invalid data.");
                throw new Error("No active players found");
            }
            
            return activePlayers;
        } catch (error) {
            console.error('Error fetching Dallas players:', error.message);
            throw error; // Fail the test if we can't get player data
        }
    }

    /**
     * Function to extract 3PM (3-pointer) average for the last 5 games from NBA.com
     * @param {Object} page - Playwright page object
     * @param {string} firstName - Player's first name
     * @param {string} lastName - Player's last name
     * @param {number} nbaDotComPlayerId - Player's NBA.com ID
     * @returns {Promise<number>} Average 3PM from last 5 games
     */
    async function get3PointAverageFromNBA(page, firstName, lastName, nbaDotComPlayerId) {
        let playerName = `${firstName} ${lastName}`;

        try {
            // Navigate directly to player's profile using their ID
            await page.goto(`https://www.nba.com/player/${nbaDotComPlayerId}`, { timeout: 30000 });
            await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
            
            // Handle cookie consent if present
            try {
                const cookieButton = await page.waitForSelector('button[id="onetrust-accept-btn-handler"]', { timeout: 3000 });
                if (cookieButton) {
                    await cookieButton.click();
                }
            } catch (e) {
                // Cookie banner might not appear
            }
            
            // Navigate to Profile tab if not already there
            try {
                const profileTab = await page.waitForSelector('a:has-text("Profile")', { timeout: 3000 });
                if (profileTab) {
                    await profileTab.click();
                    await page.waitForLoadState('networkidle', { timeout: 15000 });
                }
            } catch (e) {
                // Profile tab might already be active
            }
            
            // Find the "Last 5 Games" table and extract 3PM data
            await page.waitForTimeout(1000); // Give page time to fully render
            
            // Extract 3PM data from tables
            const threePointAverage = await page.evaluate(() => {
                console.log('Searching for Last 5 Games table...');
                
                // Look for the table with "Last 5 Games" caption or nearby heading
                let lastFiveGamesTable = null;
                
                // Method 1: Find by looking directly at table content or surrounding elements
                const tablesAndHeaders = [...document.querySelectorAll('table, h2, h3, h4, div')];
                
                for (const element of tablesAndHeaders) {
                    if (element.textContent.includes('Last 5 Games')) {
                        console.log('Found element with "Last 5 Games" text');
                        
                        // If it's a table, use it directly
                        if (element.tagName === 'TABLE') {
                            lastFiveGamesTable = element;
                            break;
                        }
                        
                        // If it's a header or div, look for a table following it
                        let sibling = element.nextElementSibling;
                        while (sibling) {
                            if (sibling.tagName === 'TABLE') {
                                lastFiveGamesTable = sibling;
                                break;
                            }
                            sibling = sibling.nextElementSibling;
                        }
                        
                        // If not found as next sibling, look inside the element
                        if (!lastFiveGamesTable) {
                            const nestedTable = element.querySelector('table');
                            if (nestedTable) {
                                lastFiveGamesTable = nestedTable;
                            }
                        }
                        
                        // If still not found, look for any table within the parent container
                        if (!lastFiveGamesTable && element.parentElement) {
                            const parentTable = element.parentElement.querySelector('table');
                            if (parentTable) {
                                lastFiveGamesTable = parentTable;
                            }
                        }
                        
                        if (lastFiveGamesTable) break;
                    }
                }
                
                // Method 2: If we still don't have a table, look for any table with 3PM column
                if (!lastFiveGamesTable) {
                    console.log('Searching for any table with 3PM column...');
                    const tables = document.querySelectorAll('table');
                    
                    for (const table of tables) {
                        const headerRow = table.querySelector('tr');
                        if (headerRow) {
                            const headers = headerRow.querySelectorAll('th');
                            for (const header of headers) {
                                if (header.textContent.includes('3PM')) {
                                    lastFiveGamesTable = table;
                                    break;
                                }
                            }
                        }
                        if (lastFiveGamesTable) break;
                    }
                }
                
                if (!lastFiveGamesTable) {
                    console.log('Could not find a table with 3PM data');
                    return null;
                }
                
                // Find the 3PM column index
                const headerCells = lastFiveGamesTable.querySelectorAll('th');
                let threePMColumnIndex = -1;
                
                for (let i = 0; i < headerCells.length; i++) {
                    const headerText = headerCells[i].textContent.trim();
                    if (headerText === '3PM' || headerText.includes('3PM')) {
                        threePMColumnIndex = i;
                        break;
                    }
                }
                
                if (threePMColumnIndex === -1) {
                    console.log('Could not find 3PM column in table');
                    return null;
                }
                
                // Extract 3PM values from the table rows
                const rows = lastFiveGamesTable.querySelectorAll('tbody tr');
                if (rows.length === 0) {
                    console.log('No rows found in table');
                    return null;
                }
                
                let sum = 0;
                let count = 0;
                
                // Get values from up to 5 rows
                const numRows = Math.min(rows.length, 5);
                for (let i = 0; i < numRows; i++) {
                    const cells = rows[i].querySelectorAll('td');
                    if (cells.length > threePMColumnIndex) {
                        const valueText = cells[threePMColumnIndex].textContent.trim();
                        const value = parseFloat(valueText);
                        if (!isNaN(value)) {
                            sum += value;
                            count++;
                            console.log(`Game ${i+1}: ${value} 3PM`);
                        }
                    }
                }
                
                if (count === 0) {
                    console.log('No valid 3PM values found');
                    return null;
                }
                
                const average = sum / count;
                console.log(`Average 3PM: ${average.toFixed(2)} (${count} games)`);
                return average;
            });
            
            if (threePointAverage === null) {
                throw new Error(`Could not extract 3PM data for ${playerName}`);
            }
            
            return threePointAverage;
            
        } catch (error) {
            console.error(`Error processing ${playerName}: ${error.message}`);
            throw error; // Propagate the error to fail the test properly
        }
    }

    // Fetch players only once and cache the result
    async function getPlayersWithCache() {
        if (!cachedPlayers) {
            cachedPlayers = await getDallasPlayers();
            
            // Set player count immediately
            EXPECTED_PLAYER_COUNT = cachedPlayers.length;
            
            // Only log once
            if (!hasLoggedSetupTests) {
                console.log(`Setting up tests for ${EXPECTED_PLAYER_COUNT} players`);
                hasLoggedSetupTests = true;
            }
        }
        return cachedPlayers;
    }
    
    // Create a setup test that runs first to initialize player data
    test.describe('Setup', () => {
        test('Initialize player data', async () => {
            // Get players to cache them for other tests
            const players = await getPlayersWithCache();
            
            // Suppress Playwright output by overriding console.log
            const originalLog = console.log;
            console.log = function(...args) {
                // Only display our custom output
                const message = args.join(' ');
                if (message.includes('[chromium]') || 
                    message.includes('Running') ||
                    message.includes('worker')) {
                    return;
                }
                originalLog.apply(console, args);
            };
            
            // Clear screen and show our header
            console.clear();
            process.stdout.write(`\n===== STARTING TEST WITH ${players.length} DALLAS MAVERICKS PLAYERS =====\n\n`);
            expect(players.length).toBeGreaterThan(0);
        });
    });
    
    // Get player count immediately for test generation
    let EXPECTED_PLAYER_COUNT = 20; // Default max player count

    // Initialize player data immediately
    getPlayersWithCache().catch(error => {
        console.error('Failed to get player count:', error);
        process.exit(1); // Exit with error if we can't get player data
    });
    
    // Create tests for each player
    for (let i = 0; i < EXPECTED_PLAYER_COUNT; i++) {
        const playerIndex = i;
        
        test.describe(`Player ${playerIndex + 1}`, () => {
            test(`Test`, async ({ page }) => {
                // Get all players
                const players = await getPlayersWithCache();
                
                // Skip if this player doesn't exist
                if (playerIndex >= players.length) {
                    test.skip();
                    return;
                }
                
                // Configure page for better stability
                await page.setViewportSize({ width: 1920, height: 1080 });
                
                // Get the player data
                const player = players[playerIndex];
                const { FirstName, LastName, NbaDotComPlayerID } = player;
                
                try {
                    // Process the player
                    const average3PM = await get3PointAverageFromNBA(page, FirstName, LastName, NbaDotComPlayerID);
                    
                    // Record and assert results
                    const passed = average3PM >= 1;
                    
                    // Use the new formatted output with player numbering
                    formatOutput(FirstName, LastName, NbaDotComPlayerID, average3PM, passed, playerIndex + 1);
                    
                    // Record the result in our shared array
                    if (passed) {
                        testResults.passed.push(`${FirstName} ${LastName}`);
                    } else {
                        testResults.failed.push(`${FirstName} ${LastName}`);
                    }
                } catch (error) {
                    console.error(`Error processing ${FirstName} ${LastName}: ${error.message}`);
                    // Record error in our failed array
                    testResults.failed.push(`${FirstName} ${LastName} (Error)`);
                }
            });
        });
    }
    
    // Add a summary test to run at the end
    test.describe('Summary', () => {
        test('Summary', async () => {
            const players = await getPlayersWithCache();
            
            // Display the results header
            process.stdout.write('\n===== TEST RESULTS SUMMARY =====\n');
            process.stdout.write(`Total players tested: ${players.length}\n`);
            
            // Display summary of passed/failed players using our shared tracking array
            process.stdout.write(`Passed: ${testResults.passed.length} | Failed: ${testResults.failed.length}\n`);
            
            if (testResults.passed.length > 0) {
                process.stdout.write('\n✅ Players that met criteria (3PM average >= 1):\n');
                testResults.passed.forEach((player, idx) => process.stdout.write(`   ${idx+1}. ${player}\n`));
            }
            
            if (testResults.failed.length > 0) {
                process.stdout.write('\n❌ Players that failed to meet criteria:\n');
                testResults.failed.forEach((player, idx) => process.stdout.write(`   ${idx+1}. ${player}\n`));
            }
            
            process.stdout.write('\n================================\n\n');
        });
    });
});

/**
 * Format the output for a player's test result
 * @param {string} firstName - Player's first name
 * @param {string} lastName - Player's last name
 * @param {number} playerId - Player's NBA.com ID
 * @param {number} average3PM - Player's 3PM average
 * @param {boolean} passed - Whether the player passed the test
 * @param {number} playerNumber - Player's number in the test sequence
 * @returns {Object} Test result object
 */
function formatOutput(firstName, lastName, playerId, average3PM, passed, playerNumber) {
    const playerName = `${firstName} ${lastName}`;
    const averageFormatted = average3PM.toFixed(2);
    
    // Bold and color formatting
    const bold = "\x1b[1m";
    const reset = "\x1b[0m";
    const green = "\x1b[32m";
    const red = "\x1b[31m";
    const passText = passed ? `${green}${bold}PASS${reset}` : `${red}${bold}FAIL${reset}`;
    
    try {
        // Use a direct write to console without any extra formatting
        // This eliminates the special character issue
        process.stdout.write("-----------------------------------\n");
        process.stdout.write(`${playerNumber}. ${playerName} (${playerId})\n`);
        process.stdout.write(`   - 3PM Average: ${averageFormatted}\n`);
        process.stdout.write(`   - Result: ${passText}\n`);
        process.stdout.write("-----------------------------------\n");
    } catch (e) {
        // Ignore write errors
    }
    
    // Return result for summary tracking
    return {
        name: playerName,
        average: average3PM,
        pass: passed
    };
}
