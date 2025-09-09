/**
 * @file The main public entry point for the Authio module.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module re-exports all high-level utility functions, providing a single,
 * convenient import for developers to handle all authentication scenarios and
 * lifecycle events.
 */

export {authenticate} from './auth.mjs';
export {handleLogin} from './handlers/login.mjs';
export {handleLogout} from './handlers/logout.mjs';
export {createAuthHandler} from './router.mjs';