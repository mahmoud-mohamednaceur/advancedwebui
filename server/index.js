
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client } from 'ssh2';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const app = express();
const port = 3001;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/logs' });

app.use(cors());
app.use(express.json());

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is missing in .env.local');
    console.error('   Please add CLERK_SECRET_KEY=sk_test_... to your .env.local file');
    console.error('   You can get this from: https://dashboard.clerk.com/');
    process.exit(1);
}

console.log('✅ CLERK_SECRET_KEY loaded successfully');

// SSH Configuration
const sshConfig = {
    host: process.env.HETZNER_HOST,
    port: parseInt(process.env.HETZNER_PORT || '22'),
    username: process.env.HETZNER_USER || 'root',
    readyTimeout: 20000,
    keepaliveInterval: 10000,
};

// Add authentication method (password is simpler for now)
if (process.env.HETZNER_PASSWORD) {
    sshConfig.password = process.env.HETZNER_PASSWORD;
    console.log('✅ SSH using password authentication');
} else if (process.env.HETZNER_SSH_KEY) {
    try {
        sshConfig.privateKey = fs.readFileSync(process.env.HETZNER_SSH_KEY);
        if (process.env.HETZNER_SSH_PASSPHRASE) {
            sshConfig.passphrase = process.env.HETZNER_SSH_PASSPHRASE;
        }
        console.log('✅ SSH key loaded');
    } catch (err) {
        console.error('❌ Failed to load SSH key:', err.message);
    }
}

// ============================================
// METRIC COLLECTION FUNCTIONS
// ============================================

// Helper function to execute SSH command and return result
function execSSHCommand(sshClient, command) {
    return new Promise((resolve, reject) => {
        sshClient.exec(command, (err, stream) => {
            if (err) return reject(err);

            let output = '';
            let errorOutput = '';

            stream.on('data', (data) => {
                output += data.toString();
            });

            stream.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            stream.on('close', (code) => {
                if (code !== 0 && errorOutput) {
                    reject(new Error(errorOutput));
                } else {
                    resolve(output.trim());
                }
            });
        });
    });
}

const PROJECT_DIR = 'advanced-local-rag-app/queue_mode_fv';

// GLOBAL METRICS CACHE for instant display (sub-second response)
let metricsCache = null;
let lastCacheUpdate = 0;

// Helper to run command in project directory
function getProjectCommand(cmd) {
    return `cd ${PROJECT_DIR} && ${cmd}`;
}

async function resolveContainerName(sshClient, partialName) {
    try {
        // Try exact match first or partial match
        const cmd = `docker ps --filter "name=${partialName}" --format "{{.Names}}"`;
        const output = await execSSHCommand(sshClient, cmd);
        const names = output.trim().split('\n').filter(Boolean);
        // Prefer one that likely belongs to our stack if possible, or just the first one
        return names.find(n => n.includes('queue_mode')) || names[0] || null;
    } catch (e) {
        console.error(`Error resolving container ${partialName}:`, e.message);
        return null;
    }
}

