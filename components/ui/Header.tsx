import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { clerkAppearance } from '../../utils/clerkTheme';

const Header: React.FC = () => {
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Imported from utils/clerkTheme.ts

    return (
        <header className="fixed top-0 right-0 z-50 p-6">
            <div className="flex items-center gap-4">
                <SignedOut>
                    <a href="/sign-in">
                        <button className="group relative px-8 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-background font-semibold rounded-xl transition-all duration-300 shadow-neon-primary hover:shadow-neon-primary hover:scale-105 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                                <span>Sign In</span>
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000">
                                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                            </div>
                        </button>
                    </a>
                </SignedOut>
                <SignedIn>
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-surface/80 backdrop-blur-md border border-white/10 rounded-full shadow-glass hover:border-primary/30 transition-all duration-300 group">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={clerkAppearance}
                        />
                        <div className="h-5 w-px bg-white/10 group-hover:bg-primary/30 transition-colors" />
                        <span className="text-text-subtle text-sm font-medium group-hover:text-text-light transition-colors">
                            Account
                        </span>
                    </div>
                </SignedIn>
            </div>
        </header>
    );
};

export default Header;
