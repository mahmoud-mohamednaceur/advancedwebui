# Multi-Conversation Chat - n8n Webhook Specification

This document outlines the webhook endpoints needed to support multiple chat conversations per notebook.

## Database Schema

Ensure you have the updated schema with the `chat_conversations` table:

```sql
CREATE TABLE chat_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

And the updated `chat_history` table with `conversation_id`:

```sql
ALTER TABLE chat_history ADD COLUMN conversation_id UUID REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE;
```

---

## Webhook Endpoints

### 1. List Conversations
**URL:** `https://n8nserver.sportnavi.de/webhook/conversations-list`

**Method:** POST

**Request Body:**
```json
{
    "notebook_id": "uuid",
    "user_id": "string",
    "include_archived": false
}
```

**Response:**
```json
[
    {
        "conversation_id": "uuid",
        "title": "Chat about sales data",
        "is_pinned": true,
        "is_archived": false,
        "message_count": 15,
        "last_message_at": "2025-12-28T12:00:00Z",
        "created_at": "2025-12-28T10:00:00Z"
    }
]
```

**SQL Query:**
```sql
SELECT 
    conversation_id,
    title,
    is_pinned,
    is_archived,
    message_count,
    last_message_at,
    created_at
FROM chat_conversations
WHERE notebook_id = $notebook_id 
  AND user_id = $user_id
  AND ($include_archived OR is_archived = FALSE)
ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST, created_at DESC;
```

---

### 2. Create Conversation
**URL:** `https://n8nserver.sportnavi.de/webhook/conversations-create`

**Method:** POST

**Request Body:**
```json
{
    "notebook_id": "uuid",
    "user_id": "string",
    "title": "New Chat"
}
```

**Response:**
```json
{
    "conversation_id": "uuid",
    "notebook_id": "uuid",
    "user_id": "string",
    "title": "New Chat",
    "is_pinned": false,
    "is_archived": false,
    "message_count": 0,
    "last_message_at": null,
    "created_at": "2025-12-28T13:00:00Z"
}
```

**SQL Query:**
```sql
INSERT INTO chat_conversations (notebook_id, user_id, title)
VALUES ($notebook_id, $user_id, $title)
RETURNING *;
```

---

### 3. Delete Conversation
**URL:** `https://n8nserver.sportnavi.de/webhook/conversations-delete`

**Method:** POST

**Request Body:**
```json
{
    "conversation_id": "uuid",
    "user_id": "string"
}
```

**Response:**
```json
{
    "success": true,
    "conversation_id": "uuid",
    "messages_deleted": 15
}
```

**SQL Query:**
```sql
-- Messages will be deleted via CASCADE
DELETE FROM chat_conversations 
WHERE conversation_id = $conversation_id 
  AND user_id = $user_id
RETURNING conversation_id;
```

---

### 4. Rename Conversation
**URL:** `https://n8nserver.sportnavi.de/webhook/conversations-rename`

**Method:** POST

**Request Body:**
```json
{
    "conversation_id": "uuid",
    "user_id": "string",
    "new_title": "Discussion about Q4 Reports"
}
```

**Response:**
```json
{
    "success": true,
    "conversation_id": "uuid",
    "title": "Discussion about Q4 Reports"
}
```

**SQL Query:**
```sql
UPDATE chat_conversations
SET title = $new_title, updated_at = NOW()
WHERE conversation_id = $conversation_id 
  AND user_id = $user_id
RETURNING conversation_id, title;
```

---

### 5. Toggle Pin Status
**URL:** `https://n8nserver.sportnavi.de/webhook/conversations-toggle-pin`

**Method:** POST

**Request Body:**
```json
{
    "conversation_id": "uuid",
    "user_id": "string"
}
```

**Response:**
```json
{
    "conversation_id": "uuid",
    "is_pinned": true
}
```

**SQL Query:**
```sql
UPDATE chat_conversations
SET is_pinned = NOT is_pinned, updated_at = NOW()
WHERE conversation_id = $conversation_id 
  AND user_id = $user_id
RETURNING conversation_id, is_pinned;
```

---

## Updated Existing Webhooks

### Pull Chat History (UPDATED)
**URL:** `https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-pull-notebook-chat`

**Request Body (Updated):**
```json
{
    "notebook_id": "uuid",
    "user_id": "string",
    "conversation_id": "uuid"  // NEW FIELD
}
```

**SQL Query (Updated):**
```sql
SELECT *
FROM chat_history
WHERE notebook_id = $notebook_id 
  AND user_id = $user_id
  AND conversation_id = $conversation_id
ORDER BY created_at ASC;
```

---

### Save Chat Message (UPDATED)
**URL:** `https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-save-notebook-chat`

**Request Body (Updated):**
```json
{
    "id": "uuid",
    "notebook_id": "uuid",
    "conversation_id": "uuid",  // NEW FIELD
    "role": "user|assistant",
    "content": "string",
    "citations": [],
    "run_metadata": {},
    "created_at": "ISO timestamp",
    "user_id": "string"
}
```

**SQL Query (Updated):**
```sql
INSERT INTO chat_history (id, conversation_id, notebook_id, user_id, role, content, citations, run_metadata, created_at)
VALUES ($id, $conversation_id, $notebook_id, $user_id, $role, $content, $citations, $run_metadata, $created_at);

-- Also update conversation stats
UPDATE chat_conversations
SET 
    message_count = message_count + 1,
    last_message_at = $created_at,
    updated_at = NOW(),
    title = CASE 
        WHEN title = 'New Chat' AND $role = 'user' 
        THEN LEFT($content, 50) || CASE WHEN LENGTH($content) > 50 THEN '...' ELSE '' END
        ELSE title
    END
WHERE conversation_id = $conversation_id;
```

---

### Clear Chat History (UPDATED)
**URL:** `https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-clear-notebook-chat`

**Request Body (Updated):**
```json
{
    "notebook_id": "uuid",
    "conversation_id": "uuid",  // NEW FIELD
    "user_id": "string",
    "timestamp": "ISO timestamp"
}
```

**SQL Query (Updated):**
```sql
DELETE FROM chat_history
WHERE conversation_id = $conversation_id 
  AND user_id = $user_id;

-- Reset conversation message count
UPDATE chat_conversations
SET message_count = 0, updated_at = NOW()
WHERE conversation_id = $conversation_id;
```

---

## Summary

| Webhook | Action | Status |
|---------|--------|--------|
| `conversations-list` | Get all conversations for a user in a notebook | **NEW** |
| `conversations-create` | Create a new conversation | **NEW** |
| `conversations-delete` | Delete a conversation and all messages | **NEW** |
| `conversations-rename` | Rename a conversation | **NEW** |
| `conversations-toggle-pin` | Toggle pin status | **NEW** |
| `pull-notebook-chat` | Fetch messages | **UPDATED** - Added `conversation_id` |
| `save-notebook-chat` | Save a message | **UPDATED** - Added `conversation_id` |
| `clear-notebook-chat` | Clear messages | **UPDATED** - Added `conversation_id` |
