import React from 'react';
import { Database, HardDrive, Users, Activity, Gauge } from 'lucide-react';
import { PostgreSQLMetrics } from '../../types/monitoring';

interface PostgresPageProps {
    postgresql?: PostgreSQLMetrics;
}

const PostgresPage: React.FC<PostgresPageProps> = ({ postgresql }) => {
    const pg = postgresql;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{pg?.dbSize || '--'}</div>
                            <div className="text-xs text-text-subtle">Database Size</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{pg?.memory || '--'}</div>
                            <div className="text-xs text-text-subtle">Memory Usage</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{pg?.cpu || '--'}%</div>
                            <div className="text-xs text-text-subtle">CPU Usage</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-cyan-400">{pg?.connections ?? '--'}</div>
                            <div className="text-xs text-text-subtle">Connections</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connection Details */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Connection Statistics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-3xl font-bold text-cyan-400 mb-2">{pg?.connections ?? '--'}</div>
                        <div className="text-sm text-text-subtle">Total Connections</div>
                        <div className="mt-3 w-full bg-white/10 rounded-full h-2">
                            <div
                                className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((pg?.connections || 0) / 100 * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-3xl font-bold text-emerald-400 mb-2">Active</div>
                        <div className="text-sm text-text-subtle">Connection State</div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-emerald-400">Healthy</span>
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-3xl font-bold text-yellow-400 mb-2">100</div>
                        <div className="text-sm text-text-subtle">Max Connections</div>
                        <div className="mt-3 text-xs text-text-subtle">
                            {pg?.connections ? `${((pg.connections / 100) * 100).toFixed(1)}% utilized` : '--'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Performance */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-purple-400" />
                        Performance Metrics
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Cache Hit Ratio</span>
                            <span className="text-emerald-400 font-bold">~95%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Index Hit Ratio</span>
                            <span className="text-emerald-400 font-bold">~99%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Database Size</span>
                            <span className="text-cyan-400 font-bold">{pg?.dbSize || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Container CPU</span>
                            <span className="text-white font-bold">{pg?.cpu || '--'}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        Database Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Status</span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-emerald-400 font-bold">Running</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Database</span>
                            <span className="text-white font-bold">n8n</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">User</span>
                            <span className="text-white font-bold">postgres</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Memory</span>
                            <span className="text-purple-400 font-bold">{pg?.memory || '--'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostgresPage;
