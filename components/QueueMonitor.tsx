import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Cpu, Database, Clock, AlertTriangle, CheckCircle2, TrendingUp, Loader2, HardDrive, MemoryStick, Wifi, Server, RefreshCw } from 'lucide-react';

interface QueueMonitorProps { }

interface QueueMetrics {
    system?: {
        disk: { total: string; used: string; available: string; percentage: number };
        ram: { total: number; used: number; free: number; percentage: number };
        cpu: { usage: number };
    };
    docker?: {
        containers: Array<{
            name: string;
            cpu: string;
            memUsage: string;
            memPercent: string;
            netIO: string;
            blockIO: string;
            pids: string;
            status: string;
        }>;
        images: Array<{ name: string; size: string }>;
        totalContainers: number;
        totalImages: number;
        totalImageSize: string;
    };
    redisQueues?: {
        queues: {
            waiting: number;
            active: number;
            completed: number;
            failed: number;
            delayed: number;
            paused: number;
            total: number;
        };
        memoryPerQueue: Record<string, number>;
    };
    redis?: {
        memory: { used: string; peak: string; fragmentation: string };
        performance: { opsPerSec: number; hitRate: number; connectedClients: number };
        version: string;
        uptime: string;
    };
    workerDetails?: {
        workers: Array<{
            name: string;
            status: string;
            cpu: number;
            memoryRSS: string;
            uptime: string;
        }>;
        count: number;
        avgCpu: number;
    };
    jobs?: Array<{
        id: string;
        workflowName: string;
        startedAt: number;
        duration: number;
        attempts: number;
    }>;
    n8n?: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        workers: number;
    };
    postgresql?: {
        memory: string;
        cpu: string;
        dbSize: string;
        connections: number;
    };
    alerts?: Array<{ severity: string; message: string; type: string }>;
}

