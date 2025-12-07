import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const Header: React.FC = () => {
    return (
        <header className="fixed top-0 right-0 z-50 p-6">
            <div className="flex items-center gap-4">
                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="px-6 py-2.5 bg-primary/90 hover:bg-primary text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-primary/50 hover:scale-105">
                            Sign In
                        </button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <div className="flex items-center gap-3 px-4 py-2 bg-surface/80 backdrop-blur-md border border-white/10 rounded-full shadow-lg">
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-9 h-9",
                                    userButtonPopoverCard: "bg-surface border border-white/10 shadow-2xl",
                                    userButtonPopoverActions: "text-text-light",
                                    userButtonPopoverActionButton: "hover:bg-white/5 text-text-light",
                                    userButtonPopoverActionButtonText: "text-text-light",
                                    userButtonPopoverFooter: "hidden"
                                }
                            }}
                        />
                    </div>
                </SignedIn>
            </div>
        </header>
    );
};

export default Header;
