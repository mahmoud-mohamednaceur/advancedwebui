import React from 'react';
import Button from './ui/Button';

const CTA: React.FC = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto bg-surface border border-white/10 rounded-2xl p-8 md:p-16 text-center relative overflow-hidden">
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to Elevate Your AI Solutions?
          </h2>
          <p className="text-text-subtle mb-8 max-w-lg mx-auto">
            Discover the full potential of automated, intelligent RAG systems. Connect with our experts today.
          </p>
          <Button variant="primary" className="mx-auto">
            Book a Demo
          </Button>
        </div>

        {/* Background Accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
      </div>
    </section>
  );
};

export default CTA;