const QueueMonitor: React.FC<QueueMonitorProps> = () => {
    const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3001/ws/logs');

        ws.onopen = () => {
            console.log('✅ Queue Monitor WebSocket connected');
            setIsMonitoring(true);
            ws.send(JSON.stringify({ action: 'start_monitoring' }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                setMetrics(data.data);
                setLastUpdate(new Date());
            }
        };

        ws.onerror = () => setIsMonitoring(false);
        ws.onclose = () => setIsMonitoring(false);

        wsRef.current = ws;

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'stop_monitoring' }));
                wsRef.current.close();
            }
        };
    }, []);

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    };

    const getStatusColor = (value: number, warning: number, critical: number) => {
        if (value >= critical) return 'text-red-400';
        if (value >= warning) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    // Use empty defaults so dashboard always shows
    const sys = metrics?.system;
    const queues = metrics?.redisQueues?.queues || metrics?.n8n;
    const redis = metrics?.redis;
    const pg = metrics?.postgresql;
    const workers = metrics?.workerDetails;
    const docker = metrics?.docker;
    const jobs = metrics?.jobs || [];
    const alerts = metrics?.alerts || [];

    return (
        <div className="flex flex-col h-full relative overflow-hidden animate-fade-in">
            {/* Background */}
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.15) blur(3px)' }}>
                <source src="/Whisk_eznyugozewolrjmj1sm1ctytimzzqtlyutny0sm.webm" type="video/webm" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/75 to-black/85"></div>

            <div className="relative z-10 flex flex-col h-full p-6 overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="bg-[#0A0A0F]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">N8N Queue Monitor</h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {isMonitoring && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></span>
                                            <span className="text-xs font-bold text-emerald-400">LIVE</span>
                                        </div>
                                    )}
                                    {lastUpdate && <span className="text-xs text-text-subtle">Updated: {lastUpdate.toLocaleTimeString()}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-subtle">
                            <RefreshCw className="w-3 h-3" />
                            <span>5s</span>
                        </div>
                    </div>
                </div>

                {/* Always show dashboard */}
                <div className="space-y-4">
                    {/* System Overview */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <Cpu className="w-4 h-4 text-green-400" />
                                <span className={`text-lg font-bold ${getStatusColor(sys?.cpu?.usage || 0, 70, 90)}`}>{sys?.cpu?.usage?.toFixed(1) || '--'}%</span>
                            </div>
                            <div className="text-xs text-text-subtle">CPU</div>
                            <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                                <div className="bg-green-500 h-1 rounded-full" style={{ width: `${sys?.cpu?.usage || 0}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <MemoryStick className="w-4 h-4 text-purple-400" />
                                <span className={`text-lg font-bold ${getStatusColor(sys?.ram?.percentage || 0, 70, 85)}`}>{sys?.ram?.percentage || '--'}%</span>
                            </div>
                            <div className="text-xs text-text-subtle">RAM</div>
                            <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                                <div className="bg-purple-500 h-1 rounded-full" style={{ width: `${sys?.ram?.percentage || 0}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <HardDrive className="w-4 h-4 text-blue-400" />
                                <span className={`text-lg font-bold ${getStatusColor(sys?.disk?.percentage || 0, 75, 90)}`}>{sys?.disk?.percentage || '--'}%</span>
                            </div>
                            <div className="text-xs text-text-subtle">Disk</div>
                            <div className="w-full bg-white/10 rounded-full h-1 mt-1.5">
                                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${sys?.disk?.percentage || 0}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <Server className="w-4 h-4 text-cyan-400" />
                                <span className="text-lg font-bold text-cyan-400">{workers?.count || '--'}</span>
                            </div>
                            <div className="text-xs text-text-subtle">Workers</div>
                        </div>
                    </div>

                    {/* Queue Status */}
                    <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4 text-orange-400" />Queue Status
                        </h3>
                        <div className="grid grid-cols-6 gap-2">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                                <Clock className="w-3 h-3 text-yellow-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-yellow-400">{queues?.waiting ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Waiting</div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                                <Zap className="w-3 h-3 text-blue-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-blue-400">{queues?.active ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Active</div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-emerald-400">{queues?.completed ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Done</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                                <AlertTriangle className="w-3 h-3 text-red-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-red-400">{queues?.failed ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Failed</div>
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center">
                                <TrendingUp className="w-3 h-3 text-purple-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-purple-400">{metrics?.redisQueues?.queues?.delayed ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Delayed</div>
                            </div>
                            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2 text-center">
                                <Database className="w-3 h-3 text-gray-400 mx-auto mb-1" />
                                <div className="text-xl font-bold text-gray-400">{metrics?.redisQueues?.queues?.paused ?? '--'}</div>
                                <div className="text-xs text-text-subtle">Paused</div>
                            </div>
                        </div>
                    </div>

                    {/* Redis & PostgreSQL */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4 text-red-400" />Redis
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Memory:</span> <span className="text-white">{redis?.memory?.used || '--'}</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Peak:</span> <span className="text-white">{redis?.memory?.peak || '--'}</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Ops/s:</span> <span className="text-cyan-400">{redis?.performance?.opsPerSec ?? '--'}</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Clients:</span> <span className="text-white">{redis?.performance?.connectedClients ?? '--'}</span></div>
                            </div>
                        </div>
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4 text-blue-400" />PostgreSQL
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Memory:</span> <span className="text-white">{pg?.memory || '--'}</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">CPU:</span> <span className="text-white">{pg?.cpu || '--'}%</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Size:</span> <span className="text-cyan-400">{pg?.dbSize || '--'}</span></div>
                                <div className="bg-white/5 rounded p-2"><span className="text-text-subtle">Conns:</span> <span className="text-white">{pg?.connections ?? '--'}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Workers */}
                    <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-cyan-400" />Workers ({workers?.count || 0})
                        </h3>
                        {workers?.workers && workers.workers.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {workers.workers.map((w, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/5">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-white truncate">{w.name}</span>
                                            <span className={`text-xs px-1 py-0.5 rounded ${w.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>{w.status}</span>
                                        </div>
                                        <div className="text-xs space-y-0.5 text-text-subtle">
                                            <div>CPU: <span className={getStatusColor(w.cpu, 50, 80)}>{w.cpu.toFixed(1)}%</span></div>
                                            <div>Mem: <span className="text-white">{w.memoryRSS}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-text-subtle text-center py-3">Waiting for worker data...</div>
                        )}
                    </div>

                    {/* Docker */}
                    <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400" />Containers ({docker?.containers?.length || 0})
                        </h3>
                        {docker?.containers && docker.containers.length > 0 ? (
                            <table className="w-full text-xs">
                                <thead><tr className="border-b border-white/10 text-text-subtle">
                                    <th className="pb-2 text-left">Name</th><th className="pb-2 text-left">CPU</th><th className="pb-2 text-left">Memory</th><th className="pb-2 text-left">Net I/O</th>
                                </tr></thead>
                                <tbody className="divide-y divide-white/5">
                                    {docker.containers.map((c, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            <td className="py-1.5 text-white">{c.name}</td>
                                            <td className="py-1.5 text-cyan-400">{c.cpu}%</td>
                                            <td className="py-1.5 text-purple-400">{c.memUsage}</td>
                                            <td className="py-1.5 text-text-subtle">{c.netIO}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-xs text-text-subtle text-center py-3">Waiting for container data...</div>
                        )}
                    </div>

                    {/* Docker Images */}
                    <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-purple-400" />Images ({docker?.totalImages || 0})
                            </span>
                            <span className="text-xs font-normal text-purple-400">Total: {docker?.totalImageSize || '--'}</span>
                        </h3>
                        {docker?.images && docker.images.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {docker.images.map((img, i) => (
                                    <div key={i} className="bg-white/5 rounded p-2 flex justify-between items-center text-xs">
                                        <span className="text-white truncate max-w-[150px]" title={img.name}>{img.name}</span>
                                        <span className="text-purple-400 font-mono">{img.size}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-text-subtle text-center py-3">Waiting for image data...</div>
                        )}
                    </div>

                    {/* Alerts */}
                    {alerts.length > 0 && (
                        <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-red-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />Alerts ({alerts.length})
                            </h3>
                            <div className="space-y-1">
                                {alerts.map((a, i) => (
                                    <div key={i} className={`flex items-center gap-2 p-2 rounded text-xs ${a.severity === 'error' ? 'bg-red-500/10 text-red-400' : a.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        <AlertTriangle className="w-3 h-3" />{a.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QueueMonitor;
