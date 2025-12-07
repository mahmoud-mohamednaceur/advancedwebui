

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Layers } from 'lucide-react';
import { RETRIEVAL_STRATEGIES } from './constants';

interface StrategySelectorProps {
    currentStrategyId: string;
    onSelect: (id: string) => void;
    className?: string;
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({ currentStrategyId, onSelect, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeStrategy = RETRIEVAL_STRATEGIES.find(s => s.id === currentStrategyId) || RETRIEVAL_STRATEGIES[0];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-xs font-medium group min-w-[220px] justify-between
                    ${isOpen 
                        ? 'bg-surface-highlight border-white/20 text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-text-subtle hover:text-white hover:bg-white/10 hover:border-white/20'
                    }`}
            >
                <div className="flex items-center gap-3 truncate min-w-0">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20 text-secondary shrink-0`}>
                        <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5 overflow-hidden min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-50 leading-none">Retrieval Strategy</span>
                        <span className="truncate leading-none font-bold text-[11px] w-full text-left">{activeStrategy.name}</span>
                    </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-[320px] bg-[#0F0F13]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] z-[100] overflow-hidden animate-fade-in-up origin-top-left ring-1 ring-white/5">
                    <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Select Retrieval Strategy</span>
                         <span className="text-[10px] text-text-subtle/50 font-mono">{RETRIEVAL_STRATEGIES.length} Available</span>
                    </div>
                    
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {RETRIEVAL_STRATEGIES.map(strategy => {
                            const isActive = strategy.id === currentStrategyId;
                            const isDisabled = strategy.disabled;

                            return (
                                <button
                                    key={strategy.id}
                                    disabled={isDisabled}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            onSelect(strategy.id);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={`w-full text-left px-3 py-3 rounded-xl text-xs flex items-start gap-3 group transition-all duration-200 border border-transparent relative overflow-hidden
                                        ${isActive 
                                            ? 'bg-primary/10 border-primary/20' 
                                            : isDisabled
                                                ? 'opacity-40 cursor-not-allowed bg-transparent'
                                                : 'hover:bg-white/5 hover:border-white/5'
                                        }`}
                                >
                                    {/* Active Indicator Bar */}
                                    {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary shadow-[0_0_8px_rgba(126,249,255,0.6)]"></div>}

                                    {/* Icon Placeholder or Radio */}
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                        isActive 
                                            ? 'border-primary bg-primary text-black shadow-neon-primary' 
                                            : 'border-white/10 group-hover:border-white/30 bg-white/5'
                                    }`}>
                                        {isActive && <Check className="w-3 h-3" />}
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-bold truncate text-sm ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                {strategy.name}
                                            </span>
                                            {isDisabled && <span className="text-[9px] uppercase font-bold text-text-subtle bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Soon</span>}
                                        </div>
                                        <span className={`text-[10px] leading-relaxed line-clamp-2 ${isActive ? 'text-text-subtle' : 'text-text-subtle/70 group-hover:text-text-subtle'}`}>
                                            {strategy.description}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Footer / Tip */}
                    <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 text-[10px] text-text-subtle flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                        <span className="opacity-80">Strategies affect query cost & latency.</span>
                    </div>
                </div>
            )}
        </div>
    );
};