import { useState, useEffect, useRef, useCallback } from 'react';
import { ServerMetrics } from '../types/monitoring';

// Default/placeholder metrics for instant rendering
const DEFAULT_METRICS: ServerMetrics = {
    system: {
        disk: { total: '--', used: '--', available: '--', percentage: 0 },
        ram: { total: 0, used: 0, free: 0, percentage: 0 },
        cpu: { usage: 0 }
    },
    docker: {
        containers: [],
        images: [],
        totalContainers: 0,
        totalImages: 0,
        totalImageSize: '--'
    },
    redis: {
        memory: { used: '--', peak: '--', fragmentation: '--' },
        performance: { opsPerSec: 0, hitRate: 0, connectedClients: 0 },
        version: '--',
        uptime: '--'
    },
    redisQueues: {
        queues: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0, total: 0 },
        memoryPerQueue: {}
    },
    postgresql: {
        memory: '--',
        cpu: '--',
        dbSize: '--',
        connections: 0
    },
    workerDetails: {
        workers: [],
        count: 0,
        avgCpu: 0
    },
    n8n: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        workers: 0
    },
    alerts: []
};

interface UseServerMetricsReturn {
    metrics: ServerMetrics;
    isConnected: boolean;
    isLoading: boolean;
    lastUpdate: Date | null;
    error: string | null;
    reconnect: () => void;
}

export const useServerMetrics = (): UseServerMetricsReturn => {
    // Initialize with default metrics for instant rendering
    const [metrics, setMetrics] = useState<ServerMetrics>(DEFAULT_METRICS);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setIsLoading(true);
        const ws = new WebSocket('ws://localhost:3001/ws/logs');

        ws.onopen = () => {
            console.log('✅ Server Metrics WebSocket connected');
            setIsConnected(true);
            setError(null);
            // Send monitoring request immediately
            ws.send(JSON.stringify({ action: 'start_monitoring' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'metrics') {
                    setMetrics(data.data);
                    setLastUpdate(new Date());
                    setIsLoading(false);
                } else if (data.type === 'connected') {
                    // Connection confirmed, waiting for first metrics
                    console.log('📊 Monitoring started, waiting for metrics...');
                } else if (data.type === 'error') {
                    setError(data.message);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error('Failed to parse metrics:', e);
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket error:', e);
            setError('Connection error - is the server running?');
            setIsConnected(false);
            setIsLoading(false);
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
            setIsConnected(false);
            // Auto-reconnect after 2 seconds (faster reconnect)
            reconnectTimeoutRef.current = window.setTimeout(() => {
                connect();
            }, 2000);
        };

        wsRef.current = ws;
    }, []);

    const reconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        connect();
    }, [connect]);

    useEffect(() => {
        // Connect immediately on mount
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'stop_monitoring' }));
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { metrics, isConnected, isLoading, lastUpdate, error, reconnect };
};

export default useServerMetrics;
