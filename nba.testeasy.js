require('dotenv').config();
const { test, expect } = require('@playwright/test');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.resolve(__dirname, 'results.json');

const state = {
    playerData: null
};

function initResults() {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        passed: [],
        failed: []
    }, null, 2));
}

function saveResults(name, passed) {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
   
    if (passed) {
        results.passed.push(name);
    } else {
        results.failed.push(name);
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

test.describe('NBA API Tests', () => {

    async function getPlayerData() {
        if (state.playerData) {
            return state.playerData;
        }
        
        if (!process.env.API_KEY) throw new Error('API_KEY is not set');

        const url = `https://api.sportsdata.io/v3/nba/scores/json/Players/DAL?key=${process.env.API_KEY}`;
        const response = await axios.get(url);
        const players = response.data.filter(p => p.Status === 'Active');

        state.playerData = players;
        return players;
    }

    async function get3PointPercentage(page, firstName, lastName, playerid) {
        await page.goto(`https://www.nba.com/player/${playerid}`);

        await page.waitForLoadState('domcontentloaded');

        try {
            const cookieBanner = await page.waitForSelector('button[id="onetrust-accept-btn-handler"]', {timeout: 5000});
            if (cookieBanner) await cookieBanner.click();
        } catch (e) {}

        const avg = await page.evaluate(() => {
            const tables = [...document.querySelectorAll('table')];
            for (const table of tables) {
                const headerRow = table.querySelector('thead tr');
                const headers = [...headerRow.querySelectorAll('th')];

                // find 3PM column index
                const index = headers.findIndex(h => h.textContent.trim() === '3PM');
                if (index === -1) continue;

                // calculate average from rows
                const rows = [...table.querySelectorAll('tbody tr')];
                let sum = 0, count = 0;
                for (let i = 0; i < Math.min(rows.length, 5); i++) {
                    const cell = rows[i].querySelectorAll('td')[index];
                    if (cell) {
                        const val = parseFloat(cell.textContent);
                        if (!isNaN(val)) {
                            sum += val;
                            count++;
                        }
                    }
                }

                return count > 0 ? sum / count : 0;
            }
            return 0;
        });

        return avg;
    }

    // Initialize results once before all tests
    test.beforeAll(async () => {
        initResults();
    });

    // Prefetch player data in the first test
    test.beforeEach(async () => {
        if (!state.playerData) {
            await getPlayerData();
        }
    });

    // Create a test for each player
    for (let i = 0; i < 20; i++) {
        test(`Player ${i + 1}`, async ({ page }) => {
            const players = await getPlayerData();
            if (i >= players.length) {
                test.skip();
                return;
            }

            const player = players[i];
            const name = `${player.FirstName} ${player.LastName}`;

            const avg = await get3PointPercentage(page, player.FirstName, player.LastName, player.NbaDotComPlayerID);
            const passed = avg >= 1;

            console.log(`${name}: ${avg.toFixed(2)}PM - ${passed ? 'Passed' : 'Failed'}`);
            saveResults(name, passed);
        });
    }

    // Summary report
    test('Summary', async ({ page }) => {
        const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));

        console.log(`\nTest Results`);
        console.log(`Passed: ${results.passed.length}`);
        console.log(`Failed: ${results.failed.length}`);

        console.log(`\nPlayers who passed:`);
        results.passed.forEach(name => console.log(`- ${name}`));
        
        console.log(`\nPlayers who failed:`);
        results.failed.forEach(name => console.log(`- ${name}`));

        if (results.failed.length > 0) {
            console.log(`\nFailed players: ${results.failed.join(', ')}`);
        }
    });
});




