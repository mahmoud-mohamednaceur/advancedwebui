-- ============================================================
-- AGENT KNOWLEDGE BASE TABLES
-- Schema v2.2 - Agent Tools & Table Metadata Registry
-- ============================================================

-- Drop if exists for clean setup
DROP TABLE IF EXISTS agent_available_tools CASCADE;
DROP TABLE IF EXISTS agent_table_metadata CASCADE;

-- ============================================================
-- 1. AGENT AVAILABLE TOOLS - Tool Registry for AI Agent
-- ============================================================

CREATE TABLE agent_available_tools (
    tool_id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL,
    tool_category TEXT NOT NULL CHECK (tool_category IN (
        'sql_execution', 'data_discovery', 'retrieval', 'search', 
        'file_management', 'chat_management', 'system'
    )),
    description TEXT NOT NULL,
    when_to_use TEXT NOT NULL,
    input_schema JSONB NOT NULL DEFAULT '{}',
    output_schema JSONB NOT NULL DEFAULT '{}',
    example_usage JSONB DEFAULT '[]',
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_notebook_context BOOLEAN DEFAULT TRUE,
    execution_priority INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_tools_category ON agent_available_tools(tool_category);
CREATE INDEX idx_agent_tools_active ON agent_available_tools(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE agent_available_tools IS 
'Registry of all tools available to the AI agent with descriptions and usage guidance.';

-- ============================================================
-- 2. AGENT TABLE METADATA - Database Schema Registry
-- ============================================================

CREATE TABLE agent_table_metadata (
    table_name TEXT PRIMARY KEY,
    table_category TEXT NOT NULL CHECK (table_category IN (
        'core', 'documents', 'chat', 'workflow', 'evaluation', 'agent', 'system'
    )),
    description TEXT NOT NULL,
    purpose TEXT NOT NULL,
    key_columns JSONB NOT NULL DEFAULT '[]',
    relationships JSONB DEFAULT '[]',
    query_patterns JSONB DEFAULT '[]',
    access_notes TEXT,
    is_queryable_by_agent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_metadata_category ON agent_table_metadata(table_category);
CREATE INDEX idx_table_metadata_queryable ON agent_table_metadata(is_queryable_by_agent);

COMMENT ON TABLE agent_table_metadata IS 
'Metadata about all database tables to help the agent understand the schema.';

-- ============================================================
-- DEFAULT DATA: AGENT TOOLS
-- ============================================================

INSERT INTO agent_available_tools (tool_id, tool_name, tool_category, description, when_to_use, input_schema, output_schema, example_usage, webhook_url, requires_notebook_context, execution_priority) VALUES

-- SQL Execution Tools
('execute_sql_query', 'Execute SQL Query', 'sql_execution',
 'Executes a PostgreSQL query against the raw_data_table to analyze tabular data (Excel/CSV files stored as JSONB).',
 'Use when user asks questions about data in uploaded Excel/CSV files. Always include file_id and notebook_id filters. Cast JSONB fields appropriately.',
 '{"query": "string - The SQL query to execute", "file_id": "string - Target file ID", "notebook_id": "uuid - Target notebook ID"}',
 '{"rows": "array - Query result rows", "row_count": "integer", "execution_time_ms": "integer"}',
 '[{"question": "How many rows in the sales data?", "sql": "SELECT COUNT(*) FROM raw_data_table WHERE file_id = ''abc'' AND notebook_id = ''xyz''"}]',
 'https://n8nserver.sportnavi.de/webhook/24bb3ce2-1710-47ae-9ba1-0f9cbf4c37ce-Agentic-SQL-Retrieval',
 TRUE, 1),

('preview_sample_data', 'Preview Sample Data', 'data_discovery',
 'Returns first 5 rows of a dataset to understand its structure and contents.',
 'Use before writing complex queries to understand column names, data types, and sample values.',
 '{"file_id": "string", "notebook_id": "uuid", "limit": "integer - default 5"}',
 '{"sample_rows": "array", "columns": "array of column names"}',
 '[{"purpose": "Explore dataset structure before analysis"}]',
 NULL, TRUE, 2),

('refresh_dataset_list', 'Refresh Dataset List', 'data_discovery',
 'Fetches all available datasets (files) in the current notebook with their schemas.',
 'Use when you need to know what datasets are available or when pre-loaded context is stale.',
 '{"notebook_id": "uuid"}',
 '{"datasets": "array of {file_id, file_name, schema, row_count}"}',
 '[{"purpose": "Discover available data sources"}]',
 NULL, TRUE, 3),

-- RAG Retrieval Tools
('vector_search', 'Vector Similarity Search', 'retrieval',
 'Performs semantic search using vector embeddings to find relevant document chunks.',
 'Use for knowledge-based questions about unstructured documents (PDFs, Word docs, etc.).',
 '{"query": "string", "notebook_id": "uuid", "match_count": "integer - default 10"}',
 '{"chunks": "array of {content, metadata, similarity_score}"}',
 '[{"question": "What does the policy say about refunds?"}]',
 NULL, TRUE, 2),

('hybrid_search', 'Hybrid Search', 'search',
 'Combines full-text search and vector similarity using Reciprocal Rank Fusion for best results.',
 'Use for questions requiring both keyword matching and semantic understanding.',
 '{"query": "string", "notebook_id": "uuid", "full_text_weight": "float", "semantic_weight": "float"}',
 '{"results": "array with combined scores"}',
 '[{"question": "Find documents mentioning customer satisfaction metrics"}]',
 NULL, TRUE, 2),

-- Chat Management
('save_chat_message', 'Save Chat Message', 'chat_management',
 'Saves a message to the chat history for the current conversation.',
 'Called automatically after generating responses.',
 '{"conversation_id": "uuid", "role": "user|assistant", "content": "string", "citations": "jsonb"}',
 '{"message_id": "uuid", "created_at": "timestamp"}',
 '[]',
 NULL, TRUE, 5),

('get_conversation_history', 'Get Conversation History', 'chat_management',
 'Retrieves previous messages from the current conversation for context.',
 'Use when generating responses that may reference earlier discussion.',
 '{"conversation_id": "uuid", "limit": "integer - default 20"}',
 '{"messages": "array of {role, content, created_at}"}',
 '[]',
 NULL, TRUE, 4);

-- ============================================================
-- DEFAULT DATA: TABLE METADATA
-- ============================================================

INSERT INTO agent_table_metadata (table_name, table_category, description, purpose, key_columns, relationships, query_patterns, access_notes, is_queryable_by_agent) VALUES

-- Core Tables
('notebook', 'core',
 'Central notebook management table. Each notebook is a workspace containing documents and settings.',
 'Stores notebook identity, title, description, and document counts.',
 '[{"name": "notebook_id", "type": "UUID", "description": "Primary key"}, {"name": "notebook_title", "type": "TEXT", "description": "Display name"}, {"name": "number_of_documents", "type": "INTEGER", "description": "Count of files"}]',
 '[{"table": "notebook_settings", "type": "one-to-one"}, {"table": "document_records", "type": "one-to-many"}]',
 '[{"pattern": "SELECT * FROM notebook WHERE notebook_id = $1", "use": "Get notebook details"}]',
 'Always filter by notebook_id for data isolation.',
 TRUE),

('notebook_settings', 'core',
 'Configuration settings for each notebook including AI prompts and model settings.',
 'Stores system prompts, embedding model, inference provider, and retrieval strategy configuration.',
 '[{"name": "notebook_id", "type": "UUID", "description": "FK to notebook"}, {"name": "active_strategy_id", "type": "VARCHAR", "description": "Current retrieval strategy"}, {"name": "inference_model", "type": "VARCHAR", "description": "LLM model name"}]',
 '[{"table": "notebook", "type": "one-to-one", "on": "notebook_id"}]',
 '[]',
 'Read-only for agent. Settings managed via UI.',
 FALSE),

-- Document Tables
('documents', 'documents',
 'Vector store for document chunks with embeddings and full-text search.',
 'Stores chunked document content, JSONB metadata, vector embeddings, and auto-generated tsvector for FTS.',
 '[{"name": "id", "type": "BIGSERIAL", "description": "Primary key"}, {"name": "content", "type": "TEXT", "description": "Chunk text"}, {"name": "embedding", "type": "VECTOR", "description": "OpenAI embeddings"}, {"name": "metadata", "type": "JSONB", "description": "file_id, notebook_id, chunk_index"}]',
 '[]',
 '[{"pattern": "SELECT * FROM match_documents(embedding, 10, filter)", "use": "Vector search"}]',
 'Use match_documents() or hybrid_search() functions instead of direct queries.',
 FALSE),

('document_records', 'documents',
 'Document file metadata registry tracking uploaded files.',
 'Stores file identity, type, content hash for deduplication, and document classification.',
 '[{"name": "file_id", "type": "TEXT", "description": "Unique file identifier"}, {"name": "file_name", "type": "TEXT", "description": "Original filename"}, {"name": "document_type", "type": "TEXT", "description": "tabular or non_tabular"}]',
 '[{"table": "notebook", "type": "many-to-one", "on": "notebook_id"}]',
 '[{"pattern": "SELECT file_id, file_name, document_type FROM document_records WHERE notebook_id = $1", "use": "List files in notebook"}]',
 'Query to discover available files.',
 TRUE),

('raw_data_table', 'documents',
 'Storage for tabular data (Excel/CSV) as JSONB rows.',
 'Each row contains one record from the original spreadsheet in JSONB format.',
 '[{"name": "file_id", "type": "TEXT", "description": "Source file ID"}, {"name": "raw_data", "type": "JSONB", "description": "Row data as key-value pairs"}, {"name": "notebook_id", "type": "UUID", "description": "Parent notebook"}]',
 '[{"table": "notebook", "type": "many-to-one"}, {"table": "document_records", "type": "many-to-one", "on": "file_id"}]',
 '[{"pattern": "SELECT raw_data->>''column'' FROM raw_data_table WHERE file_id = $1 AND notebook_id = $2", "use": "Query specific columns"}]',
 'PRIMARY TABLE FOR SQL QUERIES. Always use file_id AND notebook_id filters. Cast JSONB fields appropriately.',
 TRUE),

('contextual_retrieval_table', 'documents',
 'Enhanced document chunks with AI-generated contextual information.',
 'Stores original chunks alongside AI-enhanced versions for better retrieval.',
 '[{"name": "chunk_id", "type": "TEXT", "description": "Primary key"}, {"name": "original_chunk", "type": "TEXT", "description": "Original text"}, {"name": "enhanced_chunk", "type": "TEXT", "description": "AI-enhanced version"}, {"name": "status", "type": "TEXT", "description": "pending/completed/failed"}]',
 '[{"table": "notebook_file_jobs", "type": "many-to-one", "on": "job_id"}]',
 '[]',
 'Used internally by AI enhancement pipeline.',
 FALSE),

-- Chat Tables
('chat_conversations', 'chat',
 'Container for individual chat sessions within a notebook.',
 'Manages multiple conversations per user per notebook with pinning and archiving.',
 '[{"name": "conversation_id", "type": "UUID", "description": "Primary key"}, {"name": "chat_mode", "type": "TEXT", "description": "rag or sql"}, {"name": "title", "type": "TEXT", "description": "Auto-generated from first message"}]',
 '[{"table": "notebook", "type": "many-to-one"}, {"table": "chat_history", "type": "one-to-many"}]',
 '[{"pattern": "SELECT * FROM get_user_conversations(notebook_id, user_id)", "use": "List user conversations"}]',
 'Use provided functions for CRUD operations.',
 FALSE),

('chat_history', 'chat',
 'Individual messages within a conversation.',
 'Stores user and assistant messages with citations and run metadata.',
 '[{"name": "conversation_id", "type": "UUID", "description": "Parent conversation"}, {"name": "role", "type": "VARCHAR", "description": "user or assistant"}, {"name": "content", "type": "TEXT", "description": "Message text"}, {"name": "citations", "type": "JSONB", "description": "Retrieved chunks used"}]',
 '[{"table": "chat_conversations", "type": "many-to-one"}]',
 '[]',
 'Messages cascade delete with conversation.',
 FALSE),

-- Workflow Tables
('notebook_file_jobs', 'workflow',
 'Tracks file processing pipeline status.',
 'Records each file ingestion job with status, errors, and retry counts.',
 '[{"name": "job_id", "type": "UUID", "description": "Primary key"}, {"name": "file_id", "type": "TEXT", "description": "Target file"}, {"name": "status", "type": "TEXT", "description": "pending/processing/completed/failed"}, {"name": "workflow_stage", "type": "TEXT", "description": "Current pipeline stage"}]',
 '[{"table": "notebook", "type": "many-to-one"}]',
 '[{"pattern": "SELECT * FROM notebook_file_jobs WHERE notebook_id = $1 AND status = ''failed''", "use": "Find failed jobs"}]',
 'Query for monitoring pipeline status.',
 TRUE),

-- Agent Tables
('agent_available_tools', 'agent',
 'Registry of all tools available to the AI agent.',
 'Self-referential table - agent reads this to understand its capabilities.',
 '[{"name": "tool_id", "type": "TEXT", "description": "Unique tool identifier"}, {"name": "when_to_use", "type": "TEXT", "description": "Usage guidance"}, {"name": "input_schema", "type": "JSONB", "description": "Expected parameters"}]',
 '[]',
 '[{"pattern": "SELECT tool_id, tool_name, when_to_use FROM agent_available_tools WHERE is_active = TRUE", "use": "Get available tools"}]',
 'Agent should query this to understand available capabilities.',
 TRUE),

('agent_table_metadata', 'agent',
 'Schema documentation for all database tables.',
 'Self-referential table - agent reads this to understand database structure.',
 '[{"name": "table_name", "type": "TEXT", "description": "Table identifier"}, {"name": "purpose", "type": "TEXT", "description": "What the table is for"}, {"name": "query_patterns", "type": "JSONB", "description": "Example queries"}]',
 '[]',
 '[{"pattern": "SELECT table_name, description, query_patterns FROM agent_table_metadata WHERE is_queryable_by_agent = TRUE", "use": "Discover queryable tables"}]',
 'Agent should query this to understand schema before writing SQL.',
 TRUE);

-- ============================================================
-- END OF AGENT KNOWLEDGE BASE SCHEMA
-- ============================================================
