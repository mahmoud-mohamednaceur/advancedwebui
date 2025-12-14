import React, { useState, useEffect, useRef } from 'react';
import { FileText, Filter, Search, AlertTriangle, Info, Bug, Server, Play, Pause, Trash2 } from 'lucide-react';

interface LogEntry {
    timestamp: string;
    service: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
}

const LogsPage: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const wsRef = useRef<WebSocket | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Generate some sample logs for demo
        const sampleLogs: LogEntry[] = [
            { timestamp: new Date().toISOString(), service: 'n8n', level: 'info', message: 'Workflow execution started: Invoice Processing' },
            { timestamp: new Date().toISOString(), service: 'n8n-worker-1', level: 'info', message: 'Processing job 12345' },
            { timestamp: new Date().toISOString(), service: 'redis', level: 'debug', message: 'Connected clients: 5' },
            { timestamp: new Date().toISOString(), service: 'n8n', level: 'warn', message: 'Rate limit approaching for API calls' },
            { timestamp: new Date().toISOString(), service: 'n8n-worker-2', level: 'info', message: 'Job completed successfully' },
        ];
        setLogs(sampleLogs);
    }, []);

    const startLogging = () => {
        const ws = new WebSocket('ws://localhost:3001/ws/logs');

        ws.onopen = () => {
            setIsStreaming(true);
            ws.send(JSON.stringify({ action: 'start_logs' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    const level = data.message.toLowerCase().includes('error') ? 'error'
                        : data.message.toLowerCase().includes('warn') ? 'warn'
                            : data.message.toLowerCase().includes('debug') ? 'debug'
                                : 'info';

                    setLogs(prev => [...prev.slice(-500), {
                        timestamp: data.timestamp,
                        service: data.service,
                        level,
                        message: data.message
                    }]);
                }
            } catch (e) {
                console.error('Failed to parse log:', e);
            }
        };

        ws.onclose = () => setIsStreaming(false);
        ws.onerror = () => setIsStreaming(false);

        wsRef.current = ws;
    };

    const stopLogging = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ action: 'stop_logs' }));
            wsRef.current.close();
        }
        setIsStreaming(false);
    };

    const clearLogs = () => setLogs([]);

    const filteredLogs = logs.filter(log => {
        if (filter !== 'all' && log.service !== filter && log.level !== filter) return false;
        if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const services = ['all', 'n8n', 'n8n-worker-1', 'n8n-worker-2', 'n8n-worker-3', 'n8n-worker-4', 'redis', 'postgres'];

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'warn': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'debug': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertTriangle className="w-3 h-3" />;
            case 'warn': return <AlertTriangle className="w-3 h-3" />;
            case 'debug': return <Bug className="w-3 h-3" />;
            default: return <Info className="w-3 h-3" />;
        }
    };

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            {/* Controls */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={isStreaming ? stopLogging : startLogging}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isStreaming
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                }`}
                        >
                            {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isStreaming ? 'Stop' : 'Start'} Streaming
                        </button>
                        <button
                            onClick={clearLogs}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-text-subtle border border-white/10 hover:bg-white/10 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-text-subtle focus:outline-none focus:border-primary/50 w-64"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-text-subtle" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                            >
                                {services.map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0F]">
                                        {s === 'all' ? 'All Services' : s}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-text-subtle text-sm">Total Logs</span>
                        <span className="text-white font-bold">{logs.length}</span>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-red-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-text-subtle text-sm">Errors</span>
                        <span className="text-red-400 font-bold">{logs.filter(l => l.level === 'error').length}</span>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-yellow-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-text-subtle text-sm">Warnings</span>
                        <span className="text-yellow-400 font-bold">{logs.filter(l => l.level === 'warn').length}</span>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-emerald-500/20 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-text-subtle text-sm">Streaming</span>
                        <span className={`font-bold ${isStreaming ? 'text-emerald-400' : 'text-text-subtle'}`}>
                            {isStreaming ? 'Active' : 'Stopped'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Log Feed */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Log Feed
                    {isStreaming && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2"></span>
                    )}
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs space-y-1">
                    {filteredLogs.length > 0 ? (
                        filteredLogs.map((log, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 p-2 rounded border ${getLevelColor(log.level)} hover:bg-white/5 transition-colors`}
                            >
                                <span className="shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>
                                <span className="text-text-subtle shrink-0 w-48">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="text-cyan-400 shrink-0 w-32 truncate">
                                    [{log.service}]
                                </span>
                                <span className="text-white flex-1 break-all">{log.message}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-text-subtle">
                            No logs to display. Click "Start Streaming" to begin.
                        </div>
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

export default LogsPage;
