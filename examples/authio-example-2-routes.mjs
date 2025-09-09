/**
 * @file Example 2: Manual Routing with Selective Protection
 * @version 1.0.0
 *
 * @description
 * This example shows how to use the modular functions (`authenticate`, `handleLogin`,
 * `handleLogout`) to build a custom router where only some routes are protected.
 */

import {authenticate, handleLogin, handleLogout} from '../src/index.mjs';

// --- Main Worker Entry Point ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- Public Route ---
        if (url.pathname === '/') {
            return new Response('This is the public homepage. Anyone can see this.');
        }

        // --- API Lifecycle Routes ---
        if (url.pathname === '/api/login') {
            return handleLogin(request, env, ctx);
        }
        if (url.pathname === '/api/logout') {
            return handleLogout(request, env, ctx);
        }

        // --- Protected Route ---
        if (url.pathname.startsWith('/admin')) {
            // 1. Authenticate the request
            const authedRequest = await authenticate(request, env, ctx);

            // 2. Check the result and act accordingly
            if (!authedRequest.isAuthed) {
                // The developer decides what to do. Return a 401, 403, or redirect.
                return new Response('Unauthorized. You must be logged in to see this.', {status: 401});
            }

            // 3. Proceed with the application logic, using the auth context
            const username = authedRequest.authio.username;
            return new Response(`Welcome to the admin panel, ${username}!`);
        }

        return new Response('Not Found', {status: 404});
    }
};