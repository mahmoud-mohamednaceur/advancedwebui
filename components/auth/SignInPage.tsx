import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { clerkAppearance } from '../../utils/clerkTheme';
import { Network } from 'lucide-react';

const SignInPage: React.FC = () => {
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Imported from utils/clerkTheme.ts

    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden">
            {/* Ambient Background Mesh */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-4">
                {/* Logo */}
                <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.href = '/'}>
                    <Network className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(126,249,255,0.8)]" />
                    <span className="text-2xl font-bold text-white tracking-tight">RAG Flow</span>
                </div>

                {/* Clerk Component */}
                <SignIn
                    appearance={clerkAppearance}
                    signUpUrl="/sign-up"
                    afterSignInUrl="/"
                    afterSignUpUrl="/"
                />
            </div>
        </div>
    );
};

export default SignInPage;
