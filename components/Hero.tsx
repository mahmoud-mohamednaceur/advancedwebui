import React from 'react';
import Button from './ui/Button';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-10 flex justify-center">
      <div className="w-full max-w-6xl relative rounded-2xl overflow-hidden min-h-[500px] flex flex-col items-center justify-center text-center p-6 md:p-12 bg-cover bg-center group"
           style={{ 
             backgroundImage: `linear-gradient(rgba(10, 10, 16, 0.85) 0%, rgba(10, 10, 16, 0.95) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBVW8Lz3DiogYUYpkF5vkw-wbgO7XHStgEOjqJmBQ68C_ezn4hRNeIPtXvOxVnW6zO7fPd9qxqTl_qjuyjRmUSsmv0SCmGiA30FhkA0rSywVh9vd0Igz_4hSs2zj_5w_KzBpzNrVy7BvQsoRWWakzyCbNu0hc7-3RWKSTzThHyTIke_HfVk8N5XKBLhXM3xi1SciMSIQDEqPEonIHJMGlburNd2t6HJYvPkWLbeBmMj0ucT7dtyonEBaFpaohbw0bMux89GKTn02Zc")`
           }}>
        
        <div className="max-w-3xl flex flex-col items-center gap-6 z-10">
          <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight drop-shadow-xl">
            Automate & Elevate <br className="hidden md:block" /> Your RAG.
          </h1>
          
          <p className="text-lg md:text-xl text-text-subtle max-w-2xl leading-relaxed">
            Streamline data pipelines, ensure precision, and scale with robust infrastructure. The modern visual builder for AI.
          </p>
          
          <div className="mt-4">
            <Button variant="primary" className="min-w-[160px]" onClick={onStart}>
              Explore Solutions
            </Button>
          </div>
        </div>

        {/* Subtle animated glow in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      </div>
    </section>
  );
};

export default Hero;