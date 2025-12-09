/**
 * Helper to get metadata from user (handles both camelCase and snake_case)
 */
const getMetadata = (user: any): any => {
    return user?.publicMetadata || user?.public_metadata || {};
};

/**
 * Checks if the user has admin privileges.
 * Admin privileges are determined by the `publicMetadata.role` property being set to 'admin'.
 * 
 * @param user The Clerk user object
 * @returns true if the user is an admin, false otherwise
 */
export const isAdmin = (user: any): boolean => {
    if (!user) {
        return false;
    }

    const metadata = getMetadata(user);
    return metadata?.role === 'admin';
};

/**
 * Checks if the user has permission to access a specific page.
 * Admins have access to all pages.
 * 
 * @param user The Clerk user object
 * @param pageId The ID of the page to check (e.g., 'dashboard', 'chat')
 * @param notebookId (Optional) The ID of the notebook context.
 * @returns true if access is allowed
 */
export const hasPagePermission = (user: any, pageId: string, notebookId?: string): boolean => {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const metadata = getMetadata(user);

    // 1. Check Granular Notebook Permissions if notebookId is provided
    if (notebookId && metadata?.notebook_permissions) {
        const notebookPerms = metadata.notebook_permissions[notebookId];
        // If permissions exist for this notebook, check if the page is in the list
        if (Array.isArray(notebookPerms)) {
            return notebookPerms.includes(pageId);
        }
        // If notebook exists in permissions but page not in list, deny access
        if (notebookPerms !== undefined) {
            return false;
        }
    }

    // 2. Legacy / Global Page Check
    // Used if:
    // - No notebookId provided (global page like 'dashboard')
    // - notebookId provided but not found in new structure (backward compat)
    const allowedPages = metadata?.allowed_pages || [];
    return Array.isArray(allowedPages) && allowedPages.includes(pageId);
};

/**
 * Checks if the user has permission to access a specific notebook.
 * Admins have access to all notebooks.
 * 
 * @param user The Clerk user object
 * @param notebookId The ID of the notebook
 * @returns true if access is allowed
 */
export const hasNotebookPermission = (user: any, notebookId: string): boolean => {
    if (!user) return false;
    if (isAdmin(user)) return true;

    const metadata = getMetadata(user);

    // 1. Check Granular Permissions
    if (metadata?.notebook_permissions) {
        // If the key exists (even if empty array), they have access to the notebook
        if (metadata.notebook_permissions[notebookId]) {
            return true;
        }
    }

    // 2. Fallback to Legacy Array
    const allowedNotebooks = metadata?.allowed_notebooks || [];
    return Array.isArray(allowedNotebooks) && allowedNotebooks.includes(notebookId);
};
