import React from 'react';
import { FolderOpen, Database, MessageSquare, Search, Cpu, CheckCircle2, Binary } from 'lucide-react';
import Button from './ui/Button';

const Node = ({ icon: Icon, title, subtitle, color }: { icon: any, title: string, subtitle: string, color: string }) => {
  const colorClass = color === 'primary' ? 'text-primary border-primary shadow-neon-primary' 
                   : color === 'secondary' ? 'text-secondary border-secondary shadow-neon-secondary'
                   : 'text-tertiary border-tertiary shadow-[0_0_10px_#FDFF00]';

  return (
    <div className="flex-shrink-0 w-64 flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-white/10 hover:border-opacity-50 transition-all duration-300 relative group z-10">
      <div className={`mb-4 p-3 rounded-full bg-background/50 border border-white/10 group-hover:scale-110 transition-transform duration-300 ${color === 'primary' ? 'text-primary' : color === 'secondary' ? 'text-secondary' : 'text-tertiary'}`}>
        <Icon className="w-8 h-8 drop-shadow-lg" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-text-subtle text-center">{subtitle}</p>
      
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-${color}`}></div>
    </div>
  );
};

const Connector = () => (
  <div className="flex-shrink-0 w-16 h-1 md:h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary opacity-50 shadow-[0_0_8px_rgba(126,249,255,0.4)]"></div>
);

const Workflow: React.FC = () => {
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
          <div className="snap-center px-2"><Node icon={FolderOpen} title="Data Ingestion" subtitle="Connect to diverse sources." color="primary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={Binary} title="Processing" subtitle="Clean, chunk, and embed data." color="secondary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={Database} title="Vector Database" subtitle="Secure, efficient storage." color="tertiary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={MessageSquare} title="User Query" subtitle="Natural language input." color="primary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={Search} title="Retrieval" subtitle="Find relevant information." color="secondary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={Cpu} title="LLM Generation" subtitle="Synthesize informed responses." color="tertiary" /></div>
          <Connector />
          <div className="snap-center px-2"><Node icon={CheckCircle2} title="Augmented Answer" subtitle="Accurate, context-rich output." color="primary" /></div>
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