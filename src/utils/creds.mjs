/**
 * @file A dedicated class for fetching and caching user credentials from Cloudflare KV.
 * @version 3.0.0 (authio)
 */

/**
 * @typedef {object} User
 * @property {string} username
 * @property {string} password
 * @property {string[]} routes
 */

/**
 * @typedef {object} CachedUser
 * @property {User} user - The user object from KV.
 * @property {number} expires - The timestamp when the cache entry expires.
 */

/**
 * @class CredentialStore
 * @description Manages fetching and caching of user data from a KV namespace.
 * Implements a lazy-loading, cache-first strategy to ensure high performance.
 */
export class CredentialStore {
    /**
     * @param {KVNamespace} kv - The KV namespace binding.
     * @param {import('./logger.mjs').Logger} logger - The logger instance.
     * @param {number} cacheTtlMs - The TTL for the in-memory user cache in milliseconds.
     */
    constructor(kv, logger, cacheTtlMs) {
        if (!kv) {
            // This is a fatal error; the service cannot run without the user store.
            const errorMsg = "FATAL: AUTH_USERS_KV binding is missing. Please check wrangler.toml.";
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }
        this.kv = kv;
        this.logger = logger;
        this.cacheTtlMs = cacheTtlMs;
        /** @type {Map<string, CachedUser>} */
        this.userCache = new Map();
    }

    /**
     * Retrieves a user, prioritizing the in-memory cache before fetching from KV.
     * @param {string} username - The username to fetch.
     * @returns {Promise<User|null>} The user object or null if not found.
     */
    async getUser(username) {
        if (!username) return null;

        // 1. Check in-memory cache first
        const cachedEntry = this.userCache.get(username);
        if (cachedEntry && Date.now() < cachedEntry.expires) {
            this.logger.info(`User cache hit for: ${username}`);
            return cachedEntry.user;
        }

        // 2. Cache miss or stale, fetch from KV
        this.logger.info(`User cache miss for: ${username}. Fetching from KV.`);
        try {
            const userJson = await this.kv.get(`user:${username}`);
            if (!userJson) {
                this.logger.warn(`User not found in KV: ${username}`);
                // Cache the "not found" result to prevent repeated lookups for invalid users
                this.userCache.set(username, {
                    user: null,
                    expires: Date.now() + this.cacheTtlMs,
                });
                return null;
            }

            const user = JSON.parse(userJson);

            // 3. Update in-memory cache with the found user
            this.userCache.set(username, {
                user,
                expires: Date.now() + this.cacheTtlMs,
            });

            return user;
        } catch (e) {
            this.logger.error(`Failed to fetch or parse user from KV for: ${username}`, {error: e.message});
            // Do not cache failures to allow for recovery
            return null;
        }
    }
}