// OPTIMIZED: Collect ALL Docker metrics in ONE command (containers + images + sizes)
async function collectAllDockerMetrics(sshClient) {
    try {
        // Single command to get all container stats at once
        const statsCmd = getProjectCommand(
            `docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}|{{.PIDs}}'`
        );
        const statsOutput = await execSSHCommand(sshClient, statsCmd);

        // Get image sizes
        const imagesCmd = getProjectCommand(
            `docker images --format '{{.Repository}}:{{.Tag}}|{{.Size}}'`
        );
        const imagesOutput = await execSSHCommand(sshClient, imagesCmd);

        // Parse containers
        const containers = statsOutput.trim().split('\n').filter(Boolean).map(line => {
            const [name, cpu, memUsage, memPerc, netIO, blockIO, pids] = line.split('|');
            return {
                name: name || 'unknown',
                cpu: cpu?.replace('%', '') || '0',
                memUsage: memUsage || '0',
                memPercent: memPerc?.replace('%', '') || '0',
                netIO: netIO || '0B / 0B',
                blockIO: blockIO || '0B / 0B',
                pids: pids || '0',
                status: 'running'
            };
        });

        // Parse images
        const images = imagesOutput.trim().split('\n').filter(Boolean).map(line => {
            const [name, size] = line.split('|');
            return { name: name || 'unknown', size: size || '0B' };
        });

        // Calculate total image size
        const totalImageSize = images.reduce((total, img) => {
            const sizeStr = img.size;
            let bytes = 0;
            if (sizeStr.includes('GB')) bytes = parseFloat(sizeStr) * 1024 * 1024 * 1024;
            else if (sizeStr.includes('MB')) bytes = parseFloat(sizeStr) * 1024 * 1024;
            else if (sizeStr.includes('KB') || sizeStr.includes('kB')) bytes = parseFloat(sizeStr) * 1024;
            return total + bytes;
        }, 0);

        return {
            containers,
            images,
            totalContainers: containers.length,
            totalImages: images.length,
            totalImageSize: totalImageSize > 1024 * 1024 * 1024
                ? (totalImageSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
                : (totalImageSize / (1024 * 1024)).toFixed(2) + ' MB'
        };
    } catch (error) {
        console.error('Error collecting Docker metrics:', error.message);
        return { containers: [], images: [], totalContainers: 0, totalImages: 0, totalImageSize: '0 MB' };
    }
}

// Collect System Metrics (Disk, RAM, CPU)
async function collectSystemMetrics(sshClient) {
    try {
        // Disk usage
        const diskOutput = await execSSHCommand(sshClient,
            "df -BG / | awk 'NR==2 {print $2,$3,$4,$5}'"
        );
        const [total, used, available, percentage] = diskOutput.split(' ');

        // RAM usage
        const ramOutput = await execSSHCommand(sshClient,
            "free -m | awk 'NR==2 {print $2,$3,$4}'"
        );
        const [ramTotal, ramUsed, ramFree] = ramOutput.split(' ');

        // CPU usage
        const cpuOutput = await execSSHCommand(sshClient,
            "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
        );

        return {
            disk: {
                total: total.replace('G', ''),
                used: used.replace('G', ''),
                available: available.replace('G', ''),
                percentage: parseInt(percentage.replace('%', ''))
            },
            ram: {
                total: parseInt(ramTotal),
                used: parseInt(ramUsed),
                free: parseInt(ramFree),
                percentage: Math.round((parseInt(ramUsed) / parseInt(ramTotal)) * 100)
            },
            cpu: {
                usage: parseFloat(cpuOutput) || 0
            }
        };
    } catch (error) {
        console.error('Error collecting system metrics:', error.message);
        return null;
    }
}

// Collect Worker Metrics (Replaces generic Docker Metrics)
async function collectWorkerMetrics(sshClient) {
    try {
        // Find all n8n worker containers
        const workerContainers = await execSSHCommand(sshClient,
            getProjectCommand("docker ps --filter 'name=worker' --format '{{.Names}}'")
        );

        const workers = [];
        const names = workerContainers.trim().split('\n').filter(Boolean);

        for (const name of names) {
            // Get stats for this worker
            const stats = await execSSHCommand(sshClient,
                `docker stats ${name} --no-stream --format '{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}' --no-trunc`
            );
            const [cpu, mem, memPerc] = stats.trim().split('|');

            // Get uptime
            const uptime = await execSSHCommand(sshClient,
                `docker inspect --format='{{.State.StartedAt}}' ${name}`
            );

            // Calculate uptime duration
            const startTime = new Date(uptime.trim());
            const now = new Date();
            const uptimeSeconds = Math.round((now - startTime) / 1000);
            const uptimeString = uptimeSeconds < 3600
                ? `${Math.floor(uptimeSeconds / 60)}m`
                : `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

            workers.push({
                name,
                cpu: cpu.replace('%', ''),
                memory: mem.split(' / ')[0], // Take used part
                memoryLimit: mem.split(' / ')[1],
                memoryPercent: memPerc.replace('%', ''),
                uptime: uptimeString,
                status: 'running'
            });
        }

        return {
            count: workers.length,
            workers,
            totalCpu: workers.reduce((acc, w) => acc + parseFloat(w.cpu), 0),
            status: workers.length > 0 ? 'active' : 'idle'
        };
    } catch (error) {
        console.error('Error collecting Worker metrics:', error.message);
        return { count: 0, workers: [], error: error.message };
    }
}

// Collect N8N Queue Metrics
async function collectN8NQueueMetrics(sshClient) {
    try {
        const pgContainer = await resolveContainerName(sshClient, 'postgres');
        if (!pgContainer) return { queueLength: 0, error: 'Postgres container not found' };

        const queueQuery = `
            SELECT 
                COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
                COUNT(CASE WHEN status = 'running' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'success' AND "stoppedAt" > NOW() - INTERVAL '1 hour' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'error' AND "stoppedAt" > NOW() - INTERVAL '1 hour' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'crashed' THEN 1 END) as crashed,
                COUNT(*) as total
            FROM execution_entity;
        `;

        const queueOutput = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec -i ${pgContainer} bash -c "export PGUSER=postgres && psql -d n8n -t -c \\"${queueQuery.replace(/\n/g, ' ')}\\""`)
        );

        const [waiting, active, completed, failed, crashed, total] = queueOutput.trim().split('|').map(v => parseInt(v.trim()) || 0);

        const jobsQuery = `
            SELECT id, mode, "startedAt", "retryOf", status 
            FROM execution_entity 
            WHERE status = 'running' 
            ORDER BY "startedAt" DESC 
            LIMIT 5;
        `;

        const jobsOutput = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec -i ${pgContainer} bash -c "export PGUSER=postgres && psql -d n8n -t -c \\"${jobsQuery.replace(/\n/g, ' ')}\\""`)
        );

        const currentJobs = jobsOutput.trim().split('\n').filter(Boolean).map(line => {
            const [id, mode, startedAt, retryOf, status] = line.split('|').map(v => v.trim());
            return { id, mode, startedAt, retry: retryOf || 'No', status };
        });

        return {
            queueLength: waiting + active,
            waiting,
            active,
            completed,
            failed,
            crashed,
            paused: 0,
            delayed: 0,
            currentJobs,
            metrics: {
                throughput: Math.round((completed / 60) * 100) / 100,
                failureRate: completed > 0 ? Math.round((failed / completed) * 100) : 0
            }
        };
    } catch (error) {
        console.error('Error collecting n8n queue metrics:', error.message);
        // Return safe default object to prevent frontend crashes
        return {
            queueLength: 0,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            crashed: 0,
            paused: 0,
            delayed: 0,
            currentJobs: [],
            metrics: { throughput: 0, failureRate: 0 },
            error: error.message
        };
    }
}

// Collect PostgreSQL Metrics
async function collectPostgreSQLMetrics(sshClient) {
    try {
        const pgContainer = await resolveContainerName(sshClient, 'postgres');
        if (!pgContainer) return null;

        const statsOutput = await execSSHCommand(sshClient,
            `docker stats ${pgContainer} --no-stream --format '{{.MemUsage}}|{{.CPUPerc}}'`
        );
        const [mem, cpu] = statsOutput.trim().split('|');

        const dbSize = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec -i ${pgContainer} bash -c "export PGUSER=postgres && psql -d n8n -t -c \\"SELECT pg_size_pretty(pg_database_size('n8n'));\\""`));

        const conns = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec -i ${pgContainer} bash -c "export PGUSER=postgres && psql -d postgres -t -c \\"SELECT sum(numbackends) FROM pg_stat_database;\\""`));

        return {
            status: 'running',
            memory: mem.split('/')[0].trim(),
            cpu: cpu.replace('%', ''),
            dbSize: dbSize.trim(),
            connections: parseInt(conns.trim()) || 0
        };
    } catch (error) {
        console.error('Error collecting PostgreSQL metrics:', error.message);
        return null;
    }
}

// Collect Redis Metrics
async function collectRedisMetrics(sshClient) {
    try {
        const redisContainer = await resolveContainerName(sshClient, 'redis');
        if (!redisContainer) return null;

        // Get full INFO
        const redisInfo = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec ${redisContainer} redis-cli INFO`)
        );

        const stats = {};
        redisInfo.split('\r\n').forEach(line => {
            if (line && line.includes(':')) {
                const [key, value] = line.split(':');
                stats[key] = value;
            }
        });

        // Parse Memory
        const memory = {
            used: stats.used_memory_human,
            peak: stats.used_memory_peak_human,
            fragmentation: stats.mem_fragmentation_ratio,
            datasetSize: stats.used_memory_dataset || '0',
            lua: stats.used_memory_lua_human
        };

        // Parse Stats
        const performance = {
            opsPerSec: parseInt(stats.instantaneous_ops_per_sec) || 0,
            hitRate: 0,
            totalCommands: parseInt(stats.total_commands_processed),
            connectedClients: parseInt(stats.connected_clients),
            blockedClients: parseInt(stats.blocked_clients),
            rejectedConnections: parseInt(stats.rejected_connections),
            evictedKeys: parseInt(stats.evicted_keys)
        };

        // Calculate Hit Rate
        const hits = parseInt(stats.keyspace_hits) || 0;
        const misses = parseInt(stats.keyspace_misses) || 0;
        if (hits + misses > 0) {
            performance.hitRate = Math.round((hits / (hits + misses)) * 100);
        }

        // Keyspace
        const keyspace = {};
        if (stats.db0) {
            // Parse "keys=5,expires=0,avg_ttl=0"
            const parts = stats.db0.split(',');
            parts.forEach(p => {
                const [k, v] = p.split('=');
                keyspace[k] = v;
            });
        }

        return {
            status: 'running',
            version: stats.redis_version,
            uptime: stats.uptime_in_days + ' days',
            memory,
            performance,
            keyspace
        };
    } catch (error) {
        console.error('Error collecting Redis metrics:', error.message);
        return null;
    }
}

