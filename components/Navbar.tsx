import React, { useState } from 'react';
import { Menu, X, Network } from 'lucide-react';
import Button from './ui/Button';

interface NavbarProps {
  onStart?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onStart }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
      <nav className="w-full max-w-6xl bg-background/80 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <Network className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(126,249,255,0.8)]" />
          <span className="text-lg font-bold text-white tracking-tight">RAG Flow</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex gap-8">
            <a href="#workflow" className="text-sm font-medium text-text-subtle hover:text-white transition-colors">Workflow</a>
            <a href="#solutions" className="text-sm font-medium text-text-subtle hover:text-white transition-colors">Solutions</a>
          </div>
          <a href="/sign-up">
            <Button variant="primary" className="!h-10 !px-5">Get Started</Button>
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-surface border border-white/10 rounded-xl shadow-2xl flex flex-col gap-4 md:hidden mx-4">
            <a href="#workflow" className="text-white p-2" onClick={() => setIsOpen(false)}>Workflow</a>
            <a href="#solutions" className="text-white p-2" onClick={() => setIsOpen(false)}>Solutions</a>
            <a href="/sign-up" className="w-full" onClick={() => setIsOpen(false)}>
              <Button variant="primary" className="w-full">Get Started</Button>
            </a>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;