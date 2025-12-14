import React, { useState, useEffect, useRef } from 'react';
import { Server, Activity, Loader2, Wifi, X, Database, HardDrive, Cpu, MemoryStick, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import Button from './ui/Button';

interface Metrics {
    system: {
        disk: { total: string; used: string; available: string; percentage: number };
        ram: { total: number; used: number; free: number; percentage: number };
        cpu: { usage: number };
    } | null;
    docker: {
        system: any;
        containers: Array<{
            name: string;
            cpu: string;
            memUsage: string;
            netIO: string;
            blockIO: string;
            status: string;
        }>;
    } | null;
    n8n: {
        mainStatus: string;
        workers: number;
        queueLength: number;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        processingRate: number;
    } | null;
    postgresql: {
        status: string;
        memory: string;
        cpu: string;
        dbSize: string;
        connections: { active: number; max: number };
    } | null;
    redis: {
        status: string;
        memory: { used: string; peak: string };
        clients: number;
        opsPerSec: number;
        keyspace: number;
    } | null;
    alerts: Array<{
        severity: 'error' | 'warning' | 'info';
        message: string;
        type: string;
    }>;
}

const ServerMonitor: React.FC = () => {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const connectWebSocket = () => {
        setIsConnecting(true);
        const ws = new WebSocket('ws://localhost:3001/ws/logs');

        ws.onopen = () => {
            console.log('✅ WebSocket connected');
            setIsMonitoring(true);
            setIsConnecting(false);
            // Start monitoring
            ws.send(JSON.stringify({ action: 'start_monitoring' }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') {
                setMetrics(data.data);
            } else if (data.type === 'error') {
                console.error('Metrics error:', data.message);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setIsConnecting(false);
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            setIsMonitoring(false);
            setIsConnecting(false);
        };

        wsRef.current = ws;
    };

    const disconnectWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ action: 'stop_monitoring' }));
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsMonitoring(false);
        setMetrics(null);
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden animate-fade-in">

            {/* WebM Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.15) blur(3px)' }}
            >
                <source src="/Whisk_eznyugozewolrjmj1sm1ctytimzzqtlyutny0sm.webm" type="video/webm" />
            </video>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/75 to-black/85"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-8 overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 mb-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                                <Server className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">System Monitoring Dashboard</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-text-subtle">Connected to: </span>
                                    <span className="text-sm font-mono text-cyan-400">49.13.142.226</span>
                                    {isMonitoring && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></span>
                                            <span className="text-xs font-bold text-emerald-400">LIVE</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            {!isMonitoring ? (
                                <Button
                                    variant="primary"
                                    onClick={connectWebSocket}
                                    disabled={isConnecting}
                                    className="!h-11 shadow-neon-primary rounded-xl"
                                >
                                    {isConnecting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Wifi className="w-4 h-4 mr-2" />
                                            Start Monitoring
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={disconnectWebSocket}
                                    className="!h-11 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Stop
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {metrics ? (
                    <>
                        {/* System Overview */}
                        <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                System Overview
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Disk */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <HardDrive className="w-5 h-5 text-blue-400" />
                                        <span className="text-2xl font-bold text-white">{metrics.system?.disk.percentage}%</span>
                                    </div>
                                    <div className="text-sm font-bold text-white mb-1">Disk Usage</div>
                                    <div className="text-xs text-text-subtle">{metrics.system?.disk.used}G / {metrics.system?.disk.total}G</div>
                                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full" style={{ width: `${metrics.system?.disk.percentage}%` }}></div>
                                    </div>
                                </div>

                                {/* RAM */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <MemoryStick className="w-5 h-5 text-purple-400" />
                                        <span className="text-2xl font-bold text-white">{metrics.system?.ram.percentage}%</span>
                                    </div>
                                    <div className="text-sm font-bold text-white mb-1">RAM Usage</div>
                                    <div className="text-xs text-text-subtle">{metrics.system?.ram.used}MB / {metrics.system?.ram.total}MB</div>
                                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                                        <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full" style={{ width: `${metrics.system?.ram.percentage}%` }}></div>
                                    </div>
                                </div>

                                {/* CPU */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <Cpu className="w-5 h-5 text-green-400" />
                                        <span className="text-2xl font-bold text-white">{metrics.system?.cpu.usage.toFixed(1)}%</span>
                                    </div>
                                    <div className="text-sm font-bold text-white mb-1">CPU Usage</div>
                                    <div className="text-xs text-text-subtle">Real-time</div>
                                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{ width: `${metrics.system?.cpu.usage}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Running Containers */}
                        {metrics.docker?.containers && metrics.docker.containers.length > 0 && (
                            <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Server className="w-5 h-5 text-cyan-400" />
                                    Running Containers
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="text-left text-xs font-bold text-text-subtle uppercase tracking-wider py-3 px-4">Container</th>
                                                <th className="text-left text-xs font-bold text-text-subtle uppercase tracking-wider py-3 px-4">CPU</th>
                                                <th className="text-left text-xs font-bold text-text-subtle uppercase tracking-wider py-3 px-4">Memory</th>
                                                <th className="text-left text-xs font-bold text-text-subtle uppercase tracking-wider py-3 px-4">Network I/O</th>
                                                <th className="text-left text-xs font-bold text-text-subtle uppercase tracking-wider py-3 px-4">Block I/O</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.docker.containers.map((container, idx) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 px-4 text-sm font-mono text-white">{container.name}</td>
                                                    <td className="py-3 px-4 text-sm text-cyan-400">{container.cpu}%</td>
                                                    <td className="py-3 px-4 text-sm text-purple-400">{container.memUsage}</td>
                                                    <td className="py-3 px-4 text-sm text-text-subtle">{container.netIO}</td>
                                                    <td className="py-3 px-4 text-sm text-text-subtle">{container.blockIO}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* N8N Queue Metrics */}
                        {metrics.n8n && (
                            <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 mb-6 shadow-xl">
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-orange-400" />
                                    N8N Queue Mode Monitoring
                                </h2>
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">Main Instance</div>
                                        <div className="text-2xl font-bold text-emerald-400">Running</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">Active Workers</div>
                                        <div className="text-2xl font-bold text-white">{metrics.n8n.workers}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">Queue Length</div>
                                        <div className="text-2xl font-bold text-cyan-400">{metrics.n8n.queueLength}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">Processing Rate</div>
                                        <div className="text-2xl font-bold text-purple-400">{metrics.n8n.processingRate}/min</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">⏳ Waiting</div>
                                        <div className="text-xl font-bold text-yellow-400">{metrics.n8n.waiting}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">▶️ Active</div>
                                        <div className="text-xl font-bold text-blue-400">{metrics.n8n.active}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">✅ Completed/h</div>
                                        <div className="text-xl font-bold text-emerald-400">{metrics.n8n.completed}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="text-xs text-text-subtle mb-1">❌ Failed/h</div>
                                        <div className="text-xl font-bold text-red-400">{metrics.n8n.failed}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Database Metrics */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            {/* PostgreSQL */}
                            {metrics.postgresql && (
                                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Database className="w-5 h-5 text-blue-400" />
                                        PostgreSQL
                                    </h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Status</span>
                                            <span className="text-sm font-bold text-emerald-400">Running</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Memory</span>
                                            <span className="text-sm font-mono text-white">{metrics.postgresql.memory}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">CPU Usage</span>
                                            <span className="text-sm font-mono text-cyan-400">{metrics.postgresql.cpu}%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">DB Size</span>
                                            <span className="text-sm font-mono text-white">{metrics.postgresql.dbSize}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Connections</span>
                                            <span className="text-sm font-mono text-white">{metrics.postgresql.connections.active}/{metrics.postgresql.connections.max}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Redis */}
                            {metrics.redis && (
                                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl">
                                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <Database className="w-5 h-5 text-red-400" />
                                        Redis
                                    </h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Status</span>
                                            <span className="text-sm font-bold text-emerald-400">Running</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Memory Used</span>
                                            <span className="text-sm font-mono text-white">{metrics.redis.memory.used}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Peak Memory</span>
                                            <span className="text-sm font-mono text-text-subtle">{metrics.redis.memory.peak}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Connected Clients</span>
                                            <span className="text-sm font-mono text-cyan-400">{metrics.redis.clients}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Ops/Second</span>
                                            <span className="text-sm font-mono text-purple-400">{metrics.redis.opsPerSec?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-text-subtle">Total Keys</span>
                                            <span className="text-sm font-mono text-white">{metrics.redis.keyspace?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Health Alerts */}
                        {metrics.alerts && metrics.alerts.length > 0 && (
                            <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                    Health Alerts
                                </h2>
                                <div className="space-y-2">
                                    {metrics.alerts.map((alert, idx) => (
                                        <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'error' ? 'bg-red-500/10 border-red-500/20' : alert.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                            {alert.severity === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                                            {alert.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
                                            {alert.severity === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                                            <div className="flex-1">
                                                <div className={`text-sm font-medium ${alert.severity === 'error' ? 'text-red-400' : alert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                    {alert.message}
                                                </div>
                                                <div className="text-xs text-text-subtle mt-1">Type: {alert.type}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                            <Server className="w-10 h-10 text-text-subtle" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Not Monitoring</h3>
                        <p className="text-sm text-text-subtle max-w-md text-center">
                            Click "Start Monitoring" to begin collecting real-time metrics from your server.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServerMonitor;
