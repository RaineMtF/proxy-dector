const { startServer } = require('./server');

// Redirect all stderr to stdout
console.error = console.log;

// Prevent global crashes from unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
    console.log('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.log('[System] Uncaught Exception:', err);
});

console.log('Starting Proxy Detector Service...');
startServer();
