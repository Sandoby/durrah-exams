#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Validates that all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

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

function checkEnvFile(filePath, requiredVars) {
    log(`\nChecking ${filePath}...`, 'blue');

    if (!fs.existsSync(filePath)) {
        log(`  ❌ File not found: ${filePath}`, 'red');
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const envVars = {};

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, value] = trimmed.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }
    });

    let allPresent = true;
    requiredVars.forEach(varName => {
        if (envVars[varName]) {
            log(`  ✅ ${varName}`, 'green');
        } else {
            log(`  ❌ ${varName} - MISSING`, 'red');
            allPresent = false;
        }
    });

    return allPresent;
}

function main() {
    log('═══════════════════════════════════════', 'blue');
    log('  Durrah Exams - Environment Check', 'blue');
    log('═══════════════════════════════════════', 'blue');

    const checks = [
        {
            name: 'Frontend',
            path: path.join(__dirname, '../frontend/.env.local'),
            required: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
        },
        {
            name: 'Backend',
            path: path.join(__dirname, '../backend/.env'),
            required: [
                'SUPABASE_URL',
                'SUPABASE_SERVICE_ROLE',
                'JWT_SECRET',
                'CORS_ORIGINS'
            ]
        }
    ];

    let allPassed = true;

    checks.forEach(check => {
        const passed = checkEnvFile(check.path, check.required);
        if (!passed) allPassed = false;
    });

    log('\n═══════════════════════════════════════', 'blue');
    if (allPassed) {
        log('  ✅ All environment variables are set!', 'green');
        log('  Ready for deployment!', 'green');
    } else {
        log('  ❌ Some environment variables are missing', 'red');
        log('  Please check the files above', 'yellow');
    }
    log('═══════════════════════════════════════\n', 'blue');

    process.exit(allPassed ? 0 : 1);
}

main();
