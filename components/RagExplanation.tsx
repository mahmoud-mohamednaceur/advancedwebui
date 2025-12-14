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