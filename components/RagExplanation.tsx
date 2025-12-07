import React from 'react';
import { Server, Workflow, Zap, Database, ArrowRight, Cpu, Globe, ShieldCheck } from 'lucide-react';
import Button from './ui/Button';

interface RagExplanationProps {
  onStart?: () => void;
}

const RagExplanation: React.FC<RagExplanationProps> = ({ onStart }) => {
  return (
    <section id="solutions" className="py-24 px-4 bg-background relative overflow-hidden border-t border-white/5">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center gap-16">
        
        {/* Header */}
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Architecture Built for Scale
          </h2>
          <p className="text-text-subtle text-lg">
            High-performance orchestration meets sovereign infrastructure.
          </p>
        </div>

        {/* Custom Architecture Visualization */}
        <div className="w-full max-w-4xl relative">
            {/* Glow Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="relative bg-surface/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl overflow-hidden">
                
                {/* The Diagram Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
                    
                    {/* Left: Application Logic (n8n) */}
                    <div className="flex flex-col gap-4">
                         <div className="bg-[#0F0F13] border border-white/10 rounded-xl p-6 shadow-lg relative group overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-[#FF6D5A]"></div>
                             <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded bg-[#FF6D5A]/10 text-[#FF6D5A]">
                                    <Workflow className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-lg">n8n Engine</span>
                             </div>
                             <p className="text-sm text-text-subtle mb-4">Automated RAG pipelines & orchestration.</p>
                             
                             {/* Mock Workflow Nodes */}
                             <div className="flex items-center gap-2 opacity-50">
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
                                <div className="w-4 h-px bg-white/20"></div>
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center"><Database className="w-4 h-4" /></div>
                                <div className="w-4 h-px bg-white/20"></div>
                                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center"><Cpu className="w-4 h-4" /></div>
                             </div>
                         </div>
                    </div>

                    {/* Center: Connection Animation */}
                    <div className="hidden md:flex flex-col items-center justify-center gap-2">
                        <div className="w-full h-px bg-gradient-to-r from-[#FF6D5A] to-[#D50C2D] opacity-30 relative">
                            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-20 h-1 bg-gradient-to-r from-[#FF6D5A] to-[#D50C2D] blur-[2px] animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-background border border-white/10 text-xs text-text-subtle font-mono uppercase tracking-wider">
                            Deployed On
                        </div>
                        <div className="w-full h-px bg-gradient-to-r from-[#FF6D5A] to-[#D50C2D] opacity-30"></div>
                    </div>

                    {/* Mobile Connector */}
                    <div className="flex md:hidden justify-center py-2">
                         <ArrowRight className="text-text-subtle rotate-90" />
                    </div>

                    {/* Right: Infrastructure (Hetzner) */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-[#0F0F13] border border-white/10 rounded-xl p-6 shadow-lg relative group overflow-hidden">
                             <div className="absolute top-0 right-0 w-1 h-full bg-[#D50C2D]"></div>
                             <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded bg-[#D50C2D]/10 text-[#D50C2D]">
                                    <Server className="w-6 h-6" />
                                </div>
                                <span className="text-white font-bold text-lg">Hetzner Cloud</span>
                             </div>
                             <p className="text-sm text-text-subtle mb-4">High-availability German infrastructure.</p>
                             
                             <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-text-subtle">
                                    <ShieldCheck className="w-3 h-3 text-green-400" />
                                    <span>GDPR Compliant</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-text-subtle">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span>Low Latency</span>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Background Diagram Elements */}
                <div className="absolute inset-0 z-0 opacity-20">
                    <svg className="w-full h-full" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>
            </div>
        </div>

        {/* Main Message & CTA */}
        <div className="flex flex-col items-center gap-8 max-w-3xl animate-fade-in-up">
          <p className="text-xl md:text-2xl text-white text-center leading-relaxed font-light">
            The solution is built on top of <strong className="text-white">n8n</strong> and hosted on <strong className="text-white">Hetzner</strong> servers.
          </p>
          
          <Button onClick={onStart} className="!bg-primary !text-background hover:!bg-primary/90 !h-14 !px-12 !text-lg !font-bold !rounded-md shadow-[0_0_20px_rgba(126,249,255,0.4)] hover:shadow-[0_0_30px_rgba(126,249,255,0.6)] transition-all transform hover:-translate-y-1">
            Start
          </Button>
        </div>

      </div>
    </section>
  );
};

export default RagExplanation;