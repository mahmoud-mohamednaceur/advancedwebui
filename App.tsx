
import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Workflow from './components/Workflow';
import RagExplanation from './components/RagExplanation';
import Footer from './components/Footer';
import Header from './components/ui/Header';
import Sidebar, { GlobalPage, WorkspacePage } from './components/Sidebar';
import DocumentsPage from './components/DocumentsPage';
import DashboardPage from './components/DashboardPage';
import NotebookDashboard from './components/workspace/NotebookDashboard';
import NotebookDocuments from './components/workspace/NotebookDocuments';
import PlaygroundSearch from './components/workspace/PlaygroundSearch';
import PlaygroundChart from './components/workspace/PlaygroundChart';
import NotebookChat from './components/workspace/NotebookChat';
import NotebookSettings from './components/workspace/NotebookSettings';
import NotebookEmbeddingSetup from './components/workspace/NotebookEmbeddingSetup';
import { Loader2 } from 'lucide-react';
import { isAdmin, hasNotebookPermission, hasPagePermission } from './utils/admin';
import GlobalSettings from './components/GlobalSettings';

type AppMode = 'global' | 'workspace';

// --- Types for Configuration ---

export interface StrategyConfig {
    id: string;
    retrievalWebhook: string;
    agenticWebhook: string;
    params: Record<string, number>;
}

export interface NotebookConfig {
    embeddingModel: string;
    systemPrompts: {
        retrieval: string;
        dataset: string;
    };
    inference: {
        provider: 'openai' | 'ollama';
        model: string;
        temperature: number;
    };
    strategies: Record<string, StrategyConfig>; // Keyed by strategy ID (e.g., 'fusion', 'multi-query')
    activeStrategyId: string;
}

