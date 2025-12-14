import React from 'react';
import { Cpu, MemoryStick, HardDrive, Server, Database, Clock, Zap, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { ServerMetrics } from '../../types/monitoring';

interface OverviewPageProps {
    metrics: ServerMetrics | null;
}

const getStatusColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'text-red-400';
    if (value >= warning) return 'text-yellow-400';
    return 'text-emerald-400';
};

const OverviewPage: React.FC<OverviewPageProps> = ({ metrics }) => {
    const sys = metrics?.system;
    const queues = metrics?.redisQueues?.queues || metrics?.n8n;
    const redis = metrics?.redis;
    const pg = metrics?.postgresql;
    const workers = metrics?.workerDetails;
    const docker = metrics?.docker;
    const alerts = metrics?.alerts || [];

    return (
        <div className="space-y-4 animate-fade-in">
            {/* System Overview */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Cpu className="w-5 h-5 text-green-400" />
                        <span className={`text-2xl font-bold ${getStatusColor(sys?.cpu?.usage || 0, 70, 90)}`}>
                            {sys?.cpu?.usage?.toFixed(1) || '--'}%
                        </span>
                    </div>
                    <div className="text-sm text-text-subtle">CPU Usage</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sys?.cpu?.usage || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <MemoryStick className="w-5 h-5 text-purple-400" />
                        <span className={`text-2xl font-bold ${getStatusColor(sys?.ram?.percentage || 0, 70, 85)}`}>
                            {sys?.ram?.percentage || '--'}%
                        </span>
                    </div>
                    <div className="text-sm text-text-subtle">RAM Usage</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sys?.ram?.percentage || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <HardDrive className="w-5 h-5 text-blue-400" />
                        <span className={`text-2xl font-bold ${getStatusColor(sys?.disk?.percentage || 0, 75, 90)}`}>
                            {sys?.disk?.percentage || '--'}%
                        </span>
                    </div>
                    <div className="text-sm text-text-subtle">Disk Usage</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${sys?.disk?.percentage || 0}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Server className="w-5 h-5 text-cyan-400" />
                        <span className="text-2xl font-bold text-cyan-400">{workers?.count || docker?.totalContainers || '--'}</span>
                    </div>
                    <div className="text-sm text-text-subtle">Active Workers</div>
                    <div className="text-xs text-text-subtle/60 mt-2">
                        {docker?.totalContainers || 0} containers
                    </div>
                </div>
            </div>

            {/* Queue Status */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-400" />
                    Queue Status
                </h3>
                <div className="grid grid-cols-6 gap-3">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                        <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-yellow-400">{queues?.waiting ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Waiting</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                        <Zap className="w-4 h-4 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-400">{queues?.active ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Active</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-emerald-400">{queues?.completed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Completed</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                        <AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-400">{queues?.failed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Failed</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                        <TrendingUp className="w-4 h-4 text-purple-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-400">{queues?.delayed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Delayed</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 text-center">
                        <Database className="w-4 h-4 text-gray-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-400">{queues?.paused ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Paused</div>
                    </div>
                </div>
            </div>

            {/* Redis & PostgreSQL */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-red-400" />
                        Redis
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Memory Used</div>
                            <div className="text-lg font-bold text-white">{redis?.memory?.used || '--'}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Memory Peak</div>
                            <div className="text-lg font-bold text-white">{redis?.memory?.peak || '--'}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Ops/sec</div>
                            <div className="text-lg font-bold text-cyan-400">{redis?.performance?.opsPerSec ?? '--'}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Clients</div>
                            <div className="text-lg font-bold text-white">{redis?.performance?.connectedClients ?? '--'}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        PostgreSQL
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Memory</div>
                            <div className="text-lg font-bold text-white">{pg?.memory || '--'}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">CPU</div>
                            <div className="text-lg font-bold text-white">{pg?.cpu || '--'}%</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">DB Size</div>
                            <div className="text-lg font-bold text-cyan-400">{pg?.dbSize || '--'}</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                            <div className="text-xs text-text-subtle mb-1">Connections</div>
                            <div className="text-lg font-bold text-white">{pg?.connections ?? '--'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workers Grid */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Workers ({workers?.count || 0})
                </h3>
                {workers?.workers && workers.workers.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                        {workers.workers.map((w, i) => (
                            <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-bold text-white truncate">{w.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'running'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {w.status}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-text-subtle">CPU:</span>
                                        <span className={getStatusColor(w.cpu, 50, 80)}>{w.cpu.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-subtle">Memory:</span>
                                        <span className="text-white">{w.memoryRSS}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-subtle">Uptime:</span>
                                        <span className="text-text-subtle">{w.uptime}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-text-subtle text-center py-6">Waiting for worker data...</div>
                )}
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-red-500/20 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Alerts ({alerts.length})
                    </h3>
                    <div className="space-y-2">
                        {alerts.map((alert, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3 p-3 rounded-lg text-sm ${alert.severity === 'error'
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        : alert.severity === 'warning'
                                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    }`}
                            >
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {alert.message}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverviewPage;
