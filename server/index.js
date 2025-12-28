
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const app = express();
const port = 3001;

// Create HTTP server
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Production: Serve static files from dist folder
if (process.env.NODE_ENV === 'production') {
    console.log('📦 Production mode: Serving static files from dist/');
    app.use(express.static(join(__dirname, '../dist')));
}

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY is missing in .env.local');
    console.error('   Please add CLERK_SECRET_KEY=sk_test_... to your .env.local file');
    console.error('   You can get this from: https://dashboard.clerk.com/');
    process.exit(1);
}

console.log('✅ CLERK_SECRET_KEY loaded successfully');

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

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

// ============================================
// BEYOND PRESENCE API PROXY
// ============================================

// POST /api/beyond-presence/calls - Create Beyond Presence call (proxy to avoid CORS)
app.post('/api/beyond-presence/calls', async (req, res) => {
    const { apiKey, agent_id, livekit_username } = req.body;
    console.log('📥 Received request to create Beyond Presence call');

    if (!apiKey) {
        console.error('❌ Missing API key in request body');
        return res.status(400).json({ error: 'apiKey is required' });
    }

    try {
        console.log('🔄 Creating Beyond Presence call session...');

        const response = await fetch('https://api.bey.chat/v1/calls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                agent_id: agent_id || undefined,
                livekit_username: livekit_username || 'User'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Beyond Presence API error (${response.status}):`, errorText);
            return res.status(response.status).json({
                error: `Beyond Presence API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log(`✅ Successfully created Beyond Presence call: ${data.id}`);
        res.json(data);
    } catch (error) {
        console.error('❌ Error creating Beyond Presence call:', error.message);
        res.status(500).json({ error: 'Failed to create Beyond Presence call', details: error.message });
    }
});

// Production: SPA fallback - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
    app.get('/{*splat}', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(join(__dirname, '../dist/index.html'));
    });
}

server.listen(port, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log(`✅ Server successfully running on port ${port}`);
    console.log(`   http://localhost:${port}`);
    console.log('🚀 ============================================');
    console.log('');
    console.log('Available endpoints:');
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/users - Fetch all users from Clerk`);
    console.log(`   POST /api/update-permissions - Update user permissions`);
    console.log(`   POST /api/beyond-presence/calls - Create Beyond Presence call`);
    console.log('');
});
