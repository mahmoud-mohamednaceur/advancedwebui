import React from 'react';
import { Network, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8 mt-12 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-white">RAG Flow</span>
          </div>

          <div className="flex gap-6 text-sm text-text-subtle">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>

          <div className="flex gap-4 text-text-subtle">
            <a href="#" className="hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
            <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
          </div>
        </div>
        
        <div className="text-center text-xs text-text-subtle mt-8 opacity-60">
          © 2024 RAG Flow. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;