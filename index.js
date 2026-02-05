const { startServer } = require('./server');

// Prevent global crashes from unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('[System] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[System] Uncaught Exception:', err);
});

console.log('Starting Proxy Detector Service...');
startServer();
