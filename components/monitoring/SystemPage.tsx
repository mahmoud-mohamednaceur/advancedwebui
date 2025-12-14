import React from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi, Activity, Server, Clock } from 'lucide-react';
import { SystemMetrics } from '../../types/monitoring';

interface SystemPageProps {
    system?: SystemMetrics;
}

const getStatusColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'from-red-500 to-red-600';
    if (value >= warning) return 'from-yellow-500 to-yellow-600';
    return 'from-emerald-500 to-emerald-600';
};

const getTextColor = (value: number, warning: number, critical: number) => {
    if (value >= critical) return 'text-red-400';
    if (value >= warning) return 'text-yellow-400';
    return 'text-emerald-400';
};

const SystemPage: React.FC<SystemPageProps> = ({ system }) => {
    const cpu = system?.cpu?.usage || 0;
    const ram = system?.ram?.percentage || 0;
    const disk = system?.disk?.percentage || 0;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Large Resource Gauges */}
            <div className="grid grid-cols-3 gap-4">
                {/* CPU */}
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Cpu className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">CPU Usage</h3>
                            <p className="text-xs text-text-subtle">Processor utilization</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="text-5xl font-bold text-center mb-2">
                            <span className={getTextColor(cpu, 70, 90)}>{cpu.toFixed(1)}</span>
                            <span className="text-2xl text-text-subtle">%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                            <div
                                className={`h-4 rounded-full transition-all duration-500 bg-gradient-to-r ${getStatusColor(cpu, 70, 90)}`}
                                style={{ width: `${cpu}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-text-subtle mt-2">
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* RAM */}
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <MemoryStick className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">RAM Usage</h3>
                            <p className="text-xs text-text-subtle">Memory utilization</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="text-5xl font-bold text-center mb-2">
                            <span className={getTextColor(ram, 70, 85)}>{ram}</span>
                            <span className="text-2xl text-text-subtle">%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                            <div
                                className={`h-4 rounded-full transition-all duration-500 bg-gradient-to-r ${getStatusColor(ram, 70, 85)}`}
                                style={{ width: `${ram}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-text-subtle mt-2">
                            <span>{system?.ram?.used || '--'} MB used</span>
                            <span>{system?.ram?.total || '--'} MB total</span>
                        </div>
                    </div>
                </div>

                {/* Disk */}
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <HardDrive className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Disk Usage</h3>
                            <p className="text-xs text-text-subtle">Storage utilization</p>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="text-5xl font-bold text-center mb-2">
                            <span className={getTextColor(disk, 75, 90)}>{disk}</span>
                            <span className="text-2xl text-text-subtle">%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                            <div
                                className={`h-4 rounded-full transition-all duration-500 bg-gradient-to-r ${getStatusColor(disk, 75, 90)}`}
                                style={{ width: `${disk}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-text-subtle mt-2">
                            <span>{system?.disk?.used || '--'} GB used</span>
                            <span>{system?.disk?.total || '--'} GB total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <MemoryStick className="w-4 h-4 text-purple-400" />
                        Memory Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Total Memory</span>
                            <span className="text-white font-bold">{system?.ram?.total || '--'} MB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Used Memory</span>
                            <span className="text-purple-400 font-bold">{system?.ram?.used || '--'} MB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Free Memory</span>
                            <span className="text-emerald-400 font-bold">{system?.ram?.free || '--'} MB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Usage</span>
                            <span className={`font-bold ${getTextColor(ram, 70, 85)}`}>{ram}%</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-blue-400" />
                        Disk Details
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Total Space</span>
                            <span className="text-white font-bold">{system?.disk?.total || '--'} GB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Used Space</span>
                            <span className="text-blue-400 font-bold">{system?.disk?.used || '--'} GB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Available</span>
                            <span className="text-emerald-400 font-bold">{system?.disk?.available || '--'} GB</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Usage</span>
                            <span className={`font-bold ${getTextColor(disk, 75, 90)}`}>{disk}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Server Info */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Server Information
                </h3>
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-white">Hetzner</div>
                        <div className="text-xs text-text-subtle">Provider</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-emerald-400">Active</div>
                        <div className="text-xs text-text-subtle">Status</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <Wifi className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-white">SSH</div>
                        <div className="text-xs text-text-subtle">Connection</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <Cpu className="w-5 h-5 text-orange-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-white">Linux</div>
                        <div className="text-xs text-text-subtle">OS</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemPage;
