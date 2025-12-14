import React, { useEffect, useRef } from 'react';
import { FolderInput, Binary, Database, MessageSquare, Search } from 'lucide-react';

interface PipelineStep {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
    glowColor: string;
}

const PipelineAnimation: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const steps: PipelineStep[] = [
        {
            icon: <FolderInput size={28} />,
            title: 'Data Ingestion',
            description: 'Connect to diverse sources.',
            color: '#7EF9FF',
            glowColor: 'rgba(126, 249, 255, 0.6)'
        },
        {
            icon: <Binary size={28} />,
            title: 'Processing',
            description: 'Clean, chunk, and embed data.',
            color: '#A8FF78',
            glowColor: 'rgba(168, 255, 120, 0.6)'
        },
        {
            icon: <Database size={28} />,
            title: 'Vector Database',
            description: 'Secure, efficient storage.',
            color: '#FFD93D',
            glowColor: 'rgba(255, 217, 61, 0.6)'
        },
        {
            icon: <MessageSquare size={28} />,
            title: 'User Query',
            description: 'Natural language input.',
            color: '#6BCB77',
            glowColor: 'rgba(107, 203, 119, 0.6)'
        },
        {
            icon: <Search size={28} />,
            title: 'Retrieval',
            description: 'Find relevant information.',
            color: '#FF6B9D',
            glowColor: 'rgba(255, 107, 157, 0.6)'
        }
    ];

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-0"></div>

            {/* Animated flowing particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-primary/40 animate-flow-particle"
                        style={{
                            left: `${-10 + (i * 5)}%`,
                            top: `${40 + Math.sin(i) * 20}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${6 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16 animate-fade-in-up">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        How It{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                            Works
                        </span>
                    </h2>
                    <p className="text-text-subtle max-w-2xl mx-auto">
                        A seamless pipeline from data ingestion to intelligent retrieval
                    </p>
                </div>

                {/* Pipeline Container */}
                <div
                    ref={containerRef}
                    className="relative flex items-center justify-center"
                    style={{ perspective: '1200px' }}
                >
                    {/* Main Pipeline Track */}
                    <div className="relative flex items-center gap-0 w-full max-w-6xl">

                        {/* Animated Connection Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 z-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <div className="absolute inset-0 animate-flow-line bg-gradient-to-r from-transparent via-primary/60 to-transparent"></div>
                        </div>

                        {/* Pipeline Steps */}
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="flex-1 flex flex-col items-center relative z-10 group"
                                style={{
                                    animation: `floatCard 4s ease-in-out infinite`,
                                    animationDelay: `${index * 0.2}s`
                                }}
                            >
                                {/* Card */}
                                <div
                                    className="relative w-full max-w-[180px] p-6 rounded-2xl bg-surface/80 border border-white/10 
                             backdrop-blur-xl transition-all duration-500 ease-out
                             hover:scale-105 hover:border-white/30
                             transform-gpu"
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        boxShadow: `0 20px 40px -20px rgba(0,0,0,0.5), 0 0 30px -10px ${step.glowColor}`,
                                        animation: `slideInFrom3D 1s ease-out backwards, floatCard 4s ease-in-out infinite`,
                                        animationDelay: `${index * 0.15}s, ${index * 0.2}s`
                                    }}
                                >
                                    {/* Glow Ring */}
                                    <div
                                        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                        style={{
                                            boxShadow: `0 0 40px 5px ${step.glowColor}`,
                                        }}
                                    />

                                    {/* Icon Container */}
                                    <div
                                        className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center 
                               border border-white/20 transition-all duration-300
                               group-hover:scale-110"
                                        style={{
                                            color: step.color,
                                            background: `linear-gradient(135deg, ${step.color}15, ${step.color}05)`,
                                            boxShadow: `0 0 30px ${step.glowColor}`
                                        }}
                                    >
                                        {step.icon}
                                    </div>

                                    {/* Text */}
                                    <h3
                                        className="text-sm font-semibold text-white text-center mb-1"
                                        style={{ textShadow: `0 0 20px ${step.glowColor}` }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p className="text-xs text-text-subtle text-center leading-relaxed">
                                        {step.description}
                                    </p>

                                    {/* 3D Shine Effect */}
                                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                                        <div
                                            className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 
                                 bg-gradient-to-br from-white/10 via-transparent to-transparent
                                 transition-opacity duration-300"
                                        />
                                    </div>
                                </div>

                                {/* Connection Dot */}
                                {index < steps.length - 1 && (
                                    <div
                                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full z-20"
                                        style={{
                                            background: `linear-gradient(135deg, ${step.color}, ${steps[index + 1].color})`,
                                            boxShadow: `0 0 15px ${step.glowColor}`,
                                            animation: 'pulse-glow 2s ease-in-out infinite',
                                            animationDelay: `${index * 0.3}s`
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Animated data flow arrows */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-[2px] w-20 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-data-flow"
                            style={{
                                top: '50%',
                                left: '-5%',
                                animationDelay: `${i * 1.2}s`,
                                animationDuration: '4s'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Custom Styles */}
            <style>{`
        @keyframes slideInFrom3D {
          0% {
            opacity: 0;
            transform: translateX(-100px) translateZ(-200px) rotateY(-30deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateZ(0) rotateY(0deg);
          }
        }

        @keyframes floatCard {
          0%, 100% {
            transform: translateY(0px) rotateX(0deg);
          }
          50% {
            transform: translateY(-8px) rotateX(2deg);
          }
        }

        @keyframes flow-line {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            transform: translate(50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(50%, -50%) scale(1.3);
            opacity: 0.7;
          }
        }

        @keyframes data-flow {
          0% {
            left: -10%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 110%;
            opacity: 0;
          }
        }

        @keyframes flow-particle {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(120vw) translateY(20px);
            opacity: 0;
          }
        }

        .animate-flow-line {
          animation: flow-line 3s linear infinite;
        }

        .animate-data-flow {
          animation: data-flow 4s ease-in-out infinite;
        }

        .animate-flow-particle {
          animation: flow-particle 6s linear infinite;
        }
      `}</style>
        </section>
    );
};

export default PipelineAnimation;
