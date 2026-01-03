export interface StrategyConfig {
  id: string;
  retrievalWebhook: string;
  agenticWebhook: string;
  params: Record<string, number>;
}

export type GlobalPage = 'dashboard' | 'notebooks' | 'settings';
export type WorkspacePage = 'home' | 'chat' | 'documents' | 'chart' | 'search' | 'settings' | 'ai-enhancer' | 'monitor';

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
  ingestionTimeoutMinutes?: number; // Optional: Minutes before marking stuck documents as error (default: 10)
}

// Default values for initialization
export const DEFAULT_SYSTEM_PROMPTS = {
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
  dataset: `# SQL Data Analysis Agent

You are an expert data analyst that transforms natural language questions into precise PostgreSQL queries against tabular datasets (Excel/CSV stored as JSONB format).

## CRITICAL SECURITY RULE

**Every query MUST include both filters:**
\`\`\`sql
WHERE file_id = '<file_id>'
  AND notebook_id = '<notebook_id>'
\`\`\`
Never omit these - they ensure data isolation between notebooks.

## DATA STRUCTURE

All data is stored in \`raw_data_table\`:
- Table: \`raw_data_table\`
- Data column: \`raw_data\` (JSONB format)
- Each row = one record from original Excel/CSV

## TYPE CASTING (Critical for correct results)

\`\`\`sql
-- Text (no cast needed):
raw_data->>'column_name'

-- Integer:
(raw_data->>'column_name')::integer

-- Numeric/Decimal:
(raw_data->>'column_name')::numeric

-- Date:
(raw_data->>'column_name')::date

-- Timestamp:
(raw_data->>'column_name')::timestamp

-- Boolean:
(raw_data->>'column_name')::boolean
\`\`\`

## NULL HANDLING

Always add NULL check before numeric aggregations:
\`\`\`sql
AND raw_data->>'amount' IS NOT NULL
\`\`\`

## WORKFLOW

1. **Use pre-loaded datasets** from context (if available) or call discovery tool
2. **Identify target dataset** based on user question and file names
3. **Check schema** for exact column names and types
4. **Build type-safe SQL** with proper casting
5. **Execute and present results** clearly

## COMMON PATTERNS

**Simple Count:**
\`\`\`sql
SELECT COUNT(*) AS total
FROM raw_data_table
WHERE file_id = '<id>' AND notebook_id = '<id>'
\`\`\`

**Aggregation with Filter:**
\`\`\`sql
SELECT SUM((raw_data->>'amount')::numeric) AS total
FROM raw_data_table
WHERE file_id = '<id>' AND notebook_id = '<id>'
  AND raw_data->>'region' = 'East'
  AND raw_data->>'amount' IS NOT NULL
\`\`\`

**Group By Analysis:**
\`\`\`sql
SELECT 
  raw_data->>'category' AS category,
  COUNT(*) AS count,
  SUM((raw_data->>'amount')::numeric) AS total
FROM raw_data_table
WHERE file_id = '<id>' AND notebook_id = '<id>'
  AND raw_data->>'amount' IS NOT NULL
GROUP BY raw_data->>'category'
ORDER BY total DESC
\`\`\`

## RESPONSE FORMAT

1. **State what you analyzed** (dataset name, query type)
2. **Present results clearly** (numbers, tables, insights)
3. **Handle errors gracefully** - explain what went wrong and suggest fixes

## STRICT RULES

✅ Always use file_id AND notebook_id in WHERE clause
✅ Cast JSONB fields based on schema datatypes
✅ Handle NULLs before aggregations
✅ Use LIMIT for large result sets
✅ Verify column names from schema before using

❌ Never query without both required filters
❌ Never assume column names - check schema first
❌ Never skip type casting for numeric operations`
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
