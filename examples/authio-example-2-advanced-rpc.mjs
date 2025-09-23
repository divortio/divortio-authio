/**
 * @file Example 2: Advanced RPC Usage with Custom Routing
 * @version 1.0.0 (RPC)
 *
 * @description
 * This file demonstrates how a parent worker can use the granular RPC methods
 * for complex scenarios, such as applications with a mix of public and
 * private routes.
 */

export default {
    /**
     * @param {Request} request
     * @param {object} env - Contains the AUTH_SERVICE binding to the Authio worker.
     * @param {object} ctx
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- Public Route (No RPC call needed) ---
        if (url.pathname === '/') {
            return new Response('This is the public homepage.');
        }

        // --- Auth API Routes (Forwarded to Authio) ---
        if (url.pathname === '/api/login') {
            return env.AUTH_SERVICE.handleLogin(request);
        }
        if (url.pathname === '/api/logout') {
            return env.AUTH_SERVICE.handleLogout(request);
        }

        // --- Protected Route (Requires RPC call to `authenticate`) ---
        if (url.pathname.startsWith('/admin')) {
            // 1. Call the remote authenticate method.
            const authedRequest = await env.AUTH_SERVICE.authenticate(request);

            // 2. Check the authorization status from the response.
            if (!authedRequest.isAuthorized) {
                // Decide what to do. You could return a 404 to hide the path's existence.
                return new Response("Forbidden", {status: 403});
            }

            // 3. Proceed with application logic, using the enriched context.
            const username = authedRequest.authio.username;
            return new Response(`Welcome to the admin panel, ${username}!`);
        }

        return new Response('Not Found', {status: 404});
    }
};