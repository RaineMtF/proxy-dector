const axios = require('axios');
const pLimit = require('p-limit');
const { getAgentForProxy } = require('./utils');

const TEST_URL = 'http://www.msftconnecttest.com/connecttest.txt';
const TIMEOUT = 5000;
const CONCURRENCY = 16;
const SUCCESS_TEXT = "Microsoft Connect Test";

function normalizeText(text) {
    return text.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

const NORM_SUCCESS = normalizeText(SUCCESS_TEXT);

async function testProxy(proxy) {
    const start = Date.now();
    try {
        const agent = getAgentForProxy(proxy.url);
        // Explicitly disable system proxy for testing
        const response = await axios.get(TEST_URL, {
            httpAgent: agent,
            httpsAgent: agent,
            proxy: false, // Ensure we don't use system proxy defined in env vars
            timeout: TIMEOUT,
            responseType: 'text',
            validateStatus: (status) => status === 200
        });

        const latency = Date.now() - start;
        const body = (response.data || '').trim();
        
        if (normalizeText(body) === NORM_SUCCESS) {
            console.log(`[Tester] SUCCESS: ${proxy.url} - Latency: ${latency}ms`);
            return {
                ...proxy,
                latency,
                success: true
            };
        } else {
            console.log(`[Tester] FAILED (Content mismatch): ${proxy.url}`);
            return { ...proxy, success: false, error: 'Content mismatch' };
        }
    } catch (error) {
        // console.log(`[Tester] FAILED: ${proxy.url} - ${error.message}`);
        return { ...proxy, success: false, error: error.message };
    }
}

async function runTests(proxies) {
    const limit = pLimit(CONCURRENCY);
    console.log(`[Tester] Starting tests for ${proxies.length} proxies with concurrency ${CONCURRENCY}...`);
    
    let completed = 0;
    const tasks = proxies.map(proxy => limit(async () => {
        const result = await testProxy(proxy);
        completed++;
        if (completed % 20 === 0 || completed === proxies.length) {
            console.log(`[Tester] Progress: ${completed}/${proxies.length} tested.`);
        }
        return result;
    }));
    
    const results = await Promise.all(tasks);
    
    const passed = results.filter(r => r.success);
    console.log(`[Tester] Tests finished. ${passed.length}/${proxies.length} proxies passed.`);
    
    return passed.sort((a, b) => a.latency - b.latency);
}

module.exports = {
    runTests
};
