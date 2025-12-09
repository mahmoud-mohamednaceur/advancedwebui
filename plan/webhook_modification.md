# Webhook Modification Plan

## Goal
Update all POST webhook calls in the application to include the user's Clerk UID in the request body. This ensures that the backend (n8n) can identify the user making the request.

## User Review Required
> [!IMPORTANT]
> This change involves adding `user_id` to the JSON body of all POST requests. Ensure the backend (n8n workflows) is prepared to receive or ignore this extra field without error.

## Proposed Changes

We will use the `useAuth` hook from `@clerk/nextjs` to retrieve the current `userId`.

### 1. `components/DashboardPage.tsx`
- **Import:** `import { useAuth } from '@clerk/nextjs';`
- **Logic:** Get `userId` using `const { userId } = useAuth();`
- **Update:** Add `user_id: userId` to the body of:
    - `handleExecuteDelete` (DELETE_NOTEBOOK_WEBHOOK_URL)
    - `handleCreate` (CREATE_NOTEBOOK_WEBHOOK_URL)
    - `fetchNotebooks` (PULL_NOTEBOOKS_WEBHOOK_URL)
    - `fetchNotebooks` (NOTEBOOK_DETAILS_WEBHOOK_URL)

### 2. `components/workspace/NotebookDashboard.tsx`
- **Import:** `import { useAuth } from '@clerk/nextjs';`
- **Logic:** Get `userId` using `const { userId } = useAuth();`
- **Update:** Add `user_id: userId` to the body of:
    - `fetchStatus` (NOTEBOOK_DETAILS_WEBHOOK_URL)
    - `handleSave` (UPDATE_NOTEBOOK_WEBHOOK_URL)

### 3. `components/workspace/NotebookDocuments.tsx`
- **Import:** `import { useAuth } from '@clerk/nextjs';`
- **Logic:** Get `userId` using `const { userId } = useAuth();`
- **Update:** Add `user_id: userId` to the body of:
    - `ErrorDetailsModal` (ERROR_DETAILS_WEBHOOK_URL)
    - `IngestionDetailsModal` (INGESTION_SETTINGS_WEBHOOK_URL)
    - `IngestionDetailsModal` (WORKFLOW_STAGE_WEBHOOK_URL)
    - `IngestionDetailsModal` (CONTEXTUAL_RETRIEVAL_STATE_WEBHOOK_URL)
    - `handleDiscovery` (SHAREPOINT_DISCOVERY_WEBHOOK_URL)
    - `handleIngest` (INGESTION_WEBHOOK_URL)
    - `fetchFiles` (NOTEBOOK_STATUS_WEBHOOK_URL)
    - `handleDeleteFile` (DELETE_FILE_WEBHOOK_URL)

### 4. `components/DocumentsPage.tsx`
- **Import:** `import { useAuth } from '@clerk/nextjs';`
- **Logic:** Get `userId` using `const { userId } = useAuth();`
- **Update:** Add `user_id: userId` to the body of:
    - `fetchNotebooks` (PULL_NOTEBOOKS_WEBHOOK_URL)
    - `handleExecuteDelete` (DELETE_NOTEBOOK_WEBHOOK_URL)
    - `handleExecuteClear` (DELETE_ALL_NOTEBOOKS_WEBHOOK_URL)
    - `handleCreate` (CREATE_NOTEBOOK_WEBHOOK_URL)

## Verification Plan
### Manual Verification
1.  Start the application.
2.  Navigate to the Dashboard and verify notebooks load (PULL_NOTEBOOKS).
3.  Create a new notebook and verify success (CREATE_NOTEBOOK).
4.  Delete a notebook and verify success (DELETE_NOTEBOOK).
5.  Enter a notebook workspace and verify details load (NOTEBOOK_DETAILS).
6.  Upload/Ingest a file (if possible) or check file list (NOTEBOOK_STATUS).
7.  Check n8n execution logs (if accessible) or browser network tab to confirm `user_id` is present in the request payload.
