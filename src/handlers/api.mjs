/**
 * @file Handles all authentication API endpoints by delegating to lifecycle utilities.
 * @version 2.3.0 (authio)
 */

import {handleLogin} from './login.mjs';
import {handleLogout} from './logout.mjs';

/**
 * @namespace ApiHandler
 * @description A handler for authentication API routes.
 */
export const ApiHandler = {
    /**
     * Checks if a request matches an API route and handles it.
     * @param {Request} request - The incoming request, pre-processed and enhanced with a .parsedUrl property.
     * @param {object} env - The worker's environment object.
     * @param {ExecutionContext} ctx - The worker's execution context.
     * @param {object} config - The application's auth configuration object.
     * @returns {Promise<Response|null>} A Response if the route is matched, otherwise null.
     */
    async handleRequest(request, env, ctx, config) {
        const url = request.parsedUrl; // Use the pre-parsed URL

        // --- Login Endpoint ---
        if (url.pathname === config.loginApiPath) {
            // --- RATE LIMITING ---
            const ip = request.headers.get("CF-Connecting-IP") || "unknown-ip";

            // Clone the request to read the body for the username, as it can only be read once.
            const requestClone = request.clone();
            const {username} = await requestClone.json();

            // Use a composite key of IP and username for more specific rate limiting.
            const rateLimitKey = `${ip}:${username}`;

            const {success} = await env.RATE_LIMITER.limit({key: rateLimitKey});

            if (!success) {
                return new Response(JSON.stringify({error: 'Too many requests'}), {
                    status: 429,
                    headers: {'Content-Type': 'application/json'}
                });
            }
            // --- END RATE LIMITING ---

            return handleLogin(request, env, ctx, {config});
        }

        // --- Logout Endpoint ---
        if (url.pathname === config.logoutApiPath) {
            return handleLogout(request, env, ctx, {config});
        }

        return null; // Not an API route
    }
};