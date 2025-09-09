/**
 * @file Example 1: The "All-in-One" Wrapper for Full Application Protection
 * @version 1.0.0
 *
 * @description
 * This is the simplest way to use Authio. The `createAuthHandler` function wraps
 * your entire application, automatically handling login pages, redirects for
 * unauthenticated browsers, and protecting all routes.
 */

// In a real project, you would import this from your 'authio' module.
import {createAuthHandler} from '../src/index.mjs';

/**
 * A simple application fetch handler to be protected.
 * This logic is only reachable if the user is authenticated.
 */
async function mySimpleApp(request, env, ctx) {
    // The request object here will have `request.authio` and `request.isAuthed` attached.
    const username = request.authio.username;
    return new Response(`<h1>Welcome to the protected app, ${username}!</h1>`, {
        headers: {'Content-Type': 'text/html'}
    });
}

// The `createAuthHandler` wraps the application, providing a complete auth solution.
const protectedApp = createAuthHandler(mySimpleApp);

// --- Main Worker Entry Point ---
export default {
    async fetch(request, env, ctx) {
        return protectedApp(request, env, ctx);
    }
};