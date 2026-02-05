const express = require('express');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { scrapeAll } = require('./scraper');
const { runTests } = require('./tester');
const { saveAll } = require('./generator');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const defaultConfig = [
    // { type: "socks5", anonymity: "", country: "CN", speed: "", port: "" }
    { type: "socks5", anonymity: "", country: "", speed: "2500", port: "" },
    { type: "socks4", anonymity: "", country: "", speed: "2500", port: "" },
    { type: "", anonymity: "", country: "CN", speed: "", port: "" },
    { type: "", anonymity: "", country: "", speed: "750", port: "" }
];

async function updateProxies() {
    console.log(`\n[${new Date().toISOString()}] === Starting scheduled proxy update ===`);
    try {
        console.log(`[Scheduler] Cleaning up old data if any...`);
        const rawProxies = await scrapeAll(defaultConfig);
        console.log(`[Scheduler] Scraped ${rawProxies.length} nodes after deduplication.`);
        
        const validProxies = await runTests(rawProxies);
        console.log(`[Scheduler] ${validProxies.length} nodes passed tests and are ready.`);
        
        saveAll(validProxies, PUBLIC_DIR);
        console.log(`[${new Date().toISOString()}] === Update completed successfully. ===\n`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] !!! Update failed:`, error.message);
    }
}

function startServer() {
    const app = express();

    app.use(express.static(PUBLIC_DIR));

    app.get('/', (req, res) => {
        res.send(`
            <h1>Proxy Subscription Server</h1>
            <ul>
                <li><a href="/simple.txt">simple.txt</a></li>
                <li><a href="/v2rayn.txt">v2rayn.txt</a></li>
                <li><a href="/nodes.json">nodes.json</a></li>
                <li><a href="/nodes.csv">nodes.csv</a></li>
            </ul>
        `);
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${PORT}`);
        console.log(`Subscription files directory: ${PUBLIC_DIR}`);
    });

    // Schedule update every hour
    cron.schedule('0 * * * *', () => {
        updateProxies();
    });

    // Run initial update
    updateProxies();
}

module.exports = {
    startServer
};
