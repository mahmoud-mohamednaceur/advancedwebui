import React from 'react';
import { Database, Clock, Zap, CheckCircle2, AlertTriangle, TrendingUp, Activity, HardDrive, Users } from 'lucide-react';
import { RedisMetrics, RedisQueueMetrics } from '../../types/monitoring';

interface RedisPageProps {
    redis?: RedisMetrics;
    redisQueues?: RedisQueueMetrics;
}

const RedisPage: React.FC<RedisPageProps> = ({ redis, redisQueues }) => {
    const queues = redisQueues?.queues;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Redis Stats Overview */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{redis?.memory?.used || '--'}</div>
                            <div className="text-xs text-text-subtle">Memory Used</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cyan-400">{redis?.performance?.opsPerSec ?? '--'}</div>
                            <div className="text-xs text-text-subtle">Ops/sec</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">{redis?.performance?.hitRate || 0}%</div>
                            <div className="text-xs text-text-subtle">Hit Rate</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{redis?.performance?.connectedClients ?? '--'}</div>
                            <div className="text-xs text-text-subtle">Clients</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Status - Full Width */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-orange-400" />
                    BullMQ Queue Status
                </h3>
                <div className="grid grid-cols-6 gap-3">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center group hover:bg-yellow-500/20 transition-all">
                        <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-yellow-400">{queues?.waiting ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Waiting</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center group hover:bg-blue-500/20 transition-all">
                        <Zap className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-blue-400">{queues?.active ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Active</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center group hover:bg-emerald-500/20 transition-all">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-emerald-400">{queues?.completed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Completed</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center group hover:bg-red-500/20 transition-all">
                        <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-red-400">{queues?.failed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Failed</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center group hover:bg-purple-500/20 transition-all">
                        <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-purple-400">{queues?.delayed ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Delayed</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 text-center group hover:bg-gray-500/20 transition-all">
                        <Database className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-gray-400">{queues?.paused ?? '--'}</div>
                        <div className="text-xs text-text-subtle mt-1">Paused</div>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-text-subtle">Total Queue Size</span>
                    <span className="text-lg font-bold text-white">{queues?.total ?? '--'} jobs</span>
                </div>
            </div>

            {/* Redis Info and Memory */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-red-400" />
                        Redis Server Info
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Version</span>
                            <span className="text-white font-bold">{redis?.version || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Uptime</span>
                            <span className="text-emerald-400 font-bold">{redis?.uptime || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Status</span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-emerald-400 font-bold">Running</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Connected Clients</span>
                            <span className="text-cyan-400 font-bold">{redis?.performance?.connectedClients ?? '--'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-purple-400" />
                        Memory Statistics
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Memory Used</span>
                            <span className="text-purple-400 font-bold">{redis?.memory?.used || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Peak Memory</span>
                            <span className="text-white font-bold">{redis?.memory?.peak || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Fragmentation</span>
                            <span className="text-white font-bold">{redis?.memory?.fragmentation || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Hit Rate</span>
                            <span className="text-emerald-400 font-bold">{redis?.performance?.hitRate || 0}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RedisPage;
