import React, { useEffect, useState } from 'react';
import { FolderOpen, Database, MessageSquare, Search, Cpu, CheckCircle2, Binary, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

const nodes = [
  { icon: FolderOpen, title: "Data Ingestion", subtitle: "Connect to diverse sources.", color: "primary" },
  { icon: Binary, title: "Processing", subtitle: "Clean, chunk, and embed data.", color: "secondary" },
  { icon: Database, title: "Vector Database", subtitle: "Secure, efficient storage.", color: "tertiary" },
  { icon: MessageSquare, title: "User Query", subtitle: "Natural language input.", color: "primary" },
  { icon: Search, title: "Retrieval", subtitle: "Find relevant information.", color: "secondary" },
  { icon: Cpu, title: "LLM Generation", subtitle: "Synthesize informed responses.", color: "tertiary" },
  { icon: CheckCircle2, title: "Augmented Answer", subtitle: "Accurate, context-rich output.", color: "primary" }
];

const Node = ({ icon: Icon, title, subtitle, color }: { icon: any, title: string, subtitle: string, color: string }) => {
  const colorClass = color === 'primary' ? 'text-primary'
    : color === 'secondary' ? 'text-secondary'
      : 'text-tertiary';

  return (
    <div className="flex-shrink-0 w-64 flex flex-col items-center justify-center p-6 mx-4 transition-transform hover:scale-105 group relative">
      {/* Icon - Floating Effect */}
      <div className={`mb-4 p-4 rounded-full bg-background/50 border border-white/10 backdrop-blur-md ${colorClass} shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all duration-500`}>
        <Icon className="w-8 h-8" strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-bold text-white mb-1 tracking-tight text-center">{title}</h3>
      <p className="text-xs text-text-subtle text-center leading-relaxed">{subtitle}</p>

      {/* Reflection/Ground Shadow */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/50 blur-lg rounded-[100%] group-hover:w-24 group-hover:bg-primary/20 transition-all duration-500"></div>
    </div>
  );
};

const Workflow: React.FC = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden perspective-container">
      <style>{`
                .perspective-container {
                    perspective: 1000px;
                }
                .floor-plane {
                    transform: rotateX(20deg) scale(0.9);
                    transform-style: preserve-3d;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                    width: max-content;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>

      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10 pointer-events-none"></div>

      {/* 3D Floor Effect */}
      <div className="floor-plane relative z-0 py-10">
        {/* Double the nodes for seamless loop */}
        <div className="flex animate-marquee">
          {[...nodes, ...nodes, ...nodes].map((node, i) => (
            <div key={i} className="px-4">
              <Node
                icon={node.icon}
                title={node.title}
                subtitle={node.subtitle}
                color={node.color}
              />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default Workflow;