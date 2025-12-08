import React, { useState, useEffect } from 'react';
import { FolderOpen, Database, MessageSquare, Search, Cpu, CheckCircle2, Binary } from 'lucide-react';
import Button from './ui/Button';

const Node = ({ icon: Icon, title, subtitle, color, isActive }: { icon: any, title: string, subtitle: string, color: string, isActive: boolean }) => {
  const colorClass = color === 'primary' ? 'text-primary shadow-neon-primary'
    : color === 'secondary' ? 'text-secondary shadow-neon-secondary'
      : 'text-tertiary shadow-[0_0_15px_#FDFF00]';

  const borderClass = color === 'primary' ? 'border-primary/50'
    : color === 'secondary' ? 'border-secondary/50'
      : 'border-tertiary/50';

  const activeGlow = color === 'primary' ? 'shadow-[0_0_30px_rgba(126,249,255,0.3)]'
    : color === 'secondary' ? 'shadow-[0_0_30px_rgba(224,59,138,0.3)]'
      : 'shadow-[0_0_30px_rgba(253,255,0,0.3)]';

  return (
    <div className={`flex-shrink-0 w-72 flex flex-col items-center justify-center p-8 rounded-2xl bg-surface/40 backdrop-blur-md border border-white/5 transition-all duration-700 relative group z-10 
      ${isActive ? `-translate-y-2 bg-surface/60 ${borderClass} ${activeGlow}` : 'hover:-translate-y-2 hover:shadow-2xl hover:bg-surface/60 hover:border-white/20'}
    `}>

      {/* Icon Container */}
      <div className={`mb-6 p-4 rounded-full bg-background/80 border border-white/10 transition-transform duration-700 ${colorClass} shadow-lg
        ${isActive ? 'scale-110' : 'group-hover:scale-110'}
      `}>
        <Icon className="w-10 h-10" strokeWidth={1.5} />
      </div>

      <h3 className={`text-xl font-bold text-white mb-2 tracking-tight transition-all duration-300
        ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400' : 'group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400'}
      `}>{title}</h3>
      <p className={`text-sm text-text-subtle text-center leading-relaxed transition-colors duration-300
        ${isActive ? 'text-text-light' : 'group-hover:text-text-light'}
      `}>{subtitle}</p>

      {/* Active Glow effect on hover/active */}
      <div className={`absolute inset-0 rounded-2xl transition-opacity duration-700 bg-${color} blur-xl -z-10
        ${isActive ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}
      `}></div>
    </div>
  );
};

const Connector = ({ isActive }: { isActive: boolean }) => (
  <div className="flex-shrink-0 w-12 md:w-24 h-[2px] relative overflow-hidden bg-white/10">
    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-primary/80 to-transparent w-1/2 transition-all duration-1000 ease-linear
        ${isActive ? 'translate-x-[200%]' : '-translate-x-full'}
    `}></div>
  </div>
);

const Workflow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const totalSteps = 7; // 7 nodes

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % totalSteps);
    }, 1500); // Change step every 1.5s

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="workflow" className="py-16 md:py-24 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Your Data Workflow, Visualized.</h2>
        <p className="text-text-subtle max-w-2xl mx-auto">See how n8n orchestrates complex RAG pipelines, from data ingestion to intelligent response. Minimal steps, maximum impact.</p>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative w-full">
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

        <div className="flex overflow-x-auto pb-12 pt-4 px-6 md:px-12 gap-0 items-center scrollbar-hide snap-x snap-mandatory">
          {/* Spacer to ensure left padding works correctly in overflow container */}
          <div className="w-6 md:w-12 flex-shrink-0"></div>

          <div className="snap-center px-2"><Node isActive={activeStep === 0} icon={FolderOpen} title="Data Ingestion" subtitle="Connect to diverse sources." color="primary" /></div>
          <Connector isActive={activeStep === 0} />
          <div className="snap-center px-2"><Node isActive={activeStep === 1} icon={Binary} title="Processing" subtitle="Clean, chunk, and embed data." color="secondary" /></div>
          <Connector isActive={activeStep === 1} />
          <div className="snap-center px-2"><Node isActive={activeStep === 2} icon={Database} title="Vector Database" subtitle="Secure, efficient storage." color="tertiary" /></div>
          <Connector isActive={activeStep === 2} />
          <div className="snap-center px-2"><Node isActive={activeStep === 3} icon={MessageSquare} title="User Query" subtitle="Natural language input." color="primary" /></div>
          <Connector isActive={activeStep === 3} />
          <div className="snap-center px-2"><Node isActive={activeStep === 4} icon={Search} title="Retrieval" subtitle="Find relevant information." color="secondary" /></div>
          <Connector isActive={activeStep === 4} />
          <div className="snap-center px-2"><Node isActive={activeStep === 5} icon={Cpu} title="LLM Generation" subtitle="Synthesize informed responses." color="tertiary" /></div>
          <Connector isActive={activeStep === 5} />
          <div className="snap-center px-2"><Node isActive={activeStep === 6} icon={CheckCircle2} title="Augmented Answer" subtitle="Accurate, context-rich output." color="primary" /></div>

          {/* Spacer to ensure right padding works correctly in overflow container */}
          <div className="w-6 md:w-12 flex-shrink-0"></div>
        </div>
      </div>

      <div className="text-center mt-4">
        <Button variant="secondary" className="!h-14 !px-8 !text-lg shadow-neon-secondary">
          View Integration Guides
        </Button>
      </div>
    </section>
  );
};

export default Workflow;