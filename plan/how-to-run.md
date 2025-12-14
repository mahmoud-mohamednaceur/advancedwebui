# How to Run the Application

## Prerequisites

- Node.js v22+ installed
- npm installed
- `.env.local` file configured with required keys

## Quick Start

### Option 1: Run Both Servers Together (Recommended)

```bash
npm run dev
```

This starts both the backend server (port 3001) and frontend server (port 3009) concurrently.

### Option 2: Run Servers Separately

**Terminal 1 - Backend Server:**
```bash
node server/index.js
```
- Runs on: `http://localhost:3001`
- Handles: API proxies, Clerk authentication, SSH monitoring

**Terminal 2 - Frontend Server:**
```bash
.\node_modules\.bin\vite.ps1
# OR
npx vite
```
- Runs on: `http://localhost:3009`
- Hot reload enabled for development

## Individual Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers concurrently |
| `npm run server` | Start only the backend server |
| `npm run vite` | Start only the Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Accessing the Application

1. **Open browser**: Navigate to `http://localhost:3009`
2. **Sign in**: Use Clerk authentication
3. **Start using**: Access notebooks, chat, settings, etc.

## Ports

- **Frontend (Vite)**: 3009
- **Backend (Express)**: 3001
- **WebSocket (Logs)**: 3001/ws/logs

## Troubleshooting

### Port Already in Use
```bash
# Stop all Node processes
Get-Process -Name "node" | Stop-Process -Force

# Then restart
npm run dev
```

### Missing Dependencies
```bash
npm install
```

### Environment Variables Missing
Ensure `.env.local` contains:
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- Other required keys (SSH, Hetzner, etc.)

## Development Workflow

1. **Backend changes**: Server auto-restarts on file changes
2. **Frontend changes**: Vite hot-reloads automatically
3. **New dependencies**: Run `npm install` and restart servers

## Production Build

```bash
npm run build
npm run preview
```

Outputs to `dist/` directory.
