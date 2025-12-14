import { logger } from './logger';

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
    logger.debug('Checking notebook permissions', {
        userId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress,
        notebookId
    });

    if (!user) {
        logger.debug('No user, denying notebook access');
        return false;
    }

    if (isAdmin(user)) {
        logger.debug('User is admin, granting notebook access');
        return true;
    }

    const metadata = getMetadata(user);
    logger.debug('User metadata for notebook permission', { metadata });

    // 1. Check Granular Permissions
    if (metadata?.notebook_permissions) {
        // Only grant access if they have at least one page permission
        const pages = metadata.notebook_permissions[notebookId];
        logger.debug('Pages for notebook', { notebookId, pages });

        if (Array.isArray(pages) && pages.length > 0) {
            logger.debug('Access GRANTED via notebook_permissions');
            return true;
        } else {
            logger.debug('Pages array empty or not array');
        }
    }

    // 2. Fallback to Legacy Array
    const allowedNotebooks = metadata?.allowed_notebooks || [];
    logger.debug('Checking legacy allowed_notebooks', { allowedNotebooks });

    const hasLegacyAccess = Array.isArray(allowedNotebooks) && allowedNotebooks.includes(notebookId);
    logger.debug('Notebook permission decision', { decision: hasLegacyAccess ? 'GRANTED' : 'DENIED' });

    return hasLegacyAccess;
};

/**
 * Checks if the user was created by an admin.
 * Users created by admins should have restricted permissions for certain destructive operations.
 * 
 * @param user The Clerk user object
 * @returns true if the user was created by an admin, false otherwise
 */
export const isCreatedByAdmin = (user: any): boolean => {
    if (!user) {
        return false;
    }

    const metadata = getMetadata(user);
    // If user doesn't have 'admin' role, they were created by an admin and should be restricted
    return metadata?.role !== 'admin';
};