// Collect Redis Queue Metrics (BullMQ queues for N8N)
async function collectRedisQueueMetrics(sshClient) {
    try {
        const redisContainer = await resolveContainerName(sshClient, 'redis');
        if (!redisContainer) return null;

        const queues = {};
        const queueNames = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];

        // Query each queue length
        for (const queueName of queueNames) {
            try {
                const queueKey = `bull:n8n:${queueName}`;
                const length = await execSSHCommand(sshClient,
                    getProjectCommand(`docker exec ${redisContainer} redis-cli LLEN ${queueKey}`)
                );
                queues[queueName] = parseInt(length) || 0;
            } catch (e) {
                queues[queueName] = 0;
            }
        }

        // Get total queue length
        queues.total = Object.values(queues).reduce((sum, val) => sum + val, 0);

        // Get memory usage per queue
        const memoryPerQueue = {};
        for (const queueName of ['waiting', 'active']) {
            try {
                const queueKey = `bull:n8n:${queueName}`;
                const memUsage = await execSSHCommand(sshClient,
                    getProjectCommand(`docker exec ${redisContainer} redis-cli MEMORY USAGE ${queueKey}`)
                );
                memoryPerQueue[queueName] = parseInt(memUsage) || 0;
            } catch (e) {
                memoryPerQueue[queueName] = 0;
            }
        }

        return {
            queues,
            memoryPerQueue,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error collecting Redis queue metrics:', error.message);
        return {
            queues: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0, total: 0 },
            memoryPerQueue: {},
            timestamp: Date.now()
        };
    }
}

