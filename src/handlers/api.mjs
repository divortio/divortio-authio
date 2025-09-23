/**
 * @file Handles all authentication API endpoints by delegating to lifecycle utilities.
 * @version 2.4.0 (authio)
 */

import {handleLogin} from './login.mjs';
import {handleLogout} from './logout.mjs';
import {sendAuthAnalytics} from '../wae/index.mjs';

/**
 * @namespace ApiHandler
 * @description A handler for authentication API routes.
 */
export const ApiHandler = {
    async handleRequest(request, env, ctx, config) {
        const url = request.parsedUrl;

        // --- Login Endpoint ---
        if (url.pathname === config.loginApiPath) {
            try {
                // --- RATE LIMITING ---
                const ip = request.headers.get("CF-Connecting-IP") || "unknown-ip";

                // Clone the request to read the body, as it can only be read once.
                const requestClone = request.clone();
                const {username} = await requestClone.json();

                // A username is required to create a specific rate-limiting key.
                if (!username) {
                    return new Response(JSON.stringify({error: 'Username is required'}), {
                        status: 400,
                        headers: {'Content-Type': 'application/json'}
                    });
                }

                const rateLimitKey = `${ip}:${username}`;
                const {success} = await env.RATE_LIMITER.limit({key: rateLimitKey});

                if (!success) {
                    // --- ANALYTICS ---
                    // Send a specific event for a rate-limited request.
                    const authContext = {
                        isAuthed: false,
                        method: 'error',
                        username: username,
                        error: 'Too many requests',
                    };
                    sendAuthAnalytics(request, env, authContext, {isRateLimited: true});
                    // --- END ANALYTICS ---

                    return new Response(JSON.stringify({error: 'Too many requests'}), {
                        status: 429,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                // --- END RATE LIMITING ---

                return handleLogin(request, env, ctx, {config});

            } catch (e) {
                // This catch block handles errors from requestClone.json() if the body is malformed.
                return new Response(JSON.stringify({error: 'Invalid request body'}), {
                    status: 400,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }

        // --- Logout Endpoint ---
        if (url.pathname === config.logoutApiPath) {
            return handleLogout(request, env, ctx, {config});
        }

        return null; // Not an API route
    }
};