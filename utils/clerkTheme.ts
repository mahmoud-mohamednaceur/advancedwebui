export const clerkAppearance = {
    baseTheme: undefined,
    variables: {
        colorPrimary: '#7EF9FF',
        colorBackground: '#0F0F13',
        colorInputBackground: '#1A1A21',
        colorInputText: '#F0F0F0',
        colorText: '#F0F0F0',
        colorTextSecondary: '#9494A8',
        colorDanger: '#E03B8A',
        fontFamily: 'Inter, sans-serif',
        borderRadius: '12px',
    },
    elements: {
        // Main card styling
        card: 'bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50',
        headerTitle: 'text-text-light font-display text-2xl font-semibold',
        headerSubtitle: 'text-text-subtle',

        // Form elements
        formButtonPrimary:
            'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-background font-semibold shadow-neon-primary hover:shadow-neon-primary hover:scale-[1.02] transition-all duration-300',
        formFieldInput:
            'bg-surface-highlight border-white/10 text-text-light placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
        formFieldLabel: 'text-text-light font-medium',

        // Divider
        dividerLine: 'bg-white/10',
        dividerText: 'text-text-subtle',

        // Social buttons
        socialButtonsBlockButton:
            'border-white/10 bg-surface-highlight hover:bg-white/5 text-text-light transition-all hover:border-primary/50',
        socialButtonsBlockButtonText: 'text-text-light font-medium',

        // Footer
        footerActionText: 'text-text-subtle',
        footerActionLink: 'text-primary hover:text-primary/80 font-medium transition-colors',

        // Identity preview
        identityPreview: 'border-white/10 bg-surface-highlight',
        identityPreviewText: 'text-text-light',
        identityPreviewEditButton: 'text-primary hover:text-primary/80',

        // Alert
        alert: 'border-secondary/20 bg-secondary/10 text-text-light',
        alertText: 'text-text-light',

        // Avatar  
        avatarBox: 'ring-2 ring-primary/20',

        // Form field
        formFieldSuccessText: 'text-primary',
        formFieldErrorText: 'text-secondary',

        // Navbar
        navbar: 'bg-surface/80 backdrop-blur-md border-b border-white/10',
        navbarButton: 'text-text-subtle hover:text-text-light transition-colors',

        // User button popover
        userButtonPopoverCard: 'bg-surface/95 backdrop-blur-xl border border-white/10 shadow-2xl',
        userButtonPopoverActions: 'text-text-light',
        userButtonPopoverActionButton: 'hover:bg-white/5 text-text-light transition-colors',
        userButtonPopoverActionButtonText: 'text-text-light',
        userButtonPopoverActionButtonIcon: 'text-primary',
        userButtonPopoverFooter: 'hidden',

        // Badge
        badge: 'bg-primary text-background',
    },
};
