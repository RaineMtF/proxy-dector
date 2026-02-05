const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getProxyAgent, getCommonHeaders, getRandomUserAgent } = require('./utils');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

let browser = null;

async function getBrowserInstance() {
    if (browser) return browser;
    console.log('[Scraper] Launching Puppeteer browser...');
    browser = await puppeteer.launch({
        headless: true, // or 'new' if using latest puppeteer
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical for Docker
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
    });
    return browser;
}

async function closeBrowserInstance() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}

/**
 * Strategy 1: Axios with improved headers
 */
async function scrapeWithAxios(url) {
    const agent = getProxyAgent();
    const response = await axios.get(url, {
        headers: getCommonHeaders(),
        httpsAgent: agent,
        proxy: false,
        timeout: 15000,
        validateStatus: (status) => status < 500, // Allow 403 to be handled
    });

    if (response.status === 403) {
        throw new Error('Cloudflare 403 Detected (Axios)');
    }

    return response.data;
}

/**
 * Strategy 2: Puppeteer with Stealth Plugin
 */
async function scrapeWithPuppeteer(url) {
    const instance = await getBrowserInstance();
    const page = await instance.newPage();
    
    try {
        await page.setUserAgent(getRandomUserAgent());
        // Do not set common headers here as they might conflict with stealth plugin's automatic headers
        
        console.log(`[Scraper] Puppeteer navigating to: ${url}`);
        
        // Use a more human-like navigation
        await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        // Wait a bit for Cloudflare to do its magic (5-10s is typical)
        console.log('[Scraper] Waiting for Cloudflare/Loading...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Wait specifically for the table if possible
        try {
            await page.waitForSelector('table', { timeout: 10000 });
        } catch (e) {
            console.log('[Scraper] Table not found after waiting. Possible bypass failure or page structure change.');
        }

        const data = await page.content();
        return data;
    } finally {
        await page.close();
    }
}

async function scrapePage(config, pageNum = 1) {
    const { type = '', anonymity = '', country = '', speed = '', port = '' } = config;
    const url = `https://www.freeproxy.world/?type=${type}&anonymity=${anonymity}&country=${country}&speed=${speed}&port=${port}&page=${pageNum}`;

    console.log(`[Scraper] Fetching page ${pageNum}: ${url}`);

    let html = null;
    let method = 'Axios';

    try {
        // Try Axios first (Fast)
        html = await scrapeWithAxios(url);
    } catch (error) {
        console.warn(`[Scraper] Axios failed (likely 403): ${error.message}. Switching to Puppeteer fallback...`);
        method = 'Puppeteer';
        try {
            // Fallback to Puppeteer (Stealth)
            html = await scrapeWithPuppeteer(url);
        } catch (puppeteerError) {
            console.error(`[Scraper] Puppeteer fallback also failed: ${puppeteerError.message}`);
            return [];
        }
    }

    const $ = cheerio.load(html);
    const proxies = [];

    const rows = $('table tr');
    if (rows.length <= 1) {
        // If it's 403 or empty despite bypass attempts
        if ($('title').text().includes('403') || html.includes('Cloudflare')) {
            console.error(`[Scraper] Failed to bypass Cloudflare on page ${pageNum} using ${method}.`);
            return null;
        }
        console.log(`[Scraper] No data found on page ${pageNum}.`);
        return null;
    }

    rows.each((i, el) => {
        if (i === 0) return; // Skip header

        const tds = $(el).find('td');
        if (tds.length < 8) return;

        const ip = $(tds[0]).text().trim();
        const portText = $(tds[1]).text().trim();
        const countryLink = $(tds[2]).find('a').attr('href');
        const countryMatch = countryLink ? countryLink.match(/country=([^&]+)/) : null;
        const country = countryMatch ? countryMatch[1] : '';
        const city = $(tds[3]).text().trim();
        const proxyTypes = [];
        $(tds[5]).find('a').each((j, a) => {
            const t = $(a).text().trim().toLowerCase();
            if (t) proxyTypes.push(t);
        });

        if (ip && portText) {
            proxyTypes.forEach(t => {
                proxies.push({
                    ip,
                    port: portText,
                    country,
                    city,
                    type: t,
                    url: `${t}://${ip}:${portText}`
                });
            });
        }
    });

    console.log(`[Scraper] Found ${proxies.length} entries on page ${pageNum} using ${method}.`);
    return proxies;
}

async function scrapeAll(configs) {
    let allProxies = [];
    try {
        for (const config of configs) {
            let page = 1;
            console.log(`[Scraper] Starting crawl for config: ${JSON.stringify(config)}`);
            while (true) {
                const proxies = await scrapePage(config, page);
                if (proxies === null) break; 
                if (proxies.length === 0) break;
                
                allProxies = allProxies.concat(proxies);
                page++;
                
                // Adaptive delay
                const delay = 2000 + Math.random() * 3000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                if (page > 10) break; // Safety limit
            }
        }
    } finally {
        await closeBrowserInstance();
    }

    // Deduplicate by URL
    const uniqueMap = new Map();
    allProxies.forEach(p => uniqueMap.set(p.url, p));
    const result = Array.from(uniqueMap.values());
    console.log(`[Scraper] Total unique proxies scraped: ${result.length}`);
    return result;
}

module.exports = {
    scrapeAll
};
