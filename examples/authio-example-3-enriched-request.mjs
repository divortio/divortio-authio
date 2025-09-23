/**
 * @file Example 3: Showcase of the Enriched Request Context
 * @version 1.0.0
 *
 * @description
 * This example demonstrates how to access every property available on the
 * `request.authio` object that Authio enriches your requests with.
 */

import {createAuthHandler} from '../src/index.mjs';

/**
 * A simple application that displays all the properties of the authio context.
 * This logic is only reachable if the user is authenticated and authorized.
 */
async function showcaseApp(request, env, ctx) {
    // The top-level booleans provide quick access for simple checks.
    const {isAuthed, isAuthorized} = request;

    // The `authio` object contains the full, detailed context.
    const {
        method,
        username,
        payload, // Note: This will be null for header-based auth
        matchedRoute,
        error,     // Note: This will be null on a successful request
        timestamp
    } = request.authio;

    // Convert the timestamp to a readable date string.
    const checkTime = new Date(timestamp).toUTCString();

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Authio Context Showcase</title>
        <style>
            body { font-family: sans-serif; background: #222; color: #eee; padding: 2em; }
            table { border-collapse: collapse; width: 80%; margin: 2em auto; }
            th, td { border: 1px solid #555; padding: 0.8em; text-align: left; }
            th { background: #333; }
            code { background: #444; padding: 0.2em 0.4em; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>Authio Enriched Request Context</h1>
        <p>This page displays all the properties available to your application after a successful authentication and authorization check.</p>
        
        <table>
            <tr>
                <th>Top-Level Property</th>
                <th>Value</th>
                <th>Description</th>
            </tr>
            <tr>
                <td><code>request.isAuthed</code></td>
                <td><strong>${isAuthed}</strong></td>
                <td>A boolean indicating if the user's identity was verified.</td>
            </tr>
            <tr>
                <td><code>request.isAuthorized</code></td>
                <td><strong>${isAuthorized}</strong></td>
                <td>A boolean indicating if the user has permission for this specific route.</td>
            </tr>
        </table>
        
        <h2>Detailed <code>request.authio</code> Object</h2>
        <table>
            <tr>
                <th>Property</th>
                <th>Value</th>
                <th>Description</th>
            </tr>
            <tr>
                <td><code>method</code></td>
                <td><code>${method}</code></td>
                <td>The method used for authentication (e.g., jwt, jwt-cache, header).</td>
            </tr>
            <tr>
                <td><code>username</code></td>
                <td><code>${username}</code></td>
                <td>The unique identifier of the authenticated user.</td>
            </tr>
            <tr>
                <td><code>matchedRoute</code></td>
                <td><code>${matchedRoute}</code></td>
                <td>The specific route pattern that authorized this request.</td>
            </tr>
            <tr>
                <td><code>timestamp</code></td>
                <td><code>${timestamp}</code> (${checkTime})</td>
                <td>The UTC timestamp of when the auth check was performed.</td>
            </tr>
             <tr>
                <td><code>error</code></td>
                <td><code>${error || 'null'}</code></td>
                <td>Null on success. Contains an error message on failure.</td>
            </tr>
            <tr>
                <td><code>payload</code></td>
                <td><pre><code>${JSON.stringify(payload, null, 2) || 'null'}</code></pre></td>
                <td>The full, decoded JWT payload. Null for header-based auth.</td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return new Response(html, {
        headers: {'Content-Type': 'text/html'}
    });
}

// Wrap the showcase app with the Authio handler.
export default createAuthHandler(showcaseApp);