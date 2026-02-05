const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

function generateSimple(nodes) {
    return nodes.map(n => n.url).join('\n');
}

function generateV2rayN(nodes) {
    // Format: socks://Og@ip:port#country,%20city_url_encoded
    // User requested: socks://Og@72.195.114.169:4145#US,%20Los%20Angeles
    return nodes.map(n => {
        const cityEncoded = encodeURIComponent(n.city);
        const tag = `${n.country},%20${cityEncoded}`;
        return `socks://Og@${n.ip}:${n.port}#${tag}`;
    }).join('\n');
}

function generateJson(nodes) {
    return JSON.stringify(nodes, null, 2);
}

function generateCsv(nodes) {
    return stringify(nodes, { header: true });
}

function saveAll(nodes, targetDir) {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(path.join(targetDir, 'simple.txt'), generateSimple(nodes));
    fs.writeFileSync(path.join(targetDir, 'v2rayn.txt'), generateV2rayN(nodes));
    fs.writeFileSync(path.join(targetDir, 'nodes.json'), generateJson(nodes));
    fs.writeFileSync(path.join(targetDir, 'nodes.csv'), generateCsv(nodes));
    
    console.log(`Subscription files saved to ${targetDir}`);
}

module.exports = {
    saveAll
};
