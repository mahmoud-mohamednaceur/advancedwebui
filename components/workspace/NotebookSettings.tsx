

import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Save, Search, Sliders, Check, RefreshCw, Cpu, Activity, BookOpen, Lock, Binary, AlertTriangle, Webhook, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import type { NotebookConfig, StrategyConfig } from '../../App';
import { RETRIEVAL_STRATEGIES } from './constants';

// --- Custom Icons ---

const OpenAILogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 3.5366-2.1956a1.0276 1.0276 0 0 0 .512-.9408v-4.47l4.198 2.3766v2.8026a4.4966 4.4966 0 0 1-5.512 3.5484zm-5.916-5.061a4.4918 4.4918 0 0 1 0-5.4707v4.2154l3.638 2.0935v.0152l-2.5046 1.5227a1.0381 1.0381 0 0 0-.5235.8975v.0123a4.4842 4.4842 0 0 1-.6099-3.286zM4.567 6.7019a4.4966 4.4966 0 0 1 5.426-3.6582v2.8035L5.8012 8.22a1.0352 1.0352 0 0 0-.533.8984v4.186l-2.5532-1.5484a4.4966 4.4966 0 0 1 1.852-5.0541zm12.9367-1.5385v-2.8035a4.4966 4.4966 0 0 1 2.165 7.7821l-2.577 1.4816v-4.2068l3.7238-2.2451zM13.32 5.0804a4.4966 4.4966 0 0 1 2.787 1.105l-3.586 2.1936a1.0362 1.0362 0 0 0-.5044.9504v4.4423l-4.2503-2.3671V8.5702a4.5252 4.5252 0 0 1 5.5537-3.4898z" />
    </svg>
);

const OllamaLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M21.56,11.6C21.34,7.82,17.83,5.71,14.78,5.32V4.07C14.78,2.5,13.61,1.21,12.12,1.21S9.46,2.5,9.46,4.07v1.25C6.4,5.71,2.9,7.82,2.68,11.6c-0.12,2.04,0.64,4.31,2.2,5.82C4.25,18.12,4,19,4,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-0.32-0.06-0.63-0.15-0.92c0.71,0.12,1.44,0.17,2.15,0.17s1.44-0.05,2.15-0.17C14.06,19.37,14,19.68,14,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-1-0.25-1.88-0.88-2.58C20.92,15.91,21.68,13.64,21.56,11.6z M16,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.83,12.5,16,12.5z M8.24,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S9.07,12.5,8.24,12.5z M12.12,16c-0.63,0-1.21-0.19-1.68-0.52c0.47-0.26,0.96-0.41,1.68-0.41s1.21,0.16,1.68,0.41C13.33,15.81,12.75,16,12.12,16z" />
    </svg>
);

// --- Constants ---

// Embedding Models
interface EmbeddingOption {
    id: string;
    name: string;
    provider: 'ollama' | 'openai';
}

const EMBEDDING_MODELS: EmbeddingOption[] = [
    { id: 'nomic-embed-text:latest', name: 'Nomic Embed Text (Latest)', provider: 'ollama' },
    { id: 'text-embedding-3-small', name: 'Text-Embedding-3-Small', provider: 'openai' }
];

// Model Configurations
type ModelProvider = 'openai' | 'ollama';

interface ModelOption {
    id: string;
    name: string;
}

const AVAILABLE_MODELS: Record<ModelProvider, ModelOption[]> = {
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ],
    ollama: [
        { id: 'qwen2.5:7b-instruct-q4_K_M', name: 'Qwen 2.5 7B (Instruct q4_K_M)' }
    ]
};

interface NotebookSettingsProps {
    notebookId: string;
    notebookName: string;
    config: NotebookConfig;
    onConfigChange: (newConfig: NotebookConfig) => void;
    defaultStrategies: Record<string, StrategyConfig>;
}

