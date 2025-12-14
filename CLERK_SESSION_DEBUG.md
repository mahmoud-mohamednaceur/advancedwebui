# Clerk Session Issue - Debugging Guide

## Problem

When signing in with a new user, Clerk returns the same user ID from the previous session. This causes:
1. New user has wrong permissions (from old user)
2. Delete/clear operations use wrong user context

## Root Cause

This is a **Clerk session persistence issue**, not a permission code bug. The browser is caching the old Clerk session.

## Quick Fix Steps

### Step 1: Proper Sign Out

**Current user must sign out properly:**

1. Click on your profile/avatar in the app
2. Click "Sign Out" 
3. **OR** run in browser console:
   ```javascript
   await Clerk.signOut()
   ```

### Step 2: Clear Browser Data

1. Press `Ctrl + Shift + Del` (Windows) or `Cmd + Shift + Del` (Mac)
2. Select:
   - ✅ Cookies and site data
   - ✅ Cached images and files  
   - ✅ Hosted app data / Local storage
3. Time range: "All time" or "Last hour"
4. Click "Clear data"

### Step 3: Hard Reset

1. Close **ALL browser tabs** with your app
2. Close the browser completely
3. Reopen browser
4. Navigate to your app
5. Sign in with the new user

## Debug Session State

Run this in browser console to check current session:

```javascript
// Check current user
console.log("User ID:", window.Clerk?.user?.id)
console.log("Email:", window.Clerk?.user?.primaryEmailAddress?.emailAddress)
console.log("Role:", window.Clerk?.user?.publicMetadata?.role)

// Check all sessions
console.log("Total sessions:", window.Clerk?.client?.sessions?.length)
window.Clerk?.client?.sessions?.forEach((s, i) => {
    console.log(`Session ${i}:`, s.userId, s.status)
})
```

**Expected**: Only 1 session with status "active"
**Problem**: Multiple sessions or wrong userId

## Common Issues

### Issue 1: "Same User ID After Login"

**Symptoms**: New user shows old user's ID and permissions

**Cause**: Clerk session not cleared

**Fix**:
1. Sign out properly (use Clerk's signOut, not just navigating away)
2. Clear browser storage
3. Close all tabs

### Issue 2: "Can Delete Without Permission"

**Symptoms**: User without admin role can still delete notebooks

**Cause**: Logged in as wrong user (likely still admin from cached session)

**Fix**: Verify user ID in console matches expected user

### Issue 3: "Permissions Not Updating"

**Symptoms**: Changed permissions don't apply

**Cause**: User object cached in browser

**Fix**:
1. Sign out
2. Sign back in  
3. Permissions refresh on sign-in

## Development Tips

### Force Sign Out on Each Test

Add to your test workflow:

```typescript
// In Sidebar or Header component
const handleSignOut = async () => {
    await signOut();
    // Clear any local state
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to sign-in
    window.location.href = '/sign-in';
};
```

### Check Session in DevTools

**Clerk stores session in**:
- LocalStorage: Keys starting with `__clerk_`
- Cookies: `__session`, `__client_uat`

**To manually clear**:
```javascript
// Clear all Clerk data
Object.keys(localStorage)
    .filter(key => key.includes('clerk'))
    .forEach(key => localStorage.removeItem(key));

Object.keys(sessionStorage)
    .filter(key => key.includes('clerk'))
    .forEach(key => sessionStorage.removeItem(key));
```

## Verification Steps

After fixing:

1. **Sign out completely**
2. **Clear browser data**
3. **Close all tabs**
4. **Open new tab**
5. **Sign in as test user**
6. **In console, run**:
   ```javascript
   console.log(window.Clerk.user.id)
   console.log(window.Clerk.user.primaryEmailAddress.emailAddress)
   ```
7. **Verify** the ID and email match the new user (NOT the old one)

## Expected Behavior

✅ **Correct**: Each user has unique ID
✅ **Correct**: Signing out clears session completely
✅ **Correct**: New sign-in creates fresh session
✅ **Correct**: Permissions checked against current user ID

❌ **Wrong**: Same ID for different users
❌ **Wrong**: Old session persists after sign out
❌ **Wrong**: New user has old user's permissions
