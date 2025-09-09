/**
 * @file Handles all authentication API endpoints by delegating to lifecycle utilities.
 * @version 2.0.0 (authio)
 */

import {handleLogin} from '../login.mjs';
import {handleLogout} from '../logout.mjs';

/**
 * @namespace ApiHandler
 * @description A handler for authentication API routes.
 */
export const ApiHandler = {
    /**
     * Checks if a request matches an API route and handles it.
     * @param {Request} request - The incoming request.
     * @param {object} env - The worker's environment object.
     * @param {ExecutionContext} ctx - The worker's execution context.
     * @param {object} config - The application's auth configuration object.
     * @returns {Promise<Response|null>} A Response if the route is matched, otherwise null.
     */
    async handleRequest(request, env, ctx, config) {
        const url = new URL(request.url);

        // --- Login Endpoint ---
        if (url.pathname === config.loginApiPath) {
            return handleLogin(request, env, ctx, {config});
        }

        // --- Logout Endpoint ---
        if (url.pathname === config.logoutApiPath) {
            return handleLogout(request, env, ctx, {config});
        }

        return null; // Not an API route
    }
};