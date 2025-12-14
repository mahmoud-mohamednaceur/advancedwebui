// CLERK SESSION DEBUG SCRIPT
// Paste this in browser console to check current session state

console.log("=== CLERK SESSION DEBUG ===");

// Check if Clerk is loaded
if (window.Clerk) {
    console.log("✅ Clerk loaded");

    // Get current session
    const session = window.Clerk.session;
    const user = window.Clerk.user;

    console.log("\n=== CURRENT SESSION ===");
    console.log("Session ID:", session?.id);
    console.log("Session status:", session?.status);

    console.log("\n=== CURRENT USER ===");
    console.log("User ID:", user?.id);
    console.log("Email:", user?.primaryEmailAddress?.emailAddress);
    console.log("First Name:", user?.firstName);
    console.log("Last Name:", user?.lastName);

    console.log("\n=== USER METADATA ===");
    console.log("Public Metadata:", user?.publicMetadata);
    console.log("Role:", user?.publicMetadata?.role);

    console.log("\n=== ALL SESSIONS ===");
    const client = window.Clerk.client;
    console.log("Total sessions:", client?.sessions?.length);
    client?.sessions?.forEach((s, i) => {
        console.log(`Session ${i + 1}:`, {
            id: s.id,
            status: s.status,
            userId: s.userId,
            lastActiveAt: s.lastActiveAt
        });
    });

} else {
    console.error("❌ Clerk not loaded!");
}

console.log("\n=== STORAGE CHECK ===");
console.log("LocalStorage keys:", Object.keys(localStorage).filter(k => k.includes('clerk')));
console.log("SessionStorage keys:", Object.keys(sessionStorage).filter(k => k.includes('clerk')));

console.log("\n=== FIX INSTRUCTIONS ===");
console.log("If you see the wrong user:");
console.log("1. Run: await Clerk.signOut()");
console.log("2. Clear browser data (Ctrl+Shift+Del)");
console.log("3. Close ALL browser tabs");
console.log("4. Restart browser");
console.log("5. Sign in with new user");
