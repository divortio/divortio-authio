/**
 * @file Example 1: Simple, Boilerplate-Free RPC Usage
 * @version 1.0.0 (RPC)
 *
 * @description
 * This file demonstrates the recommended way for a parent worker to consume the
 * Authio RPC service. By using the `handleRequest` method, all authentication,
 * authorization, and boilerplate (redirects, error responses) are handled by
 * the remote Authio service.
 */

/**
 * This is the parent worker's main application logic.
 * It will only be executed if a user is successfully authenticated and
 * authorized by the remote Authio service.
 *
 * @param {Request} request - The request object, enriched with the `authio` context.
 * @returns {Promise<Response>}
 */
async function myProtectedApp(request) {
    const username = request.authio.username;
    return new Response(`Hello from the main application, ${username}!`);
}

export default {
    /**
     * @param {Request} request
     * @param {object} env - Contains the AUTH_SERVICE binding to the Authio worker.
     * @param {object} ctx
     */
    async fetch(request, env, ctx) {
        // This single line handles everything.
        // It calls the remote Authio service, passing a stub of the application logic.
        // Authio will only call `myProtectedApp` if the user is fully authorized.
        return env.AUTH_SERVICE.handleRequest(request, myProtectedApp);
    }
};