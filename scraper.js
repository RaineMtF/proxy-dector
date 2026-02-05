const axios = require('axios');
const cheerio = require('cheerio');
const { getProxyAgent, commonHeaders } = require('./utils');

async function scrapePage(config, page = 1) {
    const { type = '', anonymity = '', country = '', speed = '', port = '' } = config;
    const url = `https://www.freeproxy.world/?type=${type}&anonymity=${anonymity}&country=${country}&speed=${speed}&port=${port}&page=${page}`;

    console.log(`[Scraper] Fetching page ${page}: ${url}`);
    
    try {
        const agent = getProxyAgent();
        const response = await axios.get(url, {
            headers: commonHeaders,
            httpsAgent: agent,
            proxy: false, 
            timeout: 15000 // Increased timeout for stability
        });

        const $ = cheerio.load(response.data);
        const proxies = [];

        const rows = $('table tr');
        if (rows.length <= 1) {
            console.log(`[Scraper] No data found on page ${page}.`);
            return null; // Signal that no more data is available
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

        console.log(`[Scraper] Found ${proxies.length} entries on page ${page}.`);
        return proxies;
    } catch (error) {
        console.error(`[Scraper] Error fetching page ${page}:`, error.message);
        return []; // Return empty but don't stop yet on transient errors? No, maybe better to return null if it's a 404 or something, but let's stick to empty for now.
    }
}

async function scrapeAll(configs) {
    let allProxies = [];
    for (const config of configs) {
        let page = 1;
        console.log(`[Scraper] Starting crawl for config: ${JSON.stringify(config)}`);
        while (true) {
            const proxies = await scrapePage(config, page);
            if (proxies === null || proxies.length === 0) {
                break; // End of data or error
            }
            allProxies = allProxies.concat(proxies);
            page++;
            // Random delay to avoid anti-crawler detection
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
        }
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