// Collect Detailed Worker Metrics
async function collectWorkerDetailedMetrics(sshClient) {
    try {
        // Find all n8n worker containers
        const containerList = await execSSHCommand(sshClient,
            getProjectCommand(`docker ps --filter "name=worker" --format "{{.Names}}|{{.Status}}"`)
        );

        if (!containerList) {
            return { workers: [], count: 0 };
        }

        const containerLines = containerList.trim().split('\n').filter(Boolean);
        const workers = [];

        for (const line of containerLines) {
            const [name, status] = line.split('|');

            try {
                // Get container stats
                const stats = await execSSHCommand(sshClient,
                    `docker stats ${name} --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"`
                );

                const [cpu, memUsage, memPerc] = stats.trim().split('|');

                // Get uptime
                const inspectOutput = await execSSHCommand(sshClient,
                    `docker inspect ${name} --format "{{.State.StartedAt}}"`
                );
                const startedAt = new Date(inspectOutput.trim());
                const uptime = Math.floor((Date.now() - startedAt.getTime()) / 1000 / 60); // minutes

                // Parse memory values
                const memParts = memUsage.split('/');
                const memRSS = memParts[0]?.trim() || '0';

                workers.push({
                    name: name.replace('advanced-local-rag-app-', '').replace('queue_mode_fv-', ''),
                    id: name,
                    status: status.includes('Up') ? 'running' : 'stopped',
                    cpu: parseFloat(cpu.replace('%', '')) || 0,
                    memoryRSS: memRSS,
                    memoryPercent: parseFloat(memPerc.replace('%', '')) || 0,
                    uptime: uptime > 60 ? `${Math.floor(uptime / 60)}h ${uptime % 60}m` : `${uptime}m`,
                    uptimeMinutes: uptime
                });
            } catch (e) {
                console.error(`Error getting stats for ${name}:`, e.message);
            }
        }

        return {
            workers,
            count: workers.length,
            totalCpu: workers.reduce((sum, w) => sum + w.cpu, 0),
            avgCpu: workers.length > 0 ? (workers.reduce((sum, w) => sum + w.cpu, 0) / workers.length).toFixed(1) : 0
        };
    } catch (error) {
        console.error('Error collecting worker metrics:', error.message);
        return { workers: [], count: 0, totalCpu: 0, avgCpu: 0 };
    }
}

