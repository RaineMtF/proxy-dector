const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent'); // need to add this too? actually axios handles http-proxy-agent if needed, but let's be explicit
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');

function getProxyAgent() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (proxyUrl) {
        // console.log(`Using system proxy: ${proxyUrl}`);
        return new HttpsProxyAgent(proxyUrl);
    }
    return null;
}

function getAgentForProxy(proxyUrl) {
    if (proxyUrl.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith('https')) {
        return new HttpsProxyAgent(proxyUrl);
    } else {
        return new HttpProxyAgent(proxyUrl);
    }
}

const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://www.freeproxy.world/',
    'Upgrade-Insecure-Requests': '1'
};

module.exports = {
    getProxyAgent,
    getAgentForProxy,
    commonHeaders
};
