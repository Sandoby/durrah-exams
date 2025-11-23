#!/usr/bin/env node

/**
 * Health Check Script
 * Checks the health of all services
 */

const https = require('https');
const http = require('http');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkUrl(url, name) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        const startTime = Date.now();

        const req = protocol.get(url, (res) => {
            const responseTime = Date.now() - startTime;

            if (res.statusCode === 200) {
                log(`  ✅ ${name} - OK (${responseTime}ms)`, 'green');
                resolve(true);
            } else {
                log(`  ⚠️  ${name} - Status ${res.statusCode} (${responseTime}ms)`, 'yellow');
                resolve(false);
            }
        });

        req.on('error', (error) => {
            log(`  ❌ ${name} - ${error.message}`, 'red');
            resolve(false);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            log(`  ❌ ${name} - Timeout`, 'red');
            resolve(false);
        });
    });
}

async function main() {
    log('═══════════════════════════════════════', 'blue');
    log('  Durrah Exams - Health Check', 'blue');
    log('═══════════════════════════════════════', 'blue');

    // Read environment variables
    require('dotenv').config({ path: '../frontend/.env.local' });
    require('dotenv').config({ path: '../backend/.env' });

    const checks = [
        {
            name: 'Supabase API',
            url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        },
        {
            name: 'Backend API',
            url: (process.env.VITE_API_BASE || 'http://localhost:8000') + '/health'
        },
        {
            name: 'Frontend',
            url: 'http://localhost:5173'
        }
    ];

    log('\nChecking services...\n', 'blue');

    const results = await Promise.all(
        checks.map(check => checkUrl(check.url, check.name))
    );

    const allHealthy = results.every(r => r);

    log('\n═══════════════════════════════════════', 'blue');
    if (allHealthy) {
        log('  ✅ All services are healthy!', 'green');
    } else {
        log('  ⚠️  Some services are down', 'yellow');
    }
    log('═══════════════════════════════════════\n', 'blue');

    process.exit(allHealthy ? 0 : 1);
}

main().catch(error => {
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
});
