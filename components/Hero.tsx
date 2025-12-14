import React, { useRef, useEffect } from 'react';
import Button from './ui/Button';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75;
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    // Rotate based on mouse position
    containerRef.current.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale3d(1, 1, 1)`;
  };

  const handleMouseLeave = () => {
    if (containerRef.current) {
      containerRef.current.style.transform = 'perspective(1000px) rotateY(-15deg) rotateX(5deg) scale3d(1, 1, 1)';
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden py-20 lg:py-0">

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background/90 z-10"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-20 z-0"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 hover:bg-white/10 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-sm font-medium text-text-light tracking-wide">v2.0 is now live</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Automate & Elevate <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-secondary filter drop-shadow-[0_0_20px_rgba(126,249,255,0.3)]">
                Your RAG Flow.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-text-subtle mb-10 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
              Streamline data pipelines, ensure precision, and scale with robust infrastructure. The modern visual builder for AI that feels like magic.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="primary"
                className="min-w-[180px] h-14 text-lg shadow-[0_0_20px_rgba(126,249,255,0.4)] hover:shadow-[0_0_40px_rgba(126,249,255,0.6)] transition-all duration-300"
                onClick={onStart}
              >
                Start Building Free
              </Button>
            </div>
          </div>

          {/* Right 3D Video Content */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none perspective-container" style={{ perspective: '1200px' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
            <div
              ref={containerRef}
              className="relative w-full aspect-video rounded-2xl transition-transform duration-200 ease-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: 'rotateY(-15deg) rotateX(5deg)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Glass Frame */}
              <div className="absolute inset-[-2px] rounded-2xl bg-gradient-to-r from-white/20 to-white/5 opacity-50 z-20 pointer-events-none border border-white/10 backface-hidden"></div>

              {/* Video */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black z-10 border border-white/10 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                >
                  <source src="/webmi-rag.webm" type="video/webm" />
                </video>

                {/* Reflection Gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent pointer-events-none"></div>
              </div>

              {/* Decorative Elements around floating screen */}
              <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s', transform: 'translateZ(-50px)' }}></div>
              <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s', transform: 'translateZ(-100px)' }}></div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;