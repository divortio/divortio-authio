/**
 * @file Provides a self-contained, fallback HTML login page.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module exports a single function that returns a complete, unstyled HTML document
 * for user login. It is designed to be a graceful fallback in case the primary, themed
 * `login.html` asset cannot be found in the parent project's static assets.
 *
 * This approach ensures that the authentication system can always present a functional
 * login interface to the user, preventing a crash or a broken user experience due to a
 * missing asset. The HTML is self-contained and includes all necessary CSS and JavaScript.
 */

/**
 * Generates a simple, default HTML login page.
 *
 * @param {string} loginApiPath - The API path that the login form should submit to.
 * This is injected into the form's `action` and the fetch call in the script.
 * @returns {string} A complete, self-contained HTML document as a string.
 */
export function fallbackLoginPage(loginApiPath) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: grid; place-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; color: #f0f0f0; }
        .login-box { background: #2a2a2a; padding: 2rem; border-radius: 8px; border: 1px solid #444; text-align: center; width: 320px; }
        form { display: flex; flex-direction: column; gap: 1rem; }
        h2 { margin-top: 0; }
        input, button { padding: 0.75rem; border-radius: 4px; border: 1px solid #555; background: #333; color: #eee; font-size: 1rem; }
        button { background: #007bff; color: white; cursor: pointer; border: none; }
        #error { color: #ff8a8a; margin-top: 1rem; min-height: 1.2em; font-size: 0.9em; }
    </style>
</head>
<body>
<div class="login-box">
    <h2>Secure Login</h2>
    <form id="login-form">
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Log In</button>
        <div id="error"></div>
    </form>
</div>
<script>
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('error');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = '';
        const username = form.username.value;
        const password = form.password.value;
        try {
            const res = await fetch('${loginApiPath}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                window.location.href = '/'; // Redirect to root on success
            } else {
                const data = await res.json();
                errorDiv.textContent = data.error || 'Login failed.';
            }
        } catch (err) {
            errorDiv.textContent = 'A network error occurred.';
        }
    });
</script>
</body></html>`;
}