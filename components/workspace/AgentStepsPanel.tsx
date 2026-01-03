import React, { useState } from 'react';
import {
    ChevronDown, ChevronRight, Check, X, Database, Search,
    Code, Play, FileText, Copy, CheckCheck, AlertCircle,
    Zap, Clock, Table
} from 'lucide-react';

interface ToolCall {
    tool: string;
    input: any;
    success: boolean;
    output?: any;
}

interface AgentMetadata {
    tool_calls?: ToolCall[];
    sql_executed?: string;
    query_results?: any;
    datasets_discovered?: Array<{ file_id: string; file_name: string }>;
    timestamp?: string;
}

interface AgentStepsPanelProps {
    metadata: AgentMetadata;
    isExpanded?: boolean;
}

const AgentStepsPanel: React.FC<AgentStepsPanelProps> = ({
    metadata,
    isExpanded: initialExpanded = false
}) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [copiedSql, setCopiedSql] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

    const { tool_calls, sql_executed, query_results, datasets_discovered } = metadata;

    // Don't render if no meaningful data
    if (!tool_calls?.length && !sql_executed) {
        return null;
    }

    const handleCopySql = async () => {
        if (sql_executed) {
            await navigator.clipboard.writeText(sql_executed);
            setCopiedSql(true);
            setTimeout(() => setCopiedSql(false), 2000);
        }
    };

    const toggleStep = (index: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedSteps(newExpanded);
    };

    const getToolIcon = (toolName: string) => {
        const name = toolName.toLowerCase();
        if (name.includes('discover') || name.includes('dataset') || name.includes('refresh')) {
            return <Search className="w-3.5 h-3.5" />;
        }
        if (name.includes('sql') || name.includes('query') || name.includes('execute')) {
            return <Database className="w-3.5 h-3.5" />;
        }
        if (name.includes('preview') || name.includes('sample')) {
            return <Table className="w-3.5 h-3.5" />;
        }
        return <Zap className="w-3.5 h-3.5" />;
    };

    const formatToolName = (name: string) => {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getResultSummary = () => {
        if (!query_results) return null;

        if (Array.isArray(query_results)) {
            return `${query_results.length} row${query_results.length !== 1 ? 's' : ''} returned`;
        }
        if (typeof query_results === 'object') {
            const keys = Object.keys(query_results);
            return `${keys.length} field${keys.length !== 1 ? 's' : ''} returned`;
        }
        return 'Query completed';
    };

    return (
        <div className="mt-3 animate-fade-in">
            {/* Collapse/Expand Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 w-full"
            >
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs font-bold text-white/80 group-hover:text-white">
                    Agent Actions
                </span>
                <span className="text-[10px] text-text-subtle bg-white/5 px-2 py-0.5 rounded-full">
                    {tool_calls?.length || 0} step{(tool_calls?.length || 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex-1" />
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-text-subtle" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-text-subtle" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-2 space-y-2 animate-fade-in">
                    {/* Tool Calls */}
                    {tool_calls?.map((call, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-white/10 overflow-hidden bg-black/20"
                        >
                            {/* Step Header */}
                            <button
                                onClick={() => toggleStep(index)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors"
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${call.success
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {call.success ? (
                                        <Check className="w-3 h-3" />
                                    ) : (
                                        <X className="w-3 h-3" />
                                    )}
                                </div>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${call.success ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                    {getToolIcon(call.tool)}
                                </div>
                                <span className="text-xs font-medium text-white/90">
                                    {formatToolName(call.tool)}
                                </span>
                                <div className="flex-1" />
                                {expandedSteps.has(index) ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-text-subtle" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-text-subtle" />
                                )}
                            </button>

                            {/* Step Details */}
                            {expandedSteps.has(index) && (
                                <div className="px-3 pb-3 space-y-2 animate-fade-in border-t border-white/5 mt-1 pt-2">
                                    {/* SQL Query Display */}
                                    {call.tool.toLowerCase().includes('sql') && call.input?.sql_query && (
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">
                                                    SQL Query
                                                </span>
                                                <button
                                                    onClick={handleCopySql}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-subtle hover:text-white hover:bg-white/10 transition-colors"
                                                >
                                                    {copiedSql ? (
                                                        <>
                                                            <CheckCheck className="w-3 h-3 text-emerald-400" />
                                                            <span className="text-emerald-400">Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" />
                                                            <span>Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-emerald-300 font-mono overflow-x-auto custom-scrollbar">
                                                {call.input.sql_query}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Datasets Discovered */}
                                    {call.tool.toLowerCase().includes('discover') && datasets_discovered && (
                                        <div>
                                            <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">
                                                Datasets Found
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {datasets_discovered.map((ds, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10"
                                                    >
                                                        <FileText className="w-3 h-3 text-primary" />
                                                        <span className="text-[11px] text-white/80">
                                                            {ds.file_name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Query Results Summary */}
                    {query_results && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <Table className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-medium">
                                {getResultSummary()}
                            </span>
                        </div>
                    )}

                    {/* Standalone SQL Display (if not in tool_calls) */}
                    {sql_executed && !tool_calls?.some(c => c.input?.sql_query) && (
                        <div className="rounded-lg border border-white/10 overflow-hidden bg-black/20 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-white/80">
                                        Executed Query
                                    </span>
                                </div>
                                <button
                                    onClick={handleCopySql}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-text-subtle hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    {copiedSql ? (
                                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                            <pre className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-emerald-300 font-mono overflow-x-auto custom-scrollbar">
                                {sql_executed}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AgentStepsPanel;