// Collect Active Job Details from Redis
async function collectJobDetails(sshClient) {
    try {
        const redisContainer = await resolveContainerName(sshClient, 'redis');
        if (!redisContainer) return [];

        // Get all job IDs from active queue
        const activeJobIds = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec ${redisContainer} redis-cli LRANGE bull:n8n:active 0 99`)
        );

        if (!activeJobIds || activeJobIds.trim() === '(empty array)') {
            return [];
        }

        const jobIds = activeJobIds.trim().split('\n').filter(Boolean);
        const jobs = [];

        for (const jobId of jobIds.slice(0, 20)) { // Limit to 20 jobs
            try {
                const jobData = await execSSHCommand(sshClient,
                    getProjectCommand(`docker exec ${redisContainer} redis-cli HGET bull:n8n:${jobId} data`)
                );

                if (jobData && jobData !== '(nil)') {
                    try {
                        const parsed = JSON.parse(jobData);
                        jobs.push({
                            id: jobId,
                            workflowId: parsed.workflowId || 'unknown',
                            workflowName: parsed.workflowName || 'Unknown Workflow',
                            startedAt: parsed.timestamp || Date.now(),
                            duration: Date.now() - (parsed.timestamp || Date.now()),
                            attempts: parsed.attempts || 1
                        });
                    } catch (e) {
                        // Skip unparseable jobs
                    }
                }
            } catch (e) {
                // Skip individual job errors
            }
        }

        return jobs;
    } catch (error) {
        console.error('Error collecting job details:', error.message);
        return [];
    }
}

// Collect Redis Performance Metrics
async function collectRedisPerformanceMetrics(sshClient) {
    try {
        const redisContainer = await resolveContainerName(sshClient, 'redis');
        if (!redisContainer) return null;

        // Get slowlog
        const slowlog = await execSSHCommand(sshClient,
            getProjectCommand(`docker exec ${redisContainer} redis-cli SLOWLOG GET 10`)
        );

        const slowlogCount = slowlog ? slowlog.split('\n').filter(l => l.includes(')')).length : 0;

        return {
            slowlogCount,
            avgLatency: 0, // TODO: Calculate from INFO commandstats
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error collecting Redis performance metrics:', error.message);
        return { slowlogCount: 0, avgLatency: 0, timestamp: Date.now() };
    }
}

// Collect System Resource Metrics
async function collectSystemResourceMetrics(sshClient) {
    try {
        // Get network stats
        let networkStats = { rxBytes: 0, txBytes: 0 };
        try {
            const netOutput = await execSSHCommand(sshClient,
                "cat /proc/net/dev | grep eth0"
            );
            if (netOutput) {
                const parts = netOutput.trim().split(/\s+/);
                networkStats = {
                    rxBytes: parseInt(parts[1]) || 0,
                    txBytes: parseInt(parts[9]) || 0
                };
            }
        } catch (e) {
            // Network stats optional
        }

        // Get process count
        let processCount = 0;
        try {
            const psOutput = await execSSHCommand(sshClient, "ps aux | wc -l");
            processCount = parseInt(psOutput) || 0;
        } catch (e) {
            // Process count optional
        }

        return {
            network: networkStats,
            processes: processCount,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Error collecting system resource metrics:', error.message);
        return {
            network: { rxBytes: 0, txBytes: 0 },
            processes: 0,
            timestamp: Date.now()
        };
    }
}

// Detect Health Alerts
function detectHealthAlerts(metrics) {
    const alerts = [];

    if (!metrics) return alerts;

    // High CPU alert
    if (metrics.system?.cpu?.usage > 80) {
        alerts.push({
            severity: 'warning',
            message: `High CPU usage: ${metrics.system.cpu.usage}%`,
            type: 'cpu'
        });
    }

    // High RAM alert
    if (metrics.system?.ram?.percentage > 80) {
        alerts.push({
            severity: 'warning',
            message: `High RAM usage: ${metrics.system.ram.percentage}%`,
            type: 'ram'
        });
    }

    // Low disk space
    if (metrics.system?.disk?.percentage > 80) {
        alerts.push({
            severity: 'warning',
            message: `Low disk space: ${metrics.system.disk.percentage}% used`,
            type: 'disk'
        });
    }

    // Worker high memory/CPU
    if (metrics.workers?.workers) {
        metrics.workers.workers.forEach(worker => {
            const cpuUsage = parseFloat(worker.cpu);
            const memUsage = parseFloat(worker.memoryPercent);

            if (cpuUsage > 80) {
                alerts.push({
                    severity: 'warning',
                    message: `${worker.name} high CPU: ${worker.cpu}%`,
                    type: 'worker'
                });
            }
            if (memUsage > 85) {
                alerts.push({
                    severity: 'warning',
                    message: `${worker.name} high Memory: ${worker.memoryPercent}%`,
                    type: 'worker'
                });
            }
        });
    }

    // Queue backlog
    if (metrics.n8n?.queueLength > 100) {
        alerts.push({
            severity: 'info',
            message: `Queue backlog: ${metrics.n8n.queueLength} waiting jobs`,
            type: 'queue'
        });
    }

    // Failed jobs
    if (metrics.n8n?.metrics?.failureRate > 20) {
        alerts.push({
            severity: 'error',
            message: `High failure rate: ${metrics.n8n.metrics.failureRate}%`,
            type: 'jobs'
        });
    }

    return alerts;
}

// Store active SSH connections
const activeConnections = new Map();

// GET /api/users - Fetch all users
app.get('/api/users', async (req, res) => {
    console.log('📥 Received request to /api/users');
    try {
        const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Clerk API error (${response.status}):`, errorText);
            throw new Error(`Clerk API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const users = Array.isArray(data) ? data : data.data || [];
        console.log(`✅ Successfully fetched ${users.length} users from Clerk`);
        res.json(users);
    } catch (error) {
        console.error('❌ Error fetching users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});

// POST /api/update-permissions - Update user metadata
app.post('/api/update-permissions', async (req, res) => {
    const { userId, permissions } = req.body;
    console.log(`📥 Received request to update permissions for user ${userId}`);

    if (!userId || !permissions) {
        console.error('❌ Missing userId or permissions in request body');
        return res.status(400).json({ error: 'Missing userId or permissions' });
    }

    try {
        const response = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                public_metadata: permissions
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Clerk API error (${response.status}):`, errorText);
            throw new Error(`Clerk API error: ${response.status} ${response.statusText}`);
        }

        const updatedUser = await response.json();
        console.log(`✅ Successfully updated permissions for user ${userId}`);
        res.json(updatedUser);
    } catch (error) {
        console.error('❌ Error updating permissions:', error.message);
        res.status(500).json({ error: 'Failed to update permissions', details: error.message });
    }
});