// Default values for initialization
const DEFAULT_SYSTEM_PROMPTS = {
    retrieval: `You are an AI assistant powered by Sportnavi. Your primary task is to provide accurate, factual responses based STRICTLY on the provided search results. You must ONLY answer questions using information explicitly found in the search results - do not make assumptions or add information from outside knowledge.

Follow these STRICT guidelines:
1. If the search results do not contain information to fully answer the query, state clearly: "I cannot fully answer this question based on the available information." Then explain what specific aspects cannot be answered.
2. Only use information directly stated in the search results - do not infer, assume, or add external knowledge.
3. Your response must match the language of the user's query.
4. Citations are MANDATORY for every factual statement. Format citations by placing the chunk number in brackets immediately after the relevant statement with no space, like this: "The temperature is 20 degrees[3]"
5. When possible, include relevant direct quotes from the search results with proper citations.
6. Do not preface responses with phrases like "based on the search results" - simply provide the cited answer.
7. Maintain a clear, professional tone focused on accuracy and fidelity to the source material.

If the search results are completely irrelevant or insufficient to address any part of the query, respond: "I cannot answer this question as the search results do not contain relevant information about [specific topic]."`,
    dataset: `# PostgreSQL Agent System Prompt

## Your Role
You are a SQL agent that queries PostgreSQL databases containing structured data from Excel/CSV files. Your job is to understand user requests, discover available datasets, and execute precise SQL queries to return accurate results.

---

## Core Principle: Data Isolation via notebook_id

**GOLDEN RULE**: Every database query must include \`notebook_id\` filter to ensure you only access data from the correct notebook.

\`\`\`
Every WHERE clause MUST contain: AND notebook_id = '<specific_notebook_id>'
\`\`\`

---

## Workflow: Your Step-by-Step Process

### Step 1: Discover Available Data
**ALWAYS START HERE** - Use your dataset discovery tool to see what data exists in the notebook.

\`\`\`
User: "Show me sales data"
↓
Action: Call Get All Notebook Datasets
↓
Response: 
  - Dataset: sales_2024.xlsx (file_id: sales_001)
    Schema: {order_date, customer_name, amount, region}
  - Dataset: customers.csv (file_id: cust_001)
    Schema: {customer_id, name, email, region}
↓
Think: Which dataset matches "sales data"? → sales_001
\`\`\`

### Step 2: Understand the Schema
Extract from the schema:
- Column names available
- Data types for each column
- Required type casting for queries

\`\`\`
Example: 
Schema shows "amount" is "numeric" 
→ In query, must cast as: (raw_data->>'amount')::numeric
\`\`\`

### Step 3: Construct SQL Query
Build your query based on:
1. **Schema** - Use exact column names and apply correct type casting
2. **User request** - What insights or data they're asking for
3. **Query requirements** - Proper filtering, aggregation, sorting

\`\`\`
Required in every query:
✓ WHERE file_id = '<file_id>'
✓ AND notebook_id = '<notebook_id>'
✓ Proper JSONB extraction with type casting
✓ NULL handling for aggregations
\`\`\`

### Step 4: Execute & Return Results
Call "Execute Query" and present results in a clear, user-friendly format.

---

## Available Tools

### Tool 1: Get All Notebook Datasets

**Purpose**: Discovers all datasets available in the current notebook

**When to use**: ALWAYS use this FIRST before any query

**What it returns**:
- \`file_id\`: Unique identifier for the dataset (required for all queries)
- \`file_name\`: Original filename (e.g., "sales_2024.xlsx")
- \`schema\`: JSON object containing column definitions

**Schema Structure**:
\`\`\`json
{
  "columns": [
    {"name": "customer_id", "type": "integer"},
    {"name": "revenue", "type": "numeric"},
    {"name": "order_date", "type": "timestamp"},
    {"name": "customer_name", "type": "text"}
  ]
}
\`\`\`

**Example Usage**:
\`\`\`
Question: "What datasets are available?"
Action: Call Get All Notebook Datasets
Result: List of all files with their schemas
\`\`\`

---

### Tool 2: Execute Query

**Purpose**: Runs SQL queries against the raw_data_table

**When to use**: After discovering datasets and understanding their schemas

**Query Structure**: All queries operate on JSONB data stored in \`raw_data_table\`

**JSONB Field Extraction** (based on schema datatypes):

\`\`\`sql
-- Text/String (no casting needed)
raw_data->>'column_name'

-- Numeric (decimals, money)
(raw_data->>'column_name')::numeric

-- Integer (whole numbers)
(raw_data->>'column_name')::integer

-- Date
(raw_data->>'column_name')::date

-- Timestamp (date + time)
(raw_data->>'column_name')::timestamp

-- Boolean (true/false)
(raw_data->>'column_name')::boolean
\`\`\`

**Required Filters** (every query must have):
\`\`\`sql
WHERE file_id = '<specific_file_id>'
  AND notebook_id = '<notebook_id>'
\`\`\`

**Supported SQL Operations**:
- ✓ Aggregations: \`SUM\`, \`AVG\`, \`COUNT\`, \`MAX\`, \`MIN\`
- ✓ Grouping: \`GROUP BY\` with aggregate functions
- ✓ Filtering: \`WHERE\` with type comparisons
- ✓ Sorting: \`ORDER BY\`
- ✓ Window functions: \`RANK()\`, \`ROW_NUMBER()\`, \`DENSE_RANK()\`
- ✓ Date functions: \`DATE_TRUNC()\`, \`EXTRACT()\`, \`DATE_PART()\`
- ✓ String functions: \`LIKE\`, \`ILIKE\`, \`UPPER()\`, \`LOWER()\`
- ✓ Limiting: \`LIMIT\`, \`OFFSET\`

**Basic Query Template**:
\`\`\`sql
SELECT 
  raw_data->>'column1' AS col1,
  SUM((raw_data->>'column2')::numeric) AS total
FROM raw_data_table
WHERE file_id = 'dataset_id'
  AND notebook_id = 'notebook_id'
  AND raw_data->>'column2' IS NOT NULL
GROUP BY raw_data->>'column1'
ORDER BY total DESC
LIMIT 10;
\`\`\`

---

## Critical Rules

### ✅ MUST DO:
1. **Always call Get All Notebook Datasets FIRST** - Never assume data structure
2. **Filter by file_id** - Every query: \`WHERE file_id = '<file_id>'\`
3. **Filter by notebook_id** - Every query: \`AND notebook_id = '<notebook_id>'\`
4. **Use schema for type casting** - Cast JSONB values based on schema datatypes
5. **Handle NULLs** - Use \`IS NOT NULL\` to avoid NULL values in aggregations
6. **Limit results** - Use \`LIMIT\` for performance when appropriate
7. **Verify column existence** - Check schema before referencing any column

### ❌ MUST NEVER:
1. Query without discovering data first
2. Forget notebook_id filter (violates data isolation)
3. Assume column names exist without checking schema
4. Mix data from different notebooks
5. Cast JSONB fields without considering datatype
6. Query without file_id filter
7. Ignore NULL values in numeric aggregations

---

## Common Query Patterns

### Pattern 1: Simple Aggregation
\`\`\`sql
SELECT 
  SUM((raw_data->>'amount')::numeric) AS total_sales
FROM raw_data_table
WHERE file_id = 'sales_001'
  AND notebook_id = 'notebook_xyz';
\`\`\`

### Pattern 2: Group By Analysis
\`\`\`sql
SELECT 
  raw_data->>'region' AS region,
  COUNT(*) AS order_count,
  AVG((raw_data->>'amount')::numeric) AS avg_order
FROM raw_data_table
WHERE file_id = 'sales_001'
  AND notebook_id = 'notebook_xyz'
  AND raw_data->>'amount' IS NOT NULL
GROUP BY raw_data->>'region'
ORDER BY order_count DESC;
\`\`\`

### Pattern 3: Date Filtering
\`\`\`sql
SELECT 
  raw_data->>'order_date' AS date,
  raw_data->>'customer_name' AS customer,
  (raw_data->>'amount')::numeric AS amount
FROM raw_data_table
WHERE file_id = 'sales_001'
  AND notebook_id = 'notebook_xyz'
  AND (raw_data->>'order_date')::timestamp >= '2025-01-01'
ORDER BY raw_data->>'order_date' DESC;
\`\`\`

### Pattern 4: Multi-field Filtering
\`\`\`sql
SELECT 
  raw_data->>'product' AS product,
  COUNT(*) AS sales_count
FROM raw_data_table
WHERE file_id = 'sales_001'
  AND notebook_id = 'notebook_xyz'
  AND (raw_data->>'amount')::numeric > 1000
  AND raw_data->>'region' = 'North'
GROUP BY raw_data->>'product'
ORDER BY sales_count DESC;
\`\`\`

### Pattern 5: Top N with Ranking
\`\`\`sql
SELECT 
  raw_data->>'customer_name' AS customer,
  SUM((raw_data->>'amount')::numeric) AS total_revenue,
  RANK() OVER (ORDER BY SUM((raw_data->>'amount')::numeric) DESC) AS rank
FROM raw_data_table
WHERE file_id = 'sales_001'
  AND notebook_id = 'notebook_xyz'
  AND raw_data->>'amount' IS NOT NULL
GROUP BY raw_data->>'customer_name'
ORDER BY total_revenue DESC
LIMIT 10;
\`\`\`

---

## Error Handling Guide

### Error: "Column not found"
**Cause**: Querying a column that doesn't exist in the schema

**Solution**:
- ✓ Always call Get All Notebook Datasets first
- ✓ Check exact column name spelling in schema
- ✓ Verify column exists before using it

### Error: "Type mismatch in operations"
**Cause**: Incorrect type casting or mixing incompatible types

**Solution**:
- ✓ Check datatype in schema
- ✓ Apply correct casting (::numeric, ::timestamp, etc.)
- ✓ Don't perform numeric operations on text fields

### Error: "No results returned"
**Cause**: Query filters are too restrictive or IDs are wrong

**Solution**:
- ✓ Verify file_id is correct
- ✓ Verify notebook_id is correct
- ✓ Check WHERE conditions aren't too restrictive
- ✓ Use \`IS NOT NULL\` for columns with missing values

### Error: "Invalid JSON path"
**Cause**: Incorrect JSONB extraction syntax

**Solution**:
- ✓ Use \`->>\` for text extraction
- ✓ Don't forget casting for non-text types
- ✓ Match exact column names from schema

---

## Summary

You are a precise SQL agent following this process:

1. **Discover** → Call Get All Notebook Datasets
2. **Understand** → Analyze schema for column names and types
3. **Construct** → Build type-safe query with proper filters
4. **Execute** → Run query and return clear results

**Your superpower**: Combining schema knowledge with precise JSONB querying to turn structured data into actionable insights.`
};

