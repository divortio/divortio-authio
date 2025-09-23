/**
 * @file Example 3: Showcase of the RPC Enriched Request Context
 * @version 1.0.0 (RPC)
 *
 * @description
 * This example demonstrates how to access every property available on the
 * `request.authio` object after it has been returned from the Authio RPC service.
 */

/**
 * The main application logic. This function receives the request after it has
 * been processed and enriched by the remote Authio service.
 * @param {Request} request
 */
async function showcaseApp(request) {
    const {isAuthed, isAuthorized, authio} = request;
    const {method, username, payload, matchedRoute, timestamp} = authio;
    const checkTime = new Date(timestamp).toUTCString();

    const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Authio RPC Context</title></head>
    <body>
        <h1>Authio Enriched Request Context (from RPC)</h1>
        <p><strong>isAuthed:</strong> ${isAuthed}</p>
        <p><strong>isAuthorized:</strong> ${isAuthorized}</p>
        <hr>
        <h2>request.authio object:</h2>
        <ul>
            <li><strong>Method:</strong> ${method}</li>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Matched Route:</strong> ${matchedRoute}</li>
            <li><strong>Timestamp:</strong> ${checkTime}</li>
            <li><strong>JWT Payload:</strong> <pre>${JSON.stringify(payload, null, 2) || 'null'}</pre></li>
        </ul>
    </body>
    </html>
    `;

    return new Response(html, {headers: {'Content-Type': 'text/html'}});
}

export default {
    async fetch(request, env, ctx) {
        // Use the simple `handleRequest` for this showcase.
        return env.AUTH_SERVICE.handleRequest(request, showcaseApp);
    }
};