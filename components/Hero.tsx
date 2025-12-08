import React from 'react';
import Button from './ui/Button';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-10 flex justify-center">
      <div className="w-full max-w-6xl relative rounded-2xl overflow-hidden min-h-[600px] flex flex-col items-center justify-center text-center p-6 md:p-12 group shadow-2xl shadow-black/50 border border-white/10">

        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-50"
          >
            <source src="/background.webm" type="video/webm" />
          </video>
          {/* Gradient Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90 backdrop-blur-[1px]"></div>
          <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
        </div>

        <div className="max-w-4xl flex flex-col items-center gap-8 z-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-sm font-medium text-text-light">v2.0 is now live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight drop-shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Automate & Elevate <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary">Your RAG Flow.</span>
          </h1>

          <p className="text-lg md:text-2xl text-text-subtle max-w-2xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Streamline data pipelines, ensure precision, and scale with robust infrastructure. The modern visual builder for AI.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <a href="/sign-up">
              <Button variant="primary" className="min-w-[180px] !h-14 !text-lg shadow-neon-primary hover:shadow-[0_0_30px_rgba(126,249,255,0.4)] transition-all duration-300">
                Start Building Free
              </Button>
            </a>
            <a href="#workflow">
              <Button variant="secondary" className="min-w-[180px] !h-14 !text-lg bg-surface/50 backdrop-blur-md border-white/10 hover:bg-white/10">
                View Demo
              </Button>
            </a>
          </div>
        </div>

        {/* Subtle animated glow in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      </div>
    </section>
  );
};

export default Hero;