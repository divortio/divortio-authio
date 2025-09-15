/**
 * @file The default, empty UserStore for the Authio module.
 * @version 1.0.0
 *
 * @description
 * This file provides a default, empty UserStore object. It is used by the
 * build script as a fallback when a custom `_users.mjs` file is not present
 * in the project root. This ensures that the application can always import a
 * valid, albeit empty, UserStore, preventing import errors during development
 * or deployment.
 *
 * @note This file should NOT be modified directly. To add users, create a
 * `_users.mjs` file in the root of your project.
 */

/**
 * @namespace UserStore
 * @description An empty key-value object for user credentials.
 */
export const UserStore = {};