
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client } from 'ssh2';
import { WebSocketServer } from 'ws';
import http from 'http';

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
