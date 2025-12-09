// SSH Configuration for Hetzner Server Connection
const sshConfig = {
    host: process.env.HETZNER_HOST || 'localhost',
    port: parseInt(process.env.HETZNER_PORT || '22'),
    username: process.env.HETZNER_USER || 'root',
    // Use either privateKey or password authentication
    ...(process.env.HETZNER_SSH_KEY
        ? { privateKey: require('fs').readFileSync(process.env.HETZNER_SSH_KEY) }
        : { password: process.env.HETZNER_PASSWORD }
    ),
    readyTimeout: 20000, // 20 seconds
    keepaliveInterval: 10000, // Send keepalive every 10s
};

module.exports = sshConfig;
