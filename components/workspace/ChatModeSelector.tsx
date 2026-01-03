import React from 'react';
import { Database, FileText, X, Sparkles, Table, Search } from 'lucide-react';

export type ChatMode = 'rag' | 'sql';

interface ChatModeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: ChatMode) => void;
}

const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
    isOpen,
    onClose,
    onSelect
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#0A0A10] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/10 to-secondary/20 blur-2xl opacity-50" />

                {/* Content */}
                <div className="relative">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">New Conversation</h2>
                                <p className="text-xs text-text-subtle">Choose how you want to explore your data</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/5 text-text-subtle hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mode Options */}
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {/* RAG Mode */}
                        <button
                            onClick={() => onSelect('rag')}
                            className="group relative flex flex-col items-center p-6 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 overflow-hidden"
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <FileText className="w-8 h-8 text-emerald-400" />
                                </div>

                                <div className="flex items-center justify-center gap-1.5 mb-2">
                                    <span className="text-lg font-bold text-white">RAG</span>
                                    <Search className="w-4 h-4 text-emerald-400" />
                                </div>

                                <p className="text-xs text-text-subtle text-center leading-relaxed">
                                    Document retrieval & knowledge-based answers with citations
                                </p>

                                <div className="mt-4 flex flex-wrap justify-center gap-1">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                        PDFs
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                        Docs
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                                        Text
                                    </span>
                                </div>
                            </div>
                        </button>

                        {/* SQL Mode */}
                        <button
                            onClick={() => onSelect('sql')}
                            className="group relative flex flex-col items-center p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 overflow-hidden"
                        >
                            {/* Hover glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Database className="w-8 h-8 text-primary" />
                                </div>

                                <div className="flex items-center justify-center gap-1.5 mb-2">
                                    <span className="text-lg font-bold text-white">SQL</span>
                                    <Table className="w-4 h-4 text-primary" />
                                </div>

                                <p className="text-xs text-text-subtle text-center leading-relaxed">
                                    Structured data analysis with AI-powered SQL queries
                                </p>

                                <div className="mt-4 flex flex-wrap justify-center gap-1">
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                        Excel
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                        CSV
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                                        Tables
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Footer hint */}
                    <div className="px-6 pb-6">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                            <p className="text-[11px] text-text-subtle text-center">
                                💡 <span className="text-white/70">Tip:</span> Use <span className="text-emerald-400 font-medium">RAG</span> for documents and knowledge questions.
                                Use <span className="text-primary font-medium">SQL</span> for data analysis, aggregations, and insights from spreadsheets.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModeSelector;
