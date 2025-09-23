/**
 * @file A composable function for authenticating and authorizing a request.
 * @version 3.0.0 (authio)
 */

import {createAuthConfig} from './config.mjs';
import {JWT} from './utils/jwt.mjs';
import {Logger} from './utils/logger.mjs';
import {sendAuthAnalytics} from './wae/index.mjs';
import {matchRoute} from './utils/route-matcher.mjs';

// Caches persist for the lifetime of the worker isolate.
const verifiedJwtCache = new Map();
const routeAuthCache = new Map();

/**
 * Removes the N oldest entries from a given cache.
 * @param {Map<any, any>} cache - The cache to evict from.
 * @param {number} batchSize - The number of entries to remove.
 */
function evictOldestEntries(cache, batchSize) {
    const keys = Array.from(cache.keys());
    for (let i = 0; i < batchSize && i < keys.length; i++) {
        cache.delete(keys[i]);
    }
}

/**
 * @typedef {import('./config.mjs').AuthConfig} AuthConfig
 */

/**
 * Represents the detailed result of an authentication and authorization attempt.
 *
 * @typedef {object} AuthioContext
 * @property {boolean} isAuthed - True if the user's identity was successfully verified.
 * @property {boolean} isAuthorized - True if the user is authorized to access the requested URL.
 * @property {string|null} method - The method of authentication ('jwt', 'header', 'error', etc.).
 * @property {string|null} username - The name of the authenticated user.
 * @property {object|null} payload - The full decoded JWT payload.
 * @property {string|null} matchedRoute - The route pattern that authorized the request.
 * @property {string|null} error - A description of the error if an attempt failed.
 * @property {number} timestamp - A UTC timestamp of when the check was performed.
 */

/**
 * An enriched Cloudflare Worker Request object.
 *
 * @typedef {Request & {isAuthed: boolean, isAuthorized: boolean, authio: AuthioContext}} AuthenticatedRequest
 */

/**
 * Inspects a request, determines authentication and authorization status,
 * and returns a new, enriched request object.
 */
export async function authenticate(request, env, ctx, options = {}) {
    const clonedRequest = request.clone();
    const url = new URL(request.url);

    const logger = new Logger({
        enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn'
    }).withContext({requestId: request.headers.get('cf-ray')});
    const config = options.config || await createAuthConfig(env, logger);

    /** @type {AuthioContext} */
    const authResult = {
        isAuthed: false,
        isAuthorized: false,
        method: null,
        username: null,
        payload: null,
        matchedRoute: null,
        error: null,
        timestamp: Date.now()
    };

    let authorizedRoutes = [];

    try {
        // --- 1. AUTHENTICATION ---
        const cookieHeader = clonedRequest.headers.get('Cookie') || '';
        const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
        const token = cookies[config.authTokenName];

        // JWT Cache-First Auth (No KV access)
        if (token) {
            const cacheEntry = verifiedJwtCache.get(token);
            if (cacheEntry && Date.now() < cacheEntry.expires) {
                authResult.isAuthed = true;
                authResult.method = 'jwt-cache';
                authResult.username = cacheEntry.payload.sub;
                authResult.payload = cacheEntry.payload;
                authorizedRoutes = cacheEntry.payload.routes || [];
            }
        }

        // Programmatic Header Auth (Triggers KV access)
        const programmaticAuthHeader = clonedRequest.headers.get(config.agentHeaderName);
        if (!authResult.isAuthed && programmaticAuthHeader) {
            try {
                const decoded = atob(programmaticAuthHeader);
                const firstColonIndex = decoded.indexOf(':');
                if (firstColonIndex === -1) throw new Error('Header credentials format error');

                const username = decoded.substring(0, firstColonIndex);
                const password = decoded.substring(firstColonIndex + 1);

                // Use the CredentialStore to fetch the user from KV.
                const user = await config.userStore.getUser(username);

                if (user && user.password === password) {
                    authResult.isAuthed = true;
                    authResult.method = 'header';
                    authResult.username = user.username;
                    authorizedRoutes = user.routes || [];
                } else {
                    authResult.username = username;
                    throw new Error('Invalid credentials provided in header');
                }
            } catch (e) {
                authResult.error = 'Malformed or invalid header credentials.';
            }
        }

        // Full JWT Validation (No KV access)
        if (!authResult.isAuthed && token) {
            const payload = await JWT.validate({request: clonedRequest, ...config});
            if (payload) {
                authResult.isAuthed = true;
                authResult.method = 'jwt';
                authResult.username = payload.sub;
                authResult.payload = payload;
                authorizedRoutes = payload.routes || [];
                authResult.error = null;

                if (verifiedJwtCache.size >= config.maxCacheSize) {
                    evictOldestEntries(verifiedJwtCache, config.cacheEvictionBatchSize);
                }
                verifiedJwtCache.set(token, {payload, expires: Date.now() + config.cacheTtlMs});
            } else if (!authResult.error) {
                authResult.error = 'Invalid or expired token.';
            }
        }

        // --- 2. AUTHORIZATION ---
        if (authResult.isAuthed) {
            const routeCacheKey = `${authResult.username}:${url.hostname}${url.pathname}`;
            if (routeAuthCache.has(routeCacheKey)) {
                const cacheEntry = routeAuthCache.get(routeCacheKey);
                authResult.isAuthorized = cacheEntry.isAuthorized;
                authResult.matchedRoute = cacheEntry.matchedRoute;
            } else {
                const {isAuthorized, matchedRoute} = matchRoute(url, authorizedRoutes);
                authResult.isAuthorized = isAuthorized;
                authResult.matchedRoute = matchedRoute;

                if (routeAuthCache.size >= config.maxCacheSize) {
                    evictOldestEntries(routeAuthCache, config.cacheEvictionBatchSize);
                }
                routeAuthCache.set(routeCacheKey, {isAuthorized, matchedRoute});
            }
            if (!authResult.isAuthorized) {
                authResult.error = `User not authorized for path: ${url.pathname}`;
            }
        } else {
            authResult.method = authResult.error ? 'error' : null;
        }

    } catch (e) {
        logger.error('A fatal error occurred during authentication/authorization.', {error: e.message});
        authResult.method = 'error';
        authResult.error = 'Internal authentication service error.';
    }

    clonedRequest.isAuthed = authResult.isAuthed;
    clonedRequest.isAuthorized = authResult.isAuthorized;
    clonedRequest.authio = authResult;

    sendAuthAnalytics(clonedRequest, env, authResult);

    return clonedRequest;
}