export const DEFAULT_STRATEGIES_CONFIG: Record<string, StrategyConfig> = {
    'fusion': {
        id: 'fusion',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/8909945a-4f90-463d-82ca-dff47898e277-Fusion-Based-Search-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-Fusion-Based-Search-Retrieval',
        params: { full_text_weight: 1.0, semantic_weight: 1.0, rrf_k: 5, chunk_limit: 10 }
    },
    'multi-query': {
        id: 'multi-query',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/13c12e8b-40da-4e0b-b74e-e98aba68fecc-multi-rag-retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-multi-query-rag',
        params: { full_text_weight: 1.0, semantic_weight: 1.0, generated_queries: 3, rrf_k: 5, chunk_limit: 10, rerank_top_k: 5 }
    },
    'expanded-hybrid': {
        id: 'expanded-hybrid',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/f5535b5a-d91d-4d0a-a3c4-31499e9c4af6-Expanded-Hybrid-Rerank-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-Expanded-Hybrid-Rerank-Retrieval',
        params: { full_text_weight: 1.0, semantic_weight: 1.0, rrf_k: 5, chunk_limit: 10, rerank_top_k: 5 }
    },
    'semantic-context': {
        id: 'semantic-context',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/d132f7b4-a1f3-4ea4-9a05-58b3edc5581f-Semantic-Context-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-Semantic-Context-Retrieval',
        params: { chunk_limit: 10 }
    },
    'semantic-rerank': {
        id: 'semantic-rerank',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/b0c77709-48c8-47a4-94c3-422141f725a7-Semantic–Reranker-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-Semantic–Reranker-Retrieval',
        params: { chunk_limit: 10, rerank_top_k: 5 }
    },
    'hybrid-rerank': {
        id: 'hybrid-rerank',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/ba1efdb0-52e8-4dcd-b0fe-f1ba26e0b25a-Hybrid-Rerank-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-Hybrid-Rerank-Retrieval',
        params: { full_text_weight: 1.0, semantic_weight: 1.0, rrf_k: 5, chunk_limit: 10, rerank_top_k: 5 }
    },
    'agentic-sql': {
        id: 'agentic-sql',
        retrievalWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-SQL-Retrieval',
        agenticWebhook: 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-SQL-Retrieval',
        params: {}
    },
};

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'landing' | 'app'>(() => {
        const path = window.location.pathname;
        return (path === '/sign-in' || path === '/sign-up') ? 'app' : 'landing';
    });

    const [path, setPath] = useState(window.location.pathname);
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const isUserAdmin = isAdmin(user);

    // Handle URL updates and history changes
    useEffect(() => {
        const handleLocationChange = () => {
            setPath(window.location.pathname);
        };

        // Listen for popstate (back/forward)
        window.addEventListener('popstate', handleLocationChange);

        // Monkey patch pushState/replaceState to detect changes
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);

        window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
            originalPushState(data, unused, url);
            handleLocationChange();
        };

        window.history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
            originalReplaceState(data, unused, url);
            handleLocationChange();
        };

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, []);

    // Redirect to sign-in if accessing app while signed out and not on auth pages
    useEffect(() => {
        if (isLoaded && !isSignedIn && currentView === 'app') {
            if (path !== '/sign-in' && path !== '/sign-up') {
                window.history.replaceState({}, '', '/sign-in');
                setPath('/sign-in');
            }
        }
    }, [isLoaded, isSignedIn, currentView, path]);

    // App State
    const [appMode, setAppMode] = useState<AppMode>('global');
    const [activeGlobalPage, setActiveGlobalPage] = useState<GlobalPage>('dashboard');
    const [activeWorkspacePage, setActiveWorkspacePage] = useState<WorkspacePage>('home');
    const [isConfigLoading, setIsConfigLoading] = useState(false);

    // Selection State
    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
    const [selectedNotebookName, setSelectedNotebookName] = useState<string>('');
    const [selectedNotebookDescription, setSelectedNotebookDescription] = useState<string>('');

    // Configuration State
    // Maps Notebook ID -> NotebookConfig
    // Initialize from LocalStorage to persist settings
    const [notebookConfigs, setNotebookConfigs] = useState<Record<string, NotebookConfig>>(() => {
        try {
            const saved = localStorage.getItem('rag_flow_notebook_configs');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load configs from local storage", e);
            return {};
        }
    });

    // Save to LocalStorage whenever configs change
    useEffect(() => {
        localStorage.setItem('rag_flow_notebook_configs', JSON.stringify(notebookConfigs));
    }, [notebookConfigs]);

    // Helper to sync settings to webhook
    const syncSettingsToWebhook = async (notebookId: string, config: NotebookConfig) => {
        const payload = {
            notebook_id: notebookId,
            system_prompt_retrieval: config.systemPrompts.retrieval,
            system_prompt_dataset: config.systemPrompts.dataset,
            inference_provider: config.inference.provider,
            inference_model: config.inference.model,
            embedding_model: config.embeddingModel,
            inference_temperature: config.inference.temperature,
            active_strategy_id: config.activeStrategyId,
            strategies_config: config.strategies
        };

        console.log("🚀 Syncing Initial/Default Settings to Webhook:", payload);

        try {
            await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-notebook-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.warn("Failed to sync initial settings to webhook:", error);
        }
    };

    // Helper to fetch remote settings and update config
    const fetchRemoteConfig = async (notebookId: string) => {
        try {
            const response = await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-get-current-notebook-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId })
            });

            if (response.ok) {
                const text = await response.text();
                if (!text) return;

                let data;
                try {
                    const json = JSON.parse(text);
                    data = Array.isArray(json) ? json[0] : json;
                } catch (e) {
                    return;
                }

                if (data) {
                    setNotebookConfigs(prev => {
                        const existing = prev[notebookId] || {
                            embeddingModel: '',
                            systemPrompts: DEFAULT_SYSTEM_PROMPTS,
                            inference: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.0 },
                            strategies: JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG)),
                            activeStrategyId: 'fusion'
                        };

                        return {
                            ...prev,
                            [notebookId]: {
                                ...existing,
                                embeddingModel: data.embedding_model || existing.embeddingModel,
                                systemPrompts: {
                                    retrieval: data.system_prompt_retrieval || existing.systemPrompts.retrieval,
                                    dataset: data.system_prompt_dataset || existing.systemPrompts.dataset
                                },
                                inference: {
                                    provider: data.inference_provider || existing.inference.provider,
                                    model: data.inference_model || existing.inference.model,
                                    temperature: data.inference_temperature !== undefined ? Number(data.inference_temperature) : existing.inference.temperature
                                },
                                activeStrategyId: data.active_strategy_id || existing.activeStrategyId,
                                strategies: data.strategies_config || existing.strategies
                            }
                        };
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch remote config", e);
        }
    };

    // Pre-populated with mock data matching the UUIDs in DocumentsPage
    const initialMocks = {
        '550e8400-e29b-41d4-a716-446655440000': 'text-embedding-3-small', // Financial Reports Q3
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'nomic-embed-text:latest', // Engineering Docs
        // Add other mocks as needed for UUIDs
    };

    // Helper to initialize config if missing
    const ensureNotebookConfig = (id: string, embeddingModel?: string) => {
        setNotebookConfigs(prev => {
            const existingConfig = prev[id];

            // Check if we have a mock embedding model for this ID
            const mockEmbedding = (initialMocks as any)[id];
            const finalEmbedding = embeddingModel || (existingConfig ? existingConfig.embeddingModel : mockEmbedding) || '';

            // Deep merge strategies to ensure new defaults appear even for existing configs
            const mergedStrategies = JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG));

            if (existingConfig && existingConfig.strategies) {
                Object.keys(existingConfig.strategies).forEach(key => {
                    if (mergedStrategies[key]) {
                        const existingStrat = existingConfig.strategies[key];
                        const defaultStrat = mergedStrategies[key];

                        mergedStrategies[key] = {
                            ...defaultStrat,
                            ...existingStrat,
                            // Ensure we don't lose the default webhooks if the saved ones are empty
                            retrievalWebhook: existingStrat.retrievalWebhook || defaultStrat.retrievalWebhook,
                            agenticWebhook: existingStrat.agenticWebhook || defaultStrat.agenticWebhook,
                            params: { ...defaultStrat.params, ...existingStrat.params }
                        };
                    }
                });
            }

            return {
                ...prev,
                [id]: {
                    embeddingModel: finalEmbedding,
                    systemPrompts: existingConfig ? existingConfig.systemPrompts : DEFAULT_SYSTEM_PROMPTS,
                    inference: existingConfig ? existingConfig.inference : {
                        provider: 'openai',
                        model: 'gpt-4o-mini',
                        temperature: 0.0,
                    },
                    strategies: mergedStrategies,
                    activeStrategyId: existingConfig ? existingConfig.activeStrategyId : 'fusion'
                }
            };
        });
    };

    const handleStart = () => {
        window.history.pushState({}, '', '/sign-in');
        setCurrentView('app');
        setAppMode('global');
        setActiveGlobalPage('dashboard');
        window.scrollTo(0, 0);
    };

    const handleOpenNotebook = async (id: string, name: string, description: string = '') => {
        // Check permission
        if (!hasNotebookPermission(user, id)) {
            alert("You do not have permission to access this notebook.");
            return;
        }

        setIsConfigLoading(true);
        try {
            setSelectedNotebookId(id);
            setSelectedNotebookName(name);
            setSelectedNotebookDescription(description);

            // Ensure configuration exists with defaults first
            ensureNotebookConfig(id);

            // Fetch remote config to ensure we have the embedding model if it exists
            await fetchRemoteConfig(id);

            setAppMode('workspace');
            setActiveWorkspacePage('home');
        } finally {
            setIsConfigLoading(false);
        }
    };

    const handleBackToGlobal = () => {
        setAppMode('global');
        setSelectedNotebookId(null);
        setSelectedNotebookName('');
        setSelectedNotebookDescription('');
    };

    const handleRegisterEmbedding = (id: string, modelId: string) => {
        // Initialize config with this embedding model
        setNotebookConfigs(prev => {
            // Create a fresh config with defaults
            const newConfig: NotebookConfig = {
                embeddingModel: modelId,
                systemPrompts: DEFAULT_SYSTEM_PROMPTS,
                inference: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    temperature: 0.0,
                },
                strategies: JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG)),
                activeStrategyId: 'fusion'
            };

            // 2. Send this fresh config to webhook immediately
            syncSettingsToWebhook(id, newConfig);

            return {
                ...prev,
                [id]: newConfig
            };
        });
    };

    const handleSetupComplete = (modelId: string) => {
        if (selectedNotebookId) {
            handleRegisterEmbedding(selectedNotebookId, modelId);
        }
    };

    const handleUpdateConfig = (newConfig: NotebookConfig) => {
        if (selectedNotebookId) {
            setNotebookConfigs(prev => ({
                ...prev,
                [selectedNotebookId]: newConfig
            }));
        }
    };

    if (isConfigLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-text-subtle animate-pulse">Loading configuration...</p>
                </div>
            </div>
        );
    }

    if (currentView === 'app') {
        // Determine if we need to show the setup page
        // We check if the config exists AND if embeddingModel is set
        const currentConfig = selectedNotebookId ? notebookConfigs[selectedNotebookId] : undefined;
        const needsSetup = selectedNotebookId && (!currentConfig || !currentConfig.embeddingModel);

        return (
            <>
                <SignedOut>
                    {path === '/sign-up' ? <SignUpPage /> : <SignInPage />}
                </SignedOut>
                <SignedIn>
                    <div className="min-h-screen bg-background text-text-light font-sans flex overflow-hidden relative selection:bg-primary/20 selection:text-primary">
                        {/* Authentication Header */}
                        <Header />

                        {/* Ambient Background Mesh */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse-slow"></div>
                            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                        </div>

                        <div className="relative z-20 flex w-full">
                            {!needsSetup && (
                                <Sidebar
                                    mode={appMode}
                                    activePage={appMode === 'global' ? activeGlobalPage : activeWorkspacePage}
                                    onNavigate={(page) => appMode === 'global' ? setActiveGlobalPage(page as GlobalPage) : setActiveWorkspacePage(page as WorkspacePage)}
                                    onBackToGlobal={handleBackToGlobal}
                                    notebookName={selectedNotebookName}
                                    notebookId={selectedNotebookId || undefined}
                                />
                            )}

                            <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar scroll-smooth">

                                {/* Setup Page (Blocking) */}
                                {needsSetup && (
                                    <NotebookEmbeddingSetup
                                        notebookName={selectedNotebookName}
                                        onComplete={handleSetupComplete}
                                        onCancel={handleBackToGlobal}
                                    />
                                )}

                                {/* Global Pages */}
                                {!needsSetup && appMode === 'global' && (
                                    <>
                                        {activeGlobalPage === 'dashboard' && (
                                            <DashboardPage
                                                onOpenNotebook={handleOpenNotebook}
                                                onRegisterEmbedding={handleRegisterEmbedding}
                                            />
                                        )}
                                        {activeGlobalPage === 'notebooks' && (
                                            <DocumentsPage
                                                onOpenNotebook={handleOpenNotebook}
                                                onRegisterEmbedding={handleRegisterEmbedding}
                                            />
                                        )}
                                        {activeGlobalPage === 'settings' && (
                                            isUserAdmin ? (
                                                <GlobalSettings />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Admin privileges required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}

                                {/* Workspace Pages */}
                                {!needsSetup && appMode === 'workspace' && selectedNotebookId && currentConfig && (
                                    <>
                                        {activeWorkspacePage === 'home' && (
                                            <NotebookDashboard
                                                notebookId={selectedNotebookId}
                                                notebookName={selectedNotebookName}
                                                notebookDescription={selectedNotebookDescription}
                                                onNavigate={(page) => setActiveWorkspacePage(page)}
                                            />
                                        )}
                                        {activeWorkspacePage === 'chat' && (
                                            hasPagePermission(user, 'chat') ? (
                                                <NotebookChat
                                                    config={currentConfig}
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    onConfigChange={handleUpdateConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-text-subtle">Access Denied</div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'documents' && (
                                            hasPagePermission(user, 'documents') ? (
                                                <NotebookDocuments
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    notebookDescription={selectedNotebookDescription}
                                                    config={currentConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Permission required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'search' && (
                                            hasPagePermission(user, 'search') ? (
                                                <PlaygroundSearch
                                                    notebookId={selectedNotebookId}
                                                    config={currentConfig}
                                                    onConfigChange={handleUpdateConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-text-subtle">Access Denied</div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'chart' && (
                                            hasPagePermission(user, 'chart') ? <PlaygroundChart /> : <div className="flex items-center justify-center h-full text-text-subtle">Access Denied</div>
                                        )}
                                        {activeWorkspacePage === 'settings' && (
                                            hasPagePermission(user, 'settings') ? (
                                                <NotebookSettings
                                                    key={selectedNotebookId}
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    config={currentConfig}
                                                    onConfigChange={handleUpdateConfig}
                                                    defaultStrategies={DEFAULT_STRATEGIES_CONFIG}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Permission required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </SignedIn>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-light font-sans selection:bg-primary/30 selection:text-white flex flex-col">
            <Navbar onStart={handleStart} />
            <main className="flex flex-col w-full flex-grow">
                <Hero onStart={handleStart} />
                <Workflow />
                <RagExplanation onStart={handleStart} />
            </main>
            <Footer />
        </div>
    );
};

export default App;
