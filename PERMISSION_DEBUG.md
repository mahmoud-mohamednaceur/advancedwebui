# Permission System Debugging Guide

## Quick Debug Steps

### 1. Check Browser Console

Open F12 DevTools → Console tab and look for logs starting with `[DEBUG hasNotebookPermission]`

When you try to open a notebook, you should see:
```
[DEBUG hasNotebookPermission] Checking permissions for: { userId: "user_xxx", notebookId: "notebook-id-here" }
[DEBUG hasNotebookPermission] User metadata: { ... }
[DEBUG hasNotebookPermission] Pages for notebook: ["home", "chat", "documents"]
[DEBUG hasNotebookPermission] Access GRANTED via notebook_permissions
```

### 2. What to Look For

**❌ If you see empty array:**
```
[DEBUG hasNotebookPermission] Pages for notebook: []
[DEBUG hasNotebookPermission] Pages array empty or not array
[DEBUG hasNotebookPermission] Final decision: DENIED
```

**Solution**: In Access Control modal:
1. Toggle the notebook ON
2. Click the dropdown arrow to expand
3. **Select at least ONE page** (checkbox)
4. Click "Save Changes"
5. **Hard refresh browser** (Ctrl+Shift+R)

**❌ If you see undefined:**
```
[DEBUG hasNotebookPermission] Pages for notebook: undefined
```

**Solution**: The notebook ID might not match. Check:
- Notebook ID in the URL or console
- Notebook ID in Access Control modal matches

**❌ If metadata is empty:**
```
[DEBUG hasNotebookPermission] User metadata: {}
```

**Solution**: 
1. Permissions weren't saved properly
2. User needs to sign out and back in
3. Check Clerk dashboard directly

### 3. Force User Refresh

After changing permissions as admin:

1. **Test user MUST sign out and back in** - This refreshes the Clerk session
2. Hard refresh browser (Ctrl+Shift+R)
3. Check DevTools console for the debug logs

### 4. Verify in Clerk Dashboard

Go to Clerk Dashboard → Users → Select test user → Metadata tab

Should see:
```json
{
  "notebook_permissions": {
    "YOUR-NOTEBOOK-ID": ["home", "chat", "documents", "search", "settings"]
  },
  "allowed_pages": ["dashboard", "notebooks"],
  "role": "user"
}
```

### 5. Common Issues

| Issue | Solution |
|-------|----------|
| Access Denied after granting permission | Sign out/in as test user |
| Empty pages array | Select at least one page checkbox in modal |
| Changes don't apply | Hard refresh (Ctrl+Shift+R) |
| Still see old permissions | Clear browser cache and sign out/in |

### 6. Test Workflow

As **Admin**:
1. Settings → User Management
2. Click test user → Edit Permissions
3. Find notebook (search if needed)
4. Toggle notebook ON (should turn cyan)
5. Click dropdown arrow ▼
6. **Check at least ONE page** (e.g., "Chat Interface")
7. Click "Save Changes"
8. Sign out

As **Test User**:
1. Sign in
2. Go to Notebooks page
3. Open F12 DevTools → Console
4. Click on the notebook
5. Check the debug logs

If you see `Access GRANTED`, the notebook should open!