const NotebookSettings: React.FC<NotebookSettingsProps> = ({ notebookId, notebookName, config, onConfigChange, defaultStrategies }) => {
    const { user } = useUser();

    const [activePromptTab, setActivePromptTab] = React.useState<'retrieval' | 'dataset'>('retrieval');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // NEW: Fetch settings on mount
    React.useEffect(() => {
        let isMounted = true;

        const fetchSettings = async () => {
            if (!notebookId) {
                console.warn("Skipping settings fetch: No notebookId provided");
                setIsLoadingSettings(false);
                return;
            }

            setIsLoadingSettings(true);
            console.log(`📥 Fetching settings for notebook: ${notebookId}`);

            try {
                // Use POST with notebook_id for n8n compatibility
                const response = await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-get-current-notebook-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notebook_id: notebookId, user_id: user?.id })
                });

                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }

                const text = await response.text();
                if (!text) {
                    console.log("⚠️ Webhook returned empty body. Using local defaults.");
                    return;
                }

                let data;
                try {
                    const json = JSON.parse(text);
                    data = Array.isArray(json) ? json[0] : json;
                } catch (e) {
                    console.warn("Invalid JSON from settings webhook", text);
                    return;
                }

                if (!isMounted) return;

                console.log("✅ Received Remote Settings:", data);

                // Map DB/Webhook response format back to Frontend Config format
                const newConfig: Partial<NotebookConfig> = {};

                // Sync embedding_model from backend
                if (data.embedding_model) {
                    newConfig.embeddingModel = data.embedding_model;
                }

                // 1. System Prompts
                if (data.system_prompt_retrieval || data.system_prompt_dataset) {
                    newConfig.systemPrompts = {
                        retrieval: data.system_prompt_retrieval || config.systemPrompts.retrieval,
                        dataset: data.system_prompt_dataset || config.systemPrompts.dataset
                    };
                }

                // 2. Inference
                if (data.inference_provider || data.inference_model) {
                    newConfig.inference = {
                        provider: data.inference_provider || config.inference.provider,
                        model: data.inference_model || config.inference.model,
                        temperature: data.inference_temperature !== undefined ? Number(data.inference_temperature) : config.inference.temperature
                    };
                }

                // 3. Active Strategy
                if (data.active_strategy_id) {
                    newConfig.activeStrategyId = data.active_strategy_id;
                }

                // 4. Strategies Config
                if (data.strategies_config && typeof data.strategies_config === 'object') {
                    newConfig.strategies = data.strategies_config;
                }

                // Merge into parent state
                if (Object.keys(newConfig).length > 0) {
                    onConfigChange({ ...config, ...newConfig });
                }

            } catch (error) {
                console.error("❌ Failed to load remote settings:", error);
            } finally {
                if (isMounted) setIsLoadingSettings(false);
            }
        };

        fetchSettings();

        return () => { isMounted = false; };
    }, [notebookId]);

    // Helper to update config
    const updateConfig = (updates: Partial<NotebookConfig>) => {
        onConfigChange({ ...config, ...updates });
    };

    // Helper to update a specific strategy
    const updateStrategy = (strategyId: string, updates: Partial<StrategyConfig>) => {
        const updatedStrategies = { ...config.strategies };
        updatedStrategies[strategyId] = { ...updatedStrategies[strategyId], ...updates };
        updateConfig({ strategies: updatedStrategies });
    };

    // Helper to update params of active strategy
    const handleParamChange = (key: string, value: string) => {
        const currentStrategy = config.strategies[config.activeStrategyId];
        const newParams = { ...currentStrategy.params, [key]: parseFloat(value) || 0 };
        updateStrategy(config.activeStrategyId, { params: newParams });
    };

    // Helper to update webhooks
    const handleWebhookChange = (type: 'retrievalWebhook' | 'agenticWebhook', value: string) => {
        if (config.activeStrategyId === 'agentic-sql' && type === 'retrievalWebhook') {
            // Special case: Single webhook strategy
            // Sync both fields to the same value
            const updatedStrategies = { ...config.strategies };
            updatedStrategies[config.activeStrategyId] = {
                ...updatedStrategies[config.activeStrategyId],
                retrievalWebhook: value,
                agenticWebhook: value
            };
            updateConfig({ strategies: updatedStrategies });
        } else {
            updateStrategy(config.activeStrategyId, { [type]: value });
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Prepare strategies config, ensuring we fallback to defaults if empty
        const strategiesConfig = JSON.parse(JSON.stringify(config.strategies));

        Object.keys(strategiesConfig).forEach((key) => {
            const strategy = strategiesConfig[key];
            const defaultStrategy = defaultStrategies[key];

            if (defaultStrategy) {
                // If webhook is empty, force default from prop
                if (!strategy.retrievalWebhook || strategy.retrievalWebhook.trim() === '') {
                    strategy.retrievalWebhook = defaultStrategy.retrievalWebhook;
                }
                if (!strategy.agenticWebhook || strategy.agenticWebhook.trim() === '') {
                    strategy.agenticWebhook = defaultStrategy.agenticWebhook;
                }
            }
        });

        // Payload mapping to DB Schema (notebook_settings)
        // Must include embedding_model from current config (which is synced from DB on mount)
        const payload = {
            notebook_id: notebookId,
            system_prompt_retrieval: config.systemPrompts.retrieval,
            system_prompt_dataset: config.systemPrompts.dataset,
            inference_provider: config.inference.provider,
            inference_model: config.inference.model,
            embedding_model: config.embeddingModel,
            inference_temperature: config.inference.temperature,
            active_strategy_id: config.activeStrategyId,
            strategies_config: strategiesConfig,
            user_id: user?.id
        };

        console.log("💾 Saving Settings to Webhook:", payload);

        try {
            const response = await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-notebook-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert("Settings saved successfully to remote database.");
            } else {
                const errorText = await response.text();
                alert(`Remote save failed. Server responded with ${response.status}: ${errorText}`);
            }
        } catch (error: any) {
            console.warn("Webhook Sync Warning:", error);

            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                alert("✅ Settings saved locally.\n\n⚠️ Note: Remote synchronization to the database failed (Network/CORS error). Your settings are active for this session and stored in your browser.");
            } else {
                alert(`Settings saved locally, but remote sync failed: ${error.message}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const activeStrategy = config.strategies[config.activeStrategyId];
    const embeddingModel = config.embeddingModel;

    return (
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-background p-6 md:p-12 relative">

            {/* Loading Overlay */}
            {isLoadingSettings && (
                <div className="absolute top-6 right-6 z-50 flex items-center gap-2 px-3 py-1.5 bg-surface/80 backdrop-blur-md border border-white/10 rounded-full text-xs text-text-subtle animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Syncing...
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Settings</h1>
                        <p className="text-text-subtle text-lg font-light">Configure notebook behavior, intelligence parameters, and retrieval strategies.</p>
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={isSaving || isLoadingSettings}
                        className="!h-12 !px-8 flex items-center gap-2 shadow-neon-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save Changes
                            </>
                        )}
                    </Button>
                </div>

                {/* Section: Embedding Configuration */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Binary className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Embedding Model</h2>
                    </div>

                    <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">

                        {/* Warning Banner */}
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-amber-200">Configuration Locked</h4>
                                <p className="text-xs text-amber-200/70 leading-relaxed">
                                    The embedding model was set during creation and <strong>cannot be changed</strong>.
                                    This ensures vector index consistency for all documents in this notebook.
                                </p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {EMBEDDING_MODELS.map((model) => {
                                const isSelected = embeddingModel === model.id;
                                // Always disabled in settings view as per requirement
                                const isDisabled = true;

                                return (
                                    <div
                                        key={model.id}
                                        className={`relative p-6 rounded-xl border-2 transition-all duration-300 flex items-center gap-4
                                        ${isDisabled && !isSelected ? 'opacity-30 grayscale pointer-events-none border-transparent bg-surface/30' : ''}
                                        ${isDisabled && isSelected ? 'bg-[#0E0E12] border-indigo-500 shadow-lg cursor-default' : ''}
                                    `}
                                    >
                                        {isDisabled && isSelected && (
                                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-400 uppercase">
                                                <Lock className="w-3 h-3" /> Locked
                                            </div>
                                        )}

                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0
                                        ${model.provider === 'openai'
                                                ? (isSelected ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-surface border-white/10 text-text-subtle')
                                                : (isSelected ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-surface border-white/10 text-text-subtle')
                                            }
                                    `}>
                                            {model.provider === 'openai' ? <OpenAILogo className="w-6 h-6" /> : <OllamaLogo className="w-6 h-6" />}
                                        </div>

                                        <div>
                                            <div className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-text-subtle'}`}>
                                                {model.name}
                                            </div>
                                            <div className="text-xs text-text-subtle opacity-70 font-mono">{model.id}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Section: System Prompts */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Intelligence & System Prompts</h2>
                    </div>

                    <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[600px]">
                        {/* Tabs */}
                        <div className="flex border-b border-white/10 bg-[#0E0E12]/50">
                            <button
                                onClick={() => setActivePromptTab('retrieval')}
                                className={`flex-1 py-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 hover:bg-white/5 ${activePromptTab === 'retrieval' ? 'text-primary border-primary bg-primary/5' : 'text-text-subtle border-transparent'}`}
                            >
                                Retrieval Agent (Unstructured)
                            </button>
                            <button
                                onClick={() => setActivePromptTab('dataset')}
                                className={`flex-1 py-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 hover:bg-white/5 ${activePromptTab === 'dataset' ? 'text-secondary border-secondary bg-secondary/5' : 'text-text-subtle border-transparent'}`}
                            >
                                Dataset Agent (Structured)
                            </button>
                        </div>

                        {/* Editor */}
                        <div className="flex-1 relative group">
                            <textarea
                                value={activePromptTab === 'retrieval' ? config.systemPrompts.retrieval : config.systemPrompts.dataset}
                                onChange={(e) => {
                                    const newPrompts = { ...config.systemPrompts };
                                    if (activePromptTab === 'retrieval') newPrompts.retrieval = e.target.value;
                                    else newPrompts.dataset = e.target.value;
                                    updateConfig({ systemPrompts: newPrompts });
                                }}
                                className="w-full h-full bg-[#0A0A0F] text-gray-300 font-mono text-sm p-8 focus:outline-none resize-none leading-relaxed selection:bg-primary/20"
                                spellCheck={false}
                            />
                        </div>
                    </div>
                </section>

                {/* Section: Retrieval Strategy */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                            <Search className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Retrieval Strategy</h2>
                    </div>

                    <div className="grid lg:grid-cols-[1fr_380px] gap-8">

                        {/* Strategy Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-fit">
                            {RETRIEVAL_STRATEGIES.map((strategy) => {
                                const isActive = config.activeStrategyId === strategy.id;
                                const isDisabled = strategy.disabled;

                                return (
                                    <div
                                        key={strategy.id}
                                        onClick={() => !isDisabled && updateConfig({ activeStrategyId: strategy.id })}
                                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 group
                                        ${isDisabled ? 'opacity-40 cursor-not-allowed border-transparent bg-surface/20' : 'cursor-pointer'}
                                        ${!isDisabled && isActive ? 'bg-[#0E0E12] border-primary shadow-[0_0_20px_rgba(126,249,255,0.1)]' : ''}
                                        ${!isDisabled && !isActive ? 'bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface' : ''}
                                    `}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`font-bold text-lg ${isActive && !isDisabled ? 'text-white' : 'text-text-subtle group-hover:text-white'}`}>{strategy.name}</div>
                                            {isActive && !isDisabled && (
                                                <div className="bg-primary rounded-full p-0.5">
                                                    <Check className="w-3 h-3 text-black" />
                                                </div>
                                            )}
                                            {isDisabled && (
                                                <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] font-bold text-text-subtle uppercase tracking-wider">
                                                    Coming Soon
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-subtle leading-relaxed opacity-80">{strategy.description}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Parameters & Webhook Panel */}
                        <div className="bg-[#0E0E12] border border-white/10 rounded-2xl p-6 h-fit sticky top-6 shadow-xl flex flex-col gap-8">

                            {/* Params */}
                            <div>
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                    <Sliders className="w-4 h-4 text-primary" />
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                        Tunable Parameters
                                    </h3>
                                </div>

                                <div className="space-y-6">
                                    {Object.entries(activeStrategy.params).length === 0 && (
                                        <div className="text-center text-text-subtle/50 text-xs italic py-4">No parameters available for this strategy.</div>
                                    )}
                                    {Object.entries(activeStrategy.params).map(([key, value]) => (
                                        <div key={key} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[11px] font-mono text-text-subtle uppercase">{key}</label>
                                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{value}</span>
                                            </div>
                                            <input
                                                type="number"
                                                step={key.includes('weight') ? 0.1 : 1}
                                                min={0}
                                                value={value}
                                                onChange={(e) => handleParamChange(key, e.target.value)}
                                                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Webhooks */}
                            <div>
                                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                    <Webhook className="w-4 h-4 text-secondary" />
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                        Pipeline Webhooks
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Retrieval Endpoint</label>
                                        <input
                                            type="text"
                                            value={activeStrategy.retrievalWebhook}
                                            onChange={(e) => handleWebhookChange('retrievalWebhook', e.target.value)}
                                            placeholder="https://api.n8n.io/..."
                                            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-secondary/50 focus:outline-none transition-colors font-mono placeholder-text-subtle/30"
                                        />
                                    </div>

                                    {config.activeStrategyId !== 'agentic-sql' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Agentic Response Endpoint</label>
                                            <input
                                                type="text"
                                                value={activeStrategy.agenticWebhook}
                                                onChange={(e) => handleWebhookChange('agenticWebhook', e.target.value)}
                                                placeholder="https://api.n8n.io/..."
                                                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-secondary/50 focus:outline-none transition-colors font-mono placeholder-text-subtle/30"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-tertiary/5 border border-tertiary/10">
                                <div className="flex gap-2 items-start">
                                    <Activity className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
                                    <p className="text-xs text-tertiary/80 leading-relaxed">
                                        Webhooks are specific to the <strong>{activeStrategy.id}</strong> strategy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Model Inference */}
                <section className="pb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                            <Cpu className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Model Inference</h2>
                    </div>

                    <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-xl">
                        <div className="grid lg:grid-cols-2 gap-10">

                            {/* Left: Provider & Model */}
                            <div className="space-y-8">
                                {/* Provider Selection */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-text-subtle uppercase tracking-wider block">Inference Provider</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => updateConfig({ inference: { ...config.inference, provider: 'openai', model: AVAILABLE_MODELS['openai'][0].id } })}
                                            className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all duration-300 ${config.inference.provider === 'openai' ? 'bg-[#0E0E12] border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-surface border-transparent hover:border-white/10 hover:bg-[#0E0E12]'}`}
                                        >
                                            <OpenAILogo className={`w-8 h-8 mb-3 ${config.inference.provider === 'openai' ? 'text-green-500' : 'text-text-subtle opacity-50'}`} />
                                            <span className={`text-sm font-bold ${config.inference.provider === 'openai' ? 'text-white' : 'text-text-subtle'}`}>OpenAI</span>
                                            {config.inference.provider === 'openai' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500"></div>}
                                        </button>

                                        <button
                                            onClick={() => updateConfig({ inference: { ...config.inference, provider: 'ollama', model: AVAILABLE_MODELS['ollama'][0].id } })}
                                            className={`relative flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all duration-300 ${config.inference.provider === 'ollama' ? 'bg-[#0E0E12] border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-surface border-transparent hover:border-white/10 hover:bg-[#0E0E12]'}`}
                                        >
                                            <OllamaLogo className={`w-8 h-8 mb-3 ${config.inference.provider === 'ollama' ? 'text-orange-500' : 'text-text-subtle opacity-50'}`} />
                                            <span className={`text-sm font-bold ${config.inference.provider === 'ollama' ? 'text-orange-500' : 'text-text-subtle'}`}>Ollama</span>
                                            {config.inference.provider === 'ollama' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500"></div>}
                                        </button>
                                    </div>
                                </div>

                                {/* Model Dropdown */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-subtle uppercase tracking-wider block">Target Model</label>
                                    <div className="relative">
                                        <select
                                            value={config.inference.model}
                                            onChange={(e) => updateConfig({ inference: { ...config.inference, model: e.target.value } })}
                                            className="w-full bg-[#0E0E12] border border-white/10 rounded-xl pl-5 pr-10 py-4 text-white appearance-none focus:border-pink-500/50 focus:outline-none transition-colors font-medium text-sm"
                                        >
                                            {AVAILABLE_MODELS[config.inference.provider].map((model) => (
                                                <option key={model.id} value={model.id}>{model.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle">
                                            <Cpu className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Temperature & Info */}
                            <div className="space-y-8">
                                {/* Temperature Slider */}
                                <div className="bg-[#0E0E12] border border-white/10 rounded-xl p-6 space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Temperature</label>
                                            <span className="text-xs text-text-subtle opacity-70">Controls randomness vs determinism</span>
                                        </div>
                                        <div className="px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20">
                                            <span className="text-lg font-mono font-bold text-pink-500">{config.inference.temperature.toFixed(1)}</span>
                                        </div>
                                    </div>

                                    <div className="relative pt-2 pb-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={config.inference.temperature}
                                            onChange={(e) => updateConfig({ inference: { ...config.inference, temperature: parseFloat(e.target.value) } })}
                                            className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                                        />
                                        <div className="flex justify-between mt-3 text-[10px] text-text-subtle font-mono uppercase tracking-widest">
                                            <span>Precise</span>
                                            <span>Balanced</span>
                                            <span>Creative</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contextual Info Box */}
                                {config.inference.provider === 'ollama' && (
                                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-5 flex gap-3 items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                                        <p className="text-xs text-orange-200/80 leading-relaxed">
                                            Running locally via <strong>Ollama</strong> on port <code>11434</code>. Ensure your local instance allows cross-origin requests from this domain.
                                        </p>
                                    </div>
                                )}
                                {config.inference.provider !== 'ollama' && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-3 items-start">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/50 mt-1.5 shrink-0"></div>
                                        <p className="text-xs text-text-subtle leading-relaxed">
                                            API keys for cloud providers are managed in the <strong>Secrets Manager</strong>. Ensure your account has sufficient credits for {config.inference.model}.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default NotebookSettings;