import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    FileText,
    Layers,
    RefreshCw,
    Clock,
    AlertCircle,
    CheckCircle2,
    Copy,
    Database,
    Loader2,
    File,
    Table2,
    FileType,
    XCircle
} from 'lucide-react';
import { NotebookConfig } from '../../config';

// Single webhook endpoint
const MONITOR_URL = 'https://n8nserver.sportnavi.de/webhook/36907c26-cd49-4578-abe2-2e5d5933a687-notebook-monitor';

interface NotebookMonitorProps {
    notebookId: string;
    notebookName: string;
    config?: NotebookConfig;
}

interface FileInfo {
    file_id: string;
    file_name: string;
    file_type: string;
    chunks: number;
    status: 'ready' | 'processing' | 'failed' | 'no_chunks';
}

interface MonitorData {
    notebook_id: string;
    notebook_title: string;
    created_at: string;
    updated_at: string;
    total_files: number;
    structured_files: number;
    unstructured_files: number;
    total_chunks: number;
    completed_chunks: number;
    pending_chunks: number;
    failed_chunks: number;
    duplicate_count: number;
    total_vectors: number;
    notebook_status: 'ready' | 'processing' | 'has_errors' | 'empty';
    files: FileInfo[];
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
        'ready': { bg: 'bg-emerald-500/20 border-emerald-500/40', text: 'text-emerald-400', icon: CheckCircle2 },
        'processing': { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400', icon: Loader2 },
        'has_errors': { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', icon: XCircle },
        'failed': { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', icon: XCircle },
        'empty': { bg: 'bg-gray-500/20 border-gray-500/40', text: 'text-gray-400', icon: FileText },
        'no_chunks': { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-400', icon: AlertCircle }
    };
    const config = configs[status] || configs['ready'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.bg} ${config.text}`}>
            <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
            {status.replace('_', ' ').toUpperCase()}
        </span>
    );
};

// Metric card component
const MetricCard: React.FC<{
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
}> = ({ label, value, icon: Icon, color, subtitle }) => (
    <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-text-subtle uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white font-mono">{value}</p>
        {subtitle && <p className="text-xs text-text-subtle mt-1">{subtitle}</p>}
    </div>
);

const NotebookMonitor: React.FC<NotebookMonitorProps> = ({ notebookId, notebookName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<MonitorData | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(MONITOR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId })
            });

            if (!response.ok) throw new Error('Failed to fetch data');

            const result = await response.json();
            // Handle array or single object response
            const monitorData = Array.isArray(result) ? result[0] : result;
            setData(monitorData || null);
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [notebookId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-text-subtle">Loading monitor data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-600/30 border border-violet-500/30 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Notebook Monitor</h1>
                            <p className="text-sm text-text-subtle">{notebookName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {data && <StatusBadge status={data.notebook_status} />}
                        <button
                            onClick={() => fetchData(true)}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {lastRefresh && (
                    <p className="text-xs text-text-subtle mt-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </p>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-400">{error}</p>
                        <button onClick={() => fetchData(true)} className="ml-auto text-xs text-red-400 underline">Retry</button>
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* Main Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Total Files"
                                value={data.total_files}
                                icon={FileText}
                                color="bg-blue-500"
                            />
                            <MetricCard
                                label="Total Chunks"
                                value={data.total_chunks}
                                icon={Layers}
                                color="bg-emerald-500"
                                subtitle={data.pending_chunks > 0 ? `${data.pending_chunks} pending` : undefined}
                            />
                            <MetricCard
                                label="Duplicates"
                                value={data.duplicate_count}
                                icon={Copy}
                                color={data.duplicate_count > 0 ? "bg-amber-500" : "bg-gray-600"}
                            />
                            <MetricCard
                                label="Vectors"
                                value={data.total_vectors}
                                icon={Database}
                                color="bg-purple-500"
                            />
                        </div>

                        {/* File Type Distribution */}
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Data Types</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                    <Table2 className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-lg font-bold text-white font-mono">{data.structured_files}</p>
                                        <p className="text-xs text-text-subtle">Structured (Tabular)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                    <FileType className="w-5 h-5 text-violet-400" />
                                    <div>
                                        <p className="text-lg font-bold text-white font-mono">{data.unstructured_files}</p>
                                        <p className="text-xs text-text-subtle">Unstructured (Documents)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chunk Status */}
                        {(data.pending_chunks > 0 || data.failed_chunks > 0) && (
                            <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Chunk Status</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                                        <p className="text-xl font-bold text-emerald-400 font-mono">{data.completed_chunks}</p>
                                        <p className="text-xs text-text-subtle">Completed</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-blue-500/10">
                                        <p className="text-xl font-bold text-blue-400 font-mono">{data.pending_chunks}</p>
                                        <p className="text-xs text-text-subtle">Pending</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-red-500/10">
                                        <p className="text-xl font-bold text-red-400 font-mono">{data.failed_chunks}</p>
                                        <p className="text-xs text-text-subtle">Failed</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* File List */}
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/5">
                                <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Files ({data.files?.length || 0})</h3>
                            </div>

                            {(!data.files || data.files.length === 0) ? (
                                <div className="p-8 text-center">
                                    <File className="w-10 h-10 text-text-subtle mx-auto mb-2" />
                                    <p className="text-sm text-text-subtle">No files in this notebook</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {data.files.map((file, idx) => (
                                        <div key={file.file_id || idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {file.file_type === 'tabular' ? (
                                                    <Table2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                ) : (
                                                    <FileType className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                                )}
                                                <span className="text-sm text-white truncate">{file.file_name}</span>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <span className="text-xs text-text-subtle font-mono">{file.chunks} chunks</span>
                                                <StatusBadge status={file.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!data && !error && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Activity className="w-12 h-12 text-text-subtle mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No Data</h3>
                        <p className="text-sm text-text-subtle">No monitoring data available for this notebook.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotebookMonitor;
