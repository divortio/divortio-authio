/**
 * @file /buildCreds.js
 * @description This build script handles the user credentials configuration.
 * It checks for a user-defined `_users.mjs` file at the project root and copies
 * it to `src/creds/users.mjs`. If the file doesn't exist, it uses a default,
 * empty configuration instead. This allows developers to easily manage credentials
 * without modifying the core module source code.
 */

import fs from 'fs';
import path from 'path';

// Define the source and destination paths for the credential files.
const userCredsPath = path.resolve(process.cwd(), '_users.mjs');
const appCredsPath = path.resolve(process.cwd(), 'src/creds/users.mjs');
const defaultCredsPath = path.resolve(process.cwd(), 'src/creds/usersDefault.mjs');

try {
    // Check if the user-defined credentials file exists at the root.
    if (fs.existsSync(userCredsPath)) {
        console.log('[Build] User-defined `_users.mjs` found. Applying credentials...');
        // If it exists, copy its content to the application's creds directory.
        fs.copyFileSync(userCredsPath, appCredsPath);
    } else {
        console.log('[Build] No `_users.mjs` found. Using default empty credentials.');
        // If it doesn't exist, use the default (empty) configuration.
        fs.copyFileSync(defaultCredsPath, appCredsPath);
    }
    console.log('[Build] User credentials configuration complete.');
} catch (error) {
    console.error('[Build] FATAL: Failed to configure user credentials.', error);
    // Exit with an error code to halt any subsequent build or deploy process.
    process.exit(1);
}