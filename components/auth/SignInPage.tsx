import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { clerkAppearance } from '../../utils/clerkTheme';
import { Network } from 'lucide-react';

const SignInPage: React.FC = () => {
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Modern Clerk theme matching the app's neon cyberpunk aesthetic
    // Imported from utils/clerkTheme.ts

    return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden bg-grid-pattern">
            {/* Video Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute top-0 left-0 w-full h-full object-cover opacity-40"
                >
                    <source src="/background.webm" type="video/webm" />
                </video>
                {/* Overlay to ensure text readability and blend with theme */}
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-4">
                {/* Logo */}
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform duration-300 group" onClick={() => window.location.href = '/'}>
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-all duration-300"></div>
                        <Network className="w-12 h-12 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(126,249,255,0.8)]" />
                    </div>
                    <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary tracking-tight font-display">RAG Flow</span>
                </div>

                {/* Clerk Component */}
                <div className="w-full transform transition-all duration-500 hover:scale-[1.01]">
                    <SignIn
                        appearance={clerkAppearance}
                        signUpUrl="/sign-up"
                        afterSignInUrl="/dashboard"
                        afterSignUpUrl="/dashboard"
                    />
                </div>
            </div>
        </div>
    );
};

export default SignInPage;
