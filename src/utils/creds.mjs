/**
 * @file A dedicated module for loading, validating, and providing access to credentials.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module is the single source of truth for all user and service credentials.
 * It uses dynamic `import()` to load the user store from the path specified
 * in the configuration. It performs schema validation to ensure the data is in the
 * correct format and caches the store in memory for high performance.
 */

/**
 * @typedef {object<string, string>} UserStore
 * @description The schema for the user credential store. A key-value object where the
 * key is the username and the value is the password or token.
 * @example
 * export const UserStore = {
 * "admin": "a_very_strong_password",
 * "service_account_1": "a_long_and_secret_api_token"
 * };
 */

// Module-level cache for the loaded credential store.
let userStore = null;

/**
 * @namespace CredentialStore
 * @description Manages the lifecycle of credential data.
 */
export const CredentialStore = {
    /**
     * Loads, validates, and returns the UserStore.
     * This function is designed to run once and cache the result for subsequent calls.
     *
     * @param {string} path - The path to the UserStore module.
     * @param {import('./logger.mjs').Logger} logger - The logger instance.
     * @returns {Promise<UserStore>} A promise that resolves to the validated user store object.
     * @throws {Error} If the module cannot be loaded or if its schema is invalid.
     */
    async get(path, logger) {
        if (userStore) return userStore;
        try {
            const module = await import(path);
            if (typeof module.UserStore !== 'object' || module.UserStore === null) {
                throw new Error("UserStore export is not a valid object.");
            }
            logger.info('UserStore loaded and validated successfully.');
            userStore = module.UserStore;
            return userStore;
        } catch (e) {
            logger.error('Failed to import UserStore.', {path, error: e.message});
            throw new Error("Fatal: Could not load UserStore. Please check AUTH_USERS_MODULE_PATH in wrangler.toml.");
        }
    },
};