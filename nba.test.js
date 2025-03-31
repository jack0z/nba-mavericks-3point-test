require('dotenv').config();
const { test, expect } = require('@playwright/test');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// File to store results across workers
const RESULTS_FILE = path.resolve(path.join(__dirname, 'test-results.json'));

// Global state management to eliminate duplicates
const state = {
  playerData: null,
  playerCount: 0,
  seenMessages: new Set()
};

// Setup global log management to prevent duplicates
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  if (message.includes("Fetching Dallas") || 
      message.includes("Found") || 
      message.includes("Setting up") ||
      message.includes("Running") ||
      message.includes("worker") ||
      message.startsWith("===== STARTING")) {
    
    if (state.seenMessages.has(message)) {
      return;
    }
    state.seenMessages.add(message);
  }
  
  originalLog.apply(console, args);
};

/**
 * Results file management functions
 */
function initializeResultsFile() {
  try {
    console.log(`Initializing results file at ${RESULTS_FILE}`);
    const initialData = {
      timestamp: new Date().toISOString(),
      passed: [],
      failed: []
    };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(initialData, null, 2));
    console.log('Results file initialized successfully');
  } catch (error) {
    console.error(`Error initializing results file: ${error.message}`);
  }
}

function saveResult(playerName, passed) {
  try {
    let retries = 5;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        let results = { passed: [], failed: [] };
        
        if (fs.existsSync(RESULTS_FILE)) {
          const content = fs.readFileSync(RESULTS_FILE, 'utf8');
          try {
            results = JSON.parse(content);
          } catch (parseError) {
            console.error(`Error parsing results file: ${parseError.message}`);
            results = { timestamp: new Date().toISOString(), passed: [], failed: [] };
          }
        }
        
        if (passed) {
          if (!results.passed.includes(playerName)) {
            results.passed.push(playerName);
          }
        } else {
          if (!results.failed.includes(playerName)) {
            results.failed.push(playerName);
          }
        }
        
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        success = true;
      } catch (writeError) {
        console.error(`Error writing results (retry ${5-retries+1}/5): ${writeError.message}`);
        retries--;
        setTimeout(() => {}, 100);
      }
    }
    
    if (!success) {
      console.error(`Failed to save result for ${playerName} after multiple attempts`);
    }
  } catch (error) {
    console.error(`Error in saveResult: ${error.message}`);
  }
}

function getResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const content = fs.readFileSync(RESULTS_FILE, 'utf8');
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error(`Error parsing results JSON: ${parseError.message}`);
        return { timestamp: new Date().toISOString(), passed: [], failed: [] };
      }
    }
  } catch (error) {
    console.error(`Error reading results file: ${error.message}`);
  }
  return { timestamp: new Date().toISOString(), passed: [], failed: [] };
}

test.describe('Dallas Mavericks Players 3-Pointer Test', () => {
  
  async function getPlayers() {
    if (state.playerData !== null) {
      return state.playerData;
    }
    
    console.log("Fetching Dallas Mavericks players from SportsData API...");
    
    try {
      if (!process.env.API_KEY) {
        console.error("ERROR: API_KEY not defined. Set it in .env file or environment variable");
        throw new Error("API key required");
      }
      
      const response = await axios.get(
        `https://api.sportsdata.io/v3/nba/scores/json/Players/DAL?key=${process.env.API_KEY}`
      );
      
      const players = response.data.filter(player => player.Status === 'Active');
      console.log(`Found ${players.length} active Dallas players.`);
      
      if (players.length === 0) {
        throw new Error("No active players found");
      }
      
      state.playerData = players;
      state.playerCount = players.length;
      
      console.log(`Setting up tests for ${state.playerCount} players`);
      console.log(`\n===== STARTING TEST WITH ${state.playerCount} DALLAS MAVERICKS PLAYERS =====\n`);
      
      return players;
    } catch (error) {
      console.error(`Error fetching players: ${error.message}`);
      throw error;
    }
  }
  
  test.beforeAll(async () => {
    state.seenMessages.clear();
    
    const shouldInitialize = process.env.FRESH_RESULTS === 'true' || !fs.existsSync(RESULTS_FILE);
    
    if (shouldInitialize) {
      initializeResultsFile();
    } else {
      console.log('Using existing results file for summary report');
    }
    
    await getPlayers();
  });
  
  for (let playerIndex = 0; playerIndex < 20; playerIndex++) {
    test(`Player ${playerIndex + 1}`, async ({ page }) => {
      const players = await getPlayers();
      
      if (playerIndex >= players.length) {
        test.skip();
        return;
      }
      
      const player = players[playerIndex];
      const { FirstName, LastName, NbaDotComPlayerID } = player;
      const playerName = `${FirstName} ${LastName}`;
      
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      try {
        const average3PM = await get3PointAverageFromNBA(
          page, FirstName, LastName, NbaDotComPlayerID
        );
        
        const passed = average3PM >= 1;
        formatOutput(FirstName, LastName, NbaDotComPlayerID, average3PM, passed, playerIndex + 1);
        saveResult(playerName, passed);
        expect(average3PM).not.toBeNull();
      } catch (error) {
        console.error(`Error processing ${FirstName} ${LastName}: ${error.message}`);
        saveResult(`${playerName} (Error)`, false);
        throw error;
      }
    });
  }
  
  test('ZZZ_Summary Report @summary', async () => {
    const players = await getPlayers();
    const expectedResultCount = players.length;
    
    console.log(`Waiting for all ${expectedResultCount} player results before generating summary...`);
    
    let results = { passed: [], failed: [] };
    const startTime = Date.now();
    const maxWaitTime = 90000;
    
    while (Date.now() - startTime < maxWaitTime) {
      results = getResults();
      const currentResultCount = results.passed.length + results.failed.length;
      
      if (currentResultCount >= expectedResultCount) {
        console.log(`All ${currentResultCount}/${expectedResultCount} results collected.`);
        break;
      }
      
      if (currentResultCount > 0) {
        console.log(`Collected ${currentResultCount}/${expectedResultCount} results so far...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const sortedResults = {
      passed: [...results.passed].sort(),
      failed: [...results.failed].sort()
    };
    
    process.stdout.write('\n===== TEST RESULTS SUMMARY =====\n');
    process.stdout.write(`Total players tested: ${players.length}\n`);
    process.stdout.write(`Results found: ${sortedResults.passed.length + sortedResults.failed.length}\n`);
    process.stdout.write(`Passed: ${sortedResults.passed.length} | Failed: ${sortedResults.failed.length}\n`);
    
    if (sortedResults.passed.length > 0) {
      process.stdout.write('\n✅ Players that met criteria (3PM average >= 1):\n');
      sortedResults.passed.forEach((player, idx) => 
        process.stdout.write(`   ${idx+1}. ${player}\n`)
      );
    }
    
    if (sortedResults.failed.length > 0) {
      process.stdout.write('\n❌ Players that failed to meet criteria:\n');
      sortedResults.failed.forEach((player, idx) => 
        process.stdout.write(`   ${idx+1}. ${player}\n`)
      );
    }
    
    process.stdout.write('\n================================\n\n');
    
    expect(sortedResults.passed.length + sortedResults.failed.length).toBeGreaterThanOrEqual(Math.floor(expectedResultCount / 2));
  }, { timeout: 120000 });
  
  async function get3PointAverageFromNBA(page, firstName, lastName, nbaDotComPlayerId) {
    const playerName = `${firstName} ${lastName}`;
    
    try {
      await page.goto(`https://www.nba.com/player/${nbaDotComPlayerId}`, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
      
      try {
        const cookieButton = await page.waitForSelector('button[id="onetrust-accept-btn-handler"]', { timeout: 3000 });
        if (cookieButton) {
          await cookieButton.click();
        }
      } catch (e) {
        // Cookie banner might not appear
      }
      
      try {
        const profileTab = await page.waitForSelector('a:has-text("Profile")', { timeout: 3000 });
        if (profileTab) {
          await profileTab.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        }
      } catch (e) {
        // Profile tab might already be active
      }
      
      await page.waitForTimeout(1000);
      
      const threePointAverage = await page.evaluate(() => {
        console.log('Searching for Last 5 Games table...');
        
        let lastFiveGamesTable = null;
        const elements = [...document.querySelectorAll('table, h2, h3, h4, div')];
        
        for (const element of elements) {
          if (element.textContent.includes('Last 5 Games')) {
            console.log('Found element with "Last 5 Games" text');
            
            if (element.tagName === 'TABLE') {
              lastFiveGamesTable = element;
              break;
            }
            
            let sibling = element.nextElementSibling;
            while (sibling) {
              if (sibling.tagName === 'TABLE') {
                lastFiveGamesTable = sibling;
                break;
              }
              sibling = sibling.nextElementSibling;
            }
            
            if (!lastFiveGamesTable) {
              lastFiveGamesTable = element.querySelector('table') || 
                                  (element.parentElement && element.parentElement.querySelector('table'));
            }
            
            if (lastFiveGamesTable) break;
          }
        }
        
        if (!lastFiveGamesTable) {
          console.log('Searching for any table with 3PM column...');
          for (const table of document.querySelectorAll('table')) {
            const headerRow = table.querySelector('tr');
            if (headerRow && [...headerRow.querySelectorAll('th')].some(h => h.textContent.includes('3PM'))) {
              lastFiveGamesTable = table;
              break;
            }
          }
        }
        
        if (!lastFiveGamesTable) {
          console.log('Could not find a table with 3PM data');
          return null;
        }
        
        const headerCells = lastFiveGamesTable.querySelectorAll('th');
        let threePMColumnIndex = -1;
        
        for (let i = 0; i < headerCells.length; i++) {
          if (headerCells[i].textContent.trim().includes('3PM')) {
            threePMColumnIndex = i;
            break;
          }
        }
        
        if (threePMColumnIndex === -1) {
          console.log('Could not find 3PM column in table');
          return null;
        }
        
        const rows = lastFiveGamesTable.querySelectorAll('tbody tr');
        if (rows.length === 0) {
          console.log('No rows found in table');
          return null;
        }
        
        let sum = 0;
        let count = 0;
        
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
      throw error;
    }
  }
});

function formatOutput(firstName, lastName, playerId, average3PM, passed, playerNumber) {
  const playerName = `${firstName} ${lastName}`;
  const averageFormatted = average3PM.toFixed(2);
  
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  const green = "\x1b[32m";
  const red = "\x1b[31m";
  const passText = passed ? `${green}${bold}PASS${reset}` : `${red}${bold}FAIL${reset}`;
  
  try {
    process.stdout.write("-----------------------------------\n");
    process.stdout.write(`${playerNumber}. ${playerName} (${playerId})\n`);
    process.stdout.write(`   - 3PM Average: ${averageFormatted}\n`);
    process.stdout.write(`   - Result: ${passText}\n`);
    process.stdout.write("-----------------------------------\n");
  } catch (e) {
    // Ignore write errors
  }
  
  return { name: playerName, average: average3PM, pass: passed };
}
