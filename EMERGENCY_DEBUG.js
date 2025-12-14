// EMERGENCY DEBUG - Add to top of App.tsx right after useUser hook

const App: React.FC = () => {
    // ... existing code ...
    const { user } = useUser();

    // EMERGENCY DEBUG - Log on every render
    console.log("╔═══════════════════════════════════════");
    console.log("║ APP.TSX - CURRENT USER");
    console.log("╠═══════════════════════════════════════");
    console.log("║ User ID:", user?.id);
    console.log("║ Email:", user?.primaryEmailAddress?.emailAddress);
    console.log("║ First Name:", user?.firstName);
    console.log("║ Role:", user?.publicMetadata?.role);
    console.log("╚═══════════════════════════════════════");

    // ... rest of component
}


// ALSO Add to DocumentsPage.tsx right after useUser hook

const DocumentsPage: React.FC<DocumentsPageProps> = ({ onOpenNotebook, onRegisterEmbedding }) => {
    const { user } = useUser();

    // EMERGENCY DEBUG
    console.log("╔═══════════════════════════════════════");
    console.log("║ DOCUMENTSPAGE.TSX - CURRENT USER");
    console.log("╠═══════════════════════════════════════");
    console.log("║ User ID:", user?.id);
    console.log("║ Email:", user?.primaryEmailAddress?.emailAddress);
    console.log("║ First Name:", user?.firstName);
    console.log("║ Role:", user?.publicMetadata?.role);
    console.log("╚═══════════════════════════════════════");

    // ... rest of component
}

// INSTRUCTIONS:
// 1. Add these console.logs to both files
// 2. Refresh browser
// 3. Check console - you should see DIFFERENT User IDs for different users
// 4. If you see the SAME ID in incognito mode => Clerk is broken/misconfigured