// POST /api/server/connect - Test SSH connection
app.post('/api/server/connect', async (req, res) => {
    console.log('📥 Testing SSH connection to Hetzner server...');

    if (!sshConfig.host || !sshConfig.username) {
        return res.status(400).json({
            error: 'SSH configuration missing',
            details: 'Please set HETZNER_HOST and HETZNER_USER in .env.local'
        });
    }

    const conn = new Client();

    conn.on('ready', () => {
        console.log('✅ SSH connection successful');
        conn.end();
        res.json({
            success: true,
            message: 'Connection established',
            server: sshConfig.host
        });
    });

    conn.on('error', (err) => {
        console.error('❌ SSH connection error:', err.message);
        res.status(500).json({
            error: 'SSH connection failed',
            details: err.message
        });
    });

    conn.connect(sshConfig);
});

// WebSocket server for real-time log streaming
wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    const connId = Date.now().toString();
    let sshClient = null;
    let stream = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('📥 Received WebSocket message:', data);

            if (data.action === 'start_logs') {
                // Start streaming docker logs
                console.log('🐳 Starting docker logs stream...');

                sshClient = new Client();

                sshClient.on('ready', () => {
                    console.log('✅ SSH connected for log streaming');

                    const command = 'docker compose -p localai logs -f n8n n8n-worker-1 n8n-worker-2 redis';

                    sshClient.exec(command, (err, execStream) => {
                        if (err) {
                            console.error('❌ Failed to execute command:', err);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Failed to execute docker command'
                            }));
                            return;
                        }

                        stream = execStream;

                        execStream.on('data', (logData) => {
                            const logLine = logData.toString();
                            // Parse service name from docker compose log format
                            const match = logLine.match(/^([\w-]+)\s+\|\s+(.*)$/);

                            if (match) {
                                ws.send(JSON.stringify({
                                    type: 'log',
                                    service: match[1],
                                    message: match[2],
                                    timestamp: new Date().toISOString()
                                }));
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'log',
                                    service: 'system',
                                    message: logLine,
                                    timestamp: new Date().toISOString()
                                }));
                            }
                        });

                        execStream.stderr.on('data', (data) => {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: data.toString(),
                                timestamp: new Date().toISOString()
                            }));
                        });

                        execStream.on('close', (code) => {
                            console.log(`📕 Stream closed with code ${code}`);
                            ws.send(JSON.stringify({
                                type: 'disconnected',
                                message: 'Log stream ended'
                            }));
                        });
                    });
                });

                sshClient.on('error', (err) => {
                    console.error('❌ SSH error:', err.message);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `SSH error: ${err.message}`
                    }));
                });

                sshClient.connect(sshConfig);
                activeConnections.set(connId, sshClient);
            } else if (data.action === 'stop_logs') {
                if (stream) stream.close();
                if (sshClient) sshClient.end();
                console.log('🛑 Stopped log streaming');
            } else if (data.action === 'start_monitoring') {
                // Start monitoring mode with periodic metrics collection
                console.log('📊 Starting monitoring mode...');

                sshClient = new Client();

                sshClient.on('ready', async () => {
                    console.log('✅ SSH connected for monitoring');

                    // Send initial connected message
                    ws.send(JSON.stringify({
                        type: 'connected',
                        message: 'Monitoring started'
                    }));

                    // INSTANT: Send cached metrics immediately if available
                    if (metricsCache) {
                        console.log('⚡ Sending cached metrics instantly');
                        ws.send(JSON.stringify({
                            type: 'metrics',
                            timestamp: new Date().toISOString(),
                            cached: true,
                            data: metricsCache
                        }));
                    }

                    // Collect and send metrics every 5 seconds
                    const monitoringInterval = setInterval(async () => {
                        try {
                            console.log('📊 Collecting metrics...');
                            const startTime = Date.now();

                            // OPTIMIZED: Run independent collectors in PARALLEL
                            const [
                                systemResult,
                                dockerResult,
                                redisResult,
                                pgResult
                            ] = await Promise.all([
                                // System metrics
                                execSSHCommand(sshClient, `df -BG / | awk 'NR==2 {print $2,$3,$4,$5}' && echo '---' && free -m | awk 'NR==2 {print $2,$3,$4}' && echo '---' && top -bn1 | grep 'Cpu(s)' | awk '{print $2}'`).catch(() => ''),
                                // Docker stats + images in one go
                                collectAllDockerMetrics(sshClient).catch(() => ({ containers: [], images: [] })),
                                // Redis info
                                execSSHCommand(sshClient, getProjectCommand(`docker exec $(docker ps --filter "name=redis" --format "{{.Names}}" | head -1) redis-cli INFO 2>/dev/null || echo ""`)).catch(() => ''),
                                // PostgreSQL stats
                                execSSHCommand(sshClient, `docker stats $(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1) --no-stream --format '{{.MemUsage}}|{{.CPUPerc}}' 2>/dev/null || echo ""`).catch(() => '')
                            ]);

                            // Parse system metrics quickly
                            const [diskPart, ramPart, cpuPart] = systemResult.split('---').map(s => s.trim());
                            const [total, used, available, percentage] = (diskPart || '').split(' ');
                            const [ramTotal, ramUsed, ramFree] = (ramPart || '').split(' ');
                            const cpuUsage = parseFloat(cpuPart) || 0;

                            const system = {
                                disk: { total: total?.replace('G', '') || '--', used: used?.replace('G', '') || '--', available: available?.replace('G', '') || '--', percentage: parseInt(percentage?.replace('%', '')) || 0 },
                                ram: { total: parseInt(ramTotal) || 0, used: parseInt(ramUsed) || 0, free: parseInt(ramFree) || 0, percentage: ramTotal ? Math.round((parseInt(ramUsed) / parseInt(ramTotal)) * 100) : 0 },
                                cpu: { usage: cpuUsage }
                            };

                            // Parse Redis fast
                            const redisStats = {};
                            redisResult.split('\r\n').forEach(line => { if (line.includes(':')) { const [k, v] = line.split(':'); redisStats[k] = v; } });
                            const redis = redisStats.redis_version ? {
                                status: 'running',
                                version: redisStats.redis_version,
                                memory: { used: redisStats.used_memory_human, peak: redisStats.used_memory_peak_human },
                                performance: { opsPerSec: parseInt(redisStats.instantaneous_ops_per_sec) || 0, connectedClients: parseInt(redisStats.connected_clients) || 0 }
                            } : null;

                            // Parse PostgreSQL fast
                            const [pgMem, pgCpu] = pgResult.split('|');
                            const postgresql = pgMem ? { status: 'running', memory: pgMem.split('/')[0]?.trim() || '--', cpu: pgCpu?.replace('%', '') || '0', dbSize: '--', connections: 0 } : null;

                            const metrics = {
                                system,
                                docker: dockerResult,
                                redis,
                                postgresql,
                                // Minimal queue data from redis
                                n8n: { waiting: 0, active: 0, completed: 0, failed: 0, workers: dockerResult?.containers?.filter(c => c.name?.includes('worker')).length || 0 },
                                workerDetails: { workers: [], count: dockerResult?.containers?.filter(c => c.name?.includes('worker')).length || 0 }
                            };

                            console.log(`⚡ Metrics collected in ${Date.now() - startTime}ms`);

                            // Detect health alerts
                            const alerts = detectHealthAlerts(metrics);

                            // Send metrics to client
                            const metricsWithAlerts = { ...metrics, alerts };
                            ws.send(JSON.stringify({
                                type: 'metrics',
                                timestamp: new Date().toISOString(),
                                data: metricsWithAlerts
                            }));

                            // UPDATE CACHE for instant display on next connect
                            metricsCache = metricsWithAlerts;
                            lastCacheUpdate = Date.now();

                            console.log('✅ Metrics sent to client');
                        } catch (error) {
                            console.error('❌ Error collecting metrics:', error.message);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: `Metrics collection error: ${error.message}`
                            }));
                        }
                    }, 5000); // Poll every 5 seconds

                    // Store interval ID for cleanup
                    activeConnections.set(connId, { sshClient, monitoringInterval });
                });

                sshClient.on('error', (err) => {
                    console.error('❌ SSH error:', err.message);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `SSH error: ${err.message}`
                    }));
                });

                sshClient.connect(sshConfig);
            } else if (data.action === 'stop_monitoring') {
                const connection = activeConnections.get(connId);
                if (connection) {
                    if (connection.monitoringInterval) {
                        clearInterval(connection.monitoringInterval);
                    }
                    if (connection.sshClient) {
                        connection.sshClient.end();
                    }
                    activeConnections.delete(connId);
                }
                console.log('🛑 Stopped monitoring');
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        if (stream) stream.close();
        if (sshClient) sshClient.end();
        activeConnections.delete(connId);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
});

server.listen(port, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log(`✅ Server successfully running on port ${port}`);
    console.log(`   http://localhost:${port}`);
    console.log('🚀 ============================================');
    console.log('');
    console.log('Available endpoints:');
    console.log(`   GET  /api/users - Fetch all users from Clerk`);
    console.log(`   POST /api/update-permissions - Update user permissions`);
    console.log(`   POST /api/server/connect - Test SSH connection`);
    console.log(`   WS   /ws/logs - Real-time log streaming`);
    console.log('');
    if (sshConfig.host) {
        console.log(`📡 SSH configured for: ${sshConfig.username}@${sshConfig.host}`);
    } else {
        console.log('⚠️  SSH not configured. Add HETZNER_* variables to .env.local');
    }
    console.log('');
});
