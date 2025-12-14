// Debug script to check user permissions
// Run this in browser console on the notebooks page

console.log("=== USER DEBUG INFO ===");

// Get the current user from Clerk
const user = window.__clerk_user || {};
console.log("User ID:", user?.id);
console.log("User Email:", user?.primaryEmailAddress?.emailAddress);

// Check publicMetadata
const metadata = user?.publicMetadata || user?.public_metadata || {};
console.log("\n=== PUBLIC METADATA ===");
console.log("Full metadata:", JSON.stringify(metadata, null, 2));

console.log("\n=== PERMISSION CHECKS ===");
console.log("Role:", metadata?.role);
console.log("Allowed Pages:", metadata?.allowed_pages);
console.log("Allowed Notebooks (legacy):", metadata?.allowed_notebooks);
console.log("Notebook Permissions:", metadata?.notebook_permissions);

// Check specific notebook
const testNotebookId = "test"; // Replace with actual notebook ID
if (metadata?.notebook_permissions) {
    console.log("\n=== SPECIFIC NOTEBOOK CHECK ===");
    console.log("Notebook ID:", testNotebookId);
    console.log("Pages for this notebook:", metadata.notebook_permissions[testNotebookId]);
    console.log("Has pages?", Array.isArray(metadata.notebook_permissions[testNotebookId]) && metadata.notebook_permissions[testNotebookId].length > 0);
}

console.log("\n=== NOTES ===");
console.log("✅ To grant access: notebook_permissions should have notebook ID as key with array of pages");
console.log("✅ Example: { 'notebook-id': ['home', 'chat', 'documents'] }");
console.log("❌ Empty array will NOT work: { 'notebook-id': [] }");
