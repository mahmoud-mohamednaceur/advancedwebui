

import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Search, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { RetrievalPanel } from './NotebookChat';
import { NotebookConfig } from '../../App';
import { StrategySelector } from './StrategySelector';

interface PlaygroundSearchProps {
    notebookId: string;
    config: NotebookConfig;
    onConfigChange: (newConfig: NotebookConfig) => void;
}

const PlaygroundSearch: React.FC<PlaygroundSearchProps> = ({ notebookId, config, onConfigChange }) => {
    const { user } = useUser();
    const [query, setQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rawResults, setRawResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setHasSearched(true);
        setIsLoading(true);
        setError(null);
        setRawResults(null);

        try {
            const activeStrategy = config.strategies[config.activeStrategyId];
            if (!activeStrategy.retrievalWebhook) {
                throw new Error(`No retrieval webhook configured for strategy: ${config.activeStrategyId}`);
            }

            const payload = {
                question: query,
                notebook_id: notebookId,
                active_strategy_id: config.activeStrategyId,
                strategies_config: config.strategies,
                inference_config: config.inference,
                system_prompts: config.systemPrompts,
                embedding_model: config.embeddingModel,
                user_id: user?.id
            };

            const response = await fetch(activeStrategy.retrievalWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Retrieval failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setRawResults(data);

        } catch (err: any) {
            console.error("Playground Search Error:", err);
            setError(err.message || "An unexpected error occurred during retrieval.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/10 bg-surface shrink-0 flex items-center justify-between relative z-50">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Search Playground</h2>
                    <p className="text-text-subtle text-sm">Test retrieval performance and relevance algorithms.</p>
                </div>

                <StrategySelector
                    currentStrategyId={config.activeStrategyId}
                    onSelect={(id) => onConfigChange({ ...config, activeStrategyId: id })}
                />
            </div>

            <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full gap-6 h-full min-h-0 relative z-0">
                {/* Search Input */}
                <form onSubmit={handleSearch} className="relative shrink-0 z-30">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                        <div className="relative flex items-center bg-[#0E0E12] border border-white/20 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-colors">
                            <div className="pl-4 text-primary">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Search using ${config.activeStrategyId}...`}
                                className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none text-lg placeholder-text-subtle/50"
                                disabled={isLoading}
                            />
                            <Button type="submit" variant="primary" className="!rounded-xl !h-10 !px-6" disabled={isLoading || !query.trim()}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {isLoading ? 'Searching...' : 'Search'}
                            </Button>
                        </div>
                    </div>
                </form>

                {/* Results Area */}
                <div className="flex-1 overflow-hidden relative bg-[#0A0A0F] border border-white/10 rounded-xl shadow-inner flex flex-col">

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8 bg-[#0A0A0F]/90 backdrop-blur-sm">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-white font-bold text-lg mb-2">Retrieval Failed</p>
                            <p className="text-red-400 text-sm max-w-md bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</p>
                            <Button variant="outline" onClick={() => setError(null)} className="mt-6 border-white/10">Try Again</Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 z-20 bg-[#0A0A0F]/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4 bg-surface p-8 rounded-2xl border border-white/10 shadow-2xl">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">Running {config.activeStrategyId}...</p>
                            </div>
                        </div>
                    )}

                    {/* Initial State */}
                    {!hasSearched && !isLoading && (
                        <div className="h-full flex flex-col items-center justify-center text-text-subtle opacity-50">
                            <Search className="w-16 h-16 mb-4 stroke-1" />
                            <p className="text-sm">Enter a query to test your active retrieval strategy</p>
                        </div>
                    )}

                    {/* Results Panel */}
                    {hasSearched && rawResults && (
                        <RetrievalPanel
                            strategyId={config.activeStrategyId}
                            citations={[]}
                            rawRetrieval={rawResults}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaygroundSearch;
