# CRITICAL: Clerk Session Stuck - Force Clear Steps

## THE PROBLEM

You're seeing the SAME permissions/notebooks for EVERY user because Clerk's session is cached in the browser. Even after "signing out" and "signing in" as a new user, you're still using the OLD user's session.

## NUCLEAR OPTION - DO THIS NOW:

### Step 1: Force Sign Out via Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:

```javascript
// Force sign out
if (window.Clerk) {
    await window.Clerk.signOut({ sessionId: window.Clerk.session?.id });
    console.log("✅ Signed out");
} else {
    console.log("❌ Clerk not loaded");
}
```

### Step 2: Clear ALL Clerk Data

Still in Console, run:

```javascript
// Clear all Clerk storage
console.log("Clearing Clerk data...");

// Clear localStorage
Object.keys(localStorage)
    .filter(key => key.includes('clerk') || key.includes('__'))
    .forEach(key => {
        console.log("Removing:", key);
        localStorage.removeItem(key);
    });

// Clear sessionStorage
Object.keys(sessionStorage)
    .filter(key => key.includes('clerk') || key.includes('__'))
    .forEach(key => {
        console.log("Removing:", key);
        sessionStorage.removeItem(key);
    });

console.log("✅ Clerk data cleared");
```

### Step 3: Clear Cookies

In DevTools:
1. Go to **Application** tab (or **Storage** in Firefox)
2. Expand **Cookies** in left sidebar
3. Click on your localhost URL
4. Find and DELETE these cookies:
   - `__session`
   - `__client_uat`
   - Any cookie starting with `__clerk_`

### Step 4: Hard Browser Reset

1. Close **ALL tabs** with your app
2. Close the **entire browser** (not just the window)
3. **Reopen browser** (fresh start)
4. Navigate to `http://localhost:5173` (or your app URL)

### Step 5: Verify Clean State

Before signing in, check Console:

```javascript
// Should be empty or undefined
console.log("User:", window.Clerk?.user);
console.log("Session:", window.Clerk?.session);
console.log("Is signed in:", window.Clerk?.user !== null);
```

**Expected**: All should be `null` or `undefined`

### Step 6: Sign In as NEW User

1. Click "Sign In"
2. Use the NEW user credentials (NOT the admin)
3. After sign-in, verify in Console:

```javascript
console.log("═══ CURRENT USER ═══");
console.log("User ID:", window.Clerk.user.id);
console.log("Email:", window.Clerk.user.primaryEmailAddress.emailAddress);
console.log("Role:", window.Clerk.user.publicMetadata.role);
console.log("Notebook Permissions:", window.Clerk.user.publicMetadata.notebook_permissions);
```

**Expected**: Should show the NEW user's data, NOT the old admin data

## If STILL Showing Same User:

### Option A: Use Incognito/Private Window

1. Open a new **Incognito/Private** window
2. Navigate to your app
3. Sign in with NEW user
4. This ensures zero cached data

### Option B: Different Browser

1. Use a completely different browser (Chrome → Firefox, or vice versa)
2. Navigate to your app
3. Sign in with NEW user

### Option C: Check Clerk Dashboard

1. Go to Clerk Dashboard → Users
2. Verify the user you're trying to sign in with EXISTS
3. Check their metadata directly in Clerk
4. Compare with what your app shows

## Why Is This Happening?

Clerk uses **multiple storage mechanisms**:
- LocalStorage for client state
- SessionStorage for temporary data  
- Cookies for session tokens
- In-memory cache in the browser tab

Simply "signing out" doesn't always clear ALL of these. The session token in cookies can persist, making Clerk think you're still logged in as the old user.

## Prevention

Add this to your sign-out flow to ensure clean logout:

```typescript
const handleSignOut = async () => {
    // Clear Clerk session
    await signOut();
    
    // Clear local storage
    localStorage.clear();
    
    // Force reload to clear in-memory cache
    window.location.href = '/sign-in';
};
```
