export type GlobalPage = 'dashboard' | 'notebooks' | 'settings' | 'server';
export type ServerSubPage = 'overview' | 'containers' | 'postgres' | 'redis' | 'system' | 'logs' | 'workflows';
export type WorkspacePage = 'home' | 'chat' | 'documents' | 'chart' | 'search' | 'settings';

// Extended metrics types for monitoring dashboard
export interface SystemMetrics {
    disk: { total: string; used: string; available: string; percentage: number };
    ram: { total: number; used: number; free: number; percentage: number };
    cpu: { usage: number };
}

export interface ContainerMetrics {
    name: string;
    cpu: string;
    memUsage: string;
    memPercent: string;
    netIO: string;
    blockIO: string;
    pids: string;
    status: string;
}

export interface DockerMetrics {
    containers: ContainerMetrics[];
    images: Array<{ name: string; size: string }>;
    totalContainers: number;
    totalImages: number;
    totalImageSize: string;
}

export interface RedisMetrics {
    memory: { used: string; peak: string; fragmentation: string };
    performance: { opsPerSec: number; hitRate: number; connectedClients: number };
    version: string;
    uptime: string;
}

export interface RedisQueueMetrics {
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
}

export interface PostgreSQLMetrics {
    memory: string;
    cpu: string;
    dbSize: string;
    connections: number;
}

export interface WorkerMetrics {
    name: string;
    status: string;
    cpu: number;
    memoryRSS: string;
    uptime: string;
}

export interface WorkerDetailsMetrics {
    workers: WorkerMetrics[];
    count: number;
    avgCpu: number;
}

export interface N8NQueueMetrics {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    workers: number;
}

export interface AlertMetrics {
    severity: 'error' | 'warning' | 'info';
    message: string;
    type: string;
}

export interface WorkflowExecution {
    id: string;
    workflowName: string;
    mode: string;
    status: string;
    startedAt: string;
    stoppedAt?: string;
    duration?: number;
}

export interface WorkflowStats {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    avgDuration: number;
    throughput: number;
}

export interface ServerMetrics {
    system?: SystemMetrics;
    docker?: DockerMetrics;
    redis?: RedisMetrics;
    redisQueues?: RedisQueueMetrics;
    postgresql?: PostgreSQLMetrics;
    workerDetails?: WorkerDetailsMetrics;
    n8n?: N8NQueueMetrics;
    alerts?: AlertMetrics[];
    workflows?: {
        recentExecutions: WorkflowExecution[];
        stats: WorkflowStats;
    };
}
