
-- ============================================================
-- ⚠️ CRITICAL: LOCAL DEVELOPMENT SCHEMA FILE
-- ============================================================
-- THIS FILE IS FOR REFERENCE AND DEVELOPMENT ONLY
-- 
-- ⚠️ AGENT INSTRUCTIONS WHEN MODIFYING THIS FILE:
-- 1. ALWAYS create a NEW complete copy of this file with all changes
--    - Name it: schema_v[VERSION]_[DATE].sql (e.g., schema_v2.1_20251230.sql)
--    - Include ALL content, not just the changes
-- 
-- 2. ALWAYS create a companion markdown file explaining changes
--    - Name it: schema_v[VERSION]_[DATE]_CHANGES.md
--    - Document what was added, modified, or removed
--    - Include migration notes if applicable
--
-- 3. User will manually review, test, and copy to database
--
-- 📋 USER WORKFLOW:
-- 1. Review the new schema file and CHANGES.md
-- 2. Test changes in development environment
-- 3. Manually copy and execute SQL in PostgreSQL client
-- 4. Verify changes applied successfully
--
-- 🔴 CHANGES HERE DO NOT AUTO-SYNC TO DATABASE
-- ============================================================


-- ============================================================
-- CLEANUP - FIXED ORDER
-- ============================================================

-- Note: Triggers will be dropped automatically with their tables using CASCADE

-- Drop functions that might depend on tables
DROP FUNCTION IF EXISTS update_conversation_stats() CASCADE;
DROP FUNCTION IF EXISTS delete_notebook CASCADE;
DROP FUNCTION IF EXISTS hybrid_search CASCADE;
DROP FUNCTION IF EXISTS match_documents_ollama CASCADE;
DROP FUNCTION IF EXISTS match_documents CASCADE;
DROP FUNCTION IF EXISTS abandon_jobs CASCADE;
DROP FUNCTION IF EXISTS delete_file_from_notebook CASCADE;
DROP FUNCTION IF EXISTS create_conversation CASCADE;
DROP FUNCTION IF EXISTS delete_conversation CASCADE;
DROP FUNCTION IF EXISTS rename_conversation CASCADE;
DROP FUNCTION IF EXISTS toggle_conversation_pin CASCADE;
DROP FUNCTION IF EXISTS get_user_conversations CASCADE;

-- Drop tables in correct dependency order (child tables first)
DROP TABLE IF EXISTS expanded_hybrid_rerank_eval CASCADE;
DROP TABLE IF EXISTS hybrid_rerank_retrieval_eval CASCADE;
DROP TABLE IF EXISTS multi_query_rag_retrieval_eval CASCADE;
DROP TABLE IF EXISTS semantic_context_retrieval_eval CASCADE;
DROP TABLE IF EXISTS semantic_rerank_retrieval_eval CASCADE;
DROP TABLE IF EXISTS fusion_based_retrieval_eval CASCADE;

DROP TABLE IF EXISTS n8n_chat_histories CASCADE;
DROP TABLE IF EXISTS query_retrieval_history CASCADE;

-- Chat tables: drop child first, then parent
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

DROP TABLE IF EXISTS contextual_retrieval_table CASCADE;
DROP TABLE IF EXISTS raw_data_table CASCADE;
DROP TABLE IF EXISTS metadata_schema CASCADE;
DROP TABLE IF EXISTS document_records CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS notebook_file_jobs CASCADE;
DROP TABLE IF EXISTS notebook_settings CASCADE;
DROP TABLE IF EXISTS notebook CASCADE;

-- Drop extensions last
DROP EXTENSION IF EXISTS pg_net CASCADE;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
DROP EXTENSION IF EXISTS vector CASCADE;

-- Recreate extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- ============================================================
-- NOTEBOOK MANAGEMENT
-- ============================================================

CREATE TABLE notebook (
    notebook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_title TEXT NOT NULL,
    notebook_description TEXT,
    number_of_documents INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notebook_created_at ON notebook(created_at);

COMMENT ON TABLE notebook IS 
'Central notebook management. Each notebook represents a logical grouping of files and processing workflows.';


CREATE TABLE notebook_settings (
    notebook_id UUID PRIMARY KEY REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    
    -- Intelligence / System Prompts
    system_prompt_retrieval TEXT,
    system_prompt_dataset TEXT,
    
    -- Model Inference Settings
    embedding_model VARCHAR(50),
    inference_provider VARCHAR(50),
    inference_model VARCHAR(100),
    inference_temperature DECIMAL(3, 2),
    
    -- Retrieval Strategy Configuration
    active_strategy_id VARCHAR(50),
    strategies_config JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notebook_settings_active_strategy ON notebook_settings(active_strategy_id);

COMMENT ON TABLE notebook_settings IS 
'Configuration settings for each notebook including prompts, model settings, and retrieval strategies.';

-- ============================================================
-- WORKFLOW MANAGEMENT
-- ============================================================

CREATE TABLE notebook_file_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    file_id TEXT,
    file_name TEXT,
    file_type TEXT,
    file_path TEXT,
    file_url TEXT,
    workflow_stage TEXT, 
    status TEXT DEFAULT 'pending',
    error_description TEXT,
    retry_count INTEGER DEFAULT 0,
    ingestion_settings JSONB,
    n8n_execution_id TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notebook_file_jobs_notebook_id ON notebook_file_jobs(notebook_id);
CREATE INDEX idx_notebook_file_jobs_status ON notebook_file_jobs(status);
CREATE INDEX idx_notebook_file_jobs_file_id ON notebook_file_jobs(file_id);
CREATE INDEX idx_notebook_file_jobs_retry ON notebook_file_jobs(status, retry_count) WHERE status = 'failed';

COMMENT ON TABLE notebook_file_jobs IS 
'Tracks file processing jobs within notebooks. Each job represents a file being processed through the pipeline.';

-- ============================================================
-- DOCUMENT STORAGE & RETRIEVAL
-- ============================================================

CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding VECTOR,
    fts TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX idx_documents_fts ON documents USING gin(fts);
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);

COMMENT ON TABLE documents IS 
'Document chunks with vector embeddings and full-text search support.';


CREATE TABLE document_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    schema TEXT,
    document_type TEXT CHECK (document_type IN ('tabular', 'non_tabular')),
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_document_records_file_id ON document_records(file_id);
CREATE INDEX idx_document_records_notebook_id ON document_records(notebook_id);
CREATE INDEX idx_document_records_file_notebook ON document_records(file_id, notebook_id);

COMMENT ON TABLE document_records IS 
'Document metadata and processing history. Tracks document types and content hashes for deduplication.';

-- ============================================================
-- DATA STORAGE
-- ============================================================

CREATE TABLE metadata_schema (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    allowed_values TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

COMMENT ON TABLE metadata_schema IS 
'Defines allowed metadata fields and their valid values.';


CREATE TABLE raw_data_table (
    id SERIAL PRIMARY KEY,
    file_id TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_raw_data_file_notebook ON raw_data_table(file_id, notebook_id);

COMMENT ON TABLE raw_data_table IS 
'Raw tabular data (Excel, CSV) stored as JSONB.';


CREATE TABLE contextual_retrieval_table (
    chunk_id TEXT PRIMARY KEY NOT NULL,
    job_id UUID REFERENCES notebook_file_jobs(job_id) ON DELETE SET NULL,
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_content TEXT NOT NULL, 
    original_chunk TEXT,
    enhanced_chunk TEXT,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contextual_retrieval_job_id ON contextual_retrieval_table(job_id);
CREATE INDEX idx_contextual_retrieval_file_id ON contextual_retrieval_table(file_id);
CREATE INDEX idx_contextual_retrieval_status ON contextual_retrieval_table(status);
CREATE INDEX idx_contextual_retrieval_notebook_id ON contextual_retrieval_table(notebook_id);

COMMENT ON TABLE contextual_retrieval_table IS 
'Enhanced document chunks with contextual information. Supports chunk enrichment and status tracking.';

-- ============================================================
-- CHAT CONVERSATIONS & HISTORY (MULTI-CONVERSATION SUPPORT)
-- ============================================================

CREATE TABLE chat_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    chat_mode TEXT NOT NULL DEFAULT 'rag' CHECK (chat_mode IN ('rag', 'sql')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_notebook_id ON chat_conversations(notebook_id);
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_notebook_user ON chat_conversations(notebook_id, user_id);
CREATE INDEX idx_chat_conversations_last_message ON chat_conversations(notebook_id, user_id, last_message_at DESC);
CREATE INDEX idx_chat_conversations_pinned ON chat_conversations(notebook_id, user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_chat_conversations_mode ON chat_conversations(notebook_id, user_id, chat_mode);

COMMENT ON TABLE chat_conversations IS 
'Individual chat conversations within a notebook. Each user can have multiple conversations per notebook with different modes (rag or sql).';

COMMENT ON COLUMN chat_conversations.chat_mode IS 
'Chat mode: "rag" for document retrieval and knowledge-based answers, "sql" for structured data analysis with SQL queries.';


CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, 
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    run_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_history_conversation_id ON chat_history(conversation_id);
CREATE INDEX idx_chat_history_notebook_id ON chat_history(notebook_id);
CREATE INDEX idx_chat_history_conversation_created ON chat_history(conversation_id, created_at ASC);
CREATE INDEX idx_chat_history_notebook_created ON chat_history(notebook_id, created_at DESC);
CREATE INDEX idx_chat_history_role ON chat_history(role);
CREATE INDEX idx_chat_history_citations ON chat_history USING gin(citations);
CREATE INDEX idx_chat_history_run_metadata ON chat_history USING gin(run_metadata);

COMMENT ON TABLE chat_history IS 
'Conversation messages for notebook chat sessions. Each message belongs to a specific conversation.';

COMMENT ON COLUMN chat_history.conversation_id IS 
'Reference to the parent conversation this message belongs to.';

COMMENT ON COLUMN chat_history.citations IS 
'JSONB array storing retrieved chunks used for this assistant response.';

COMMENT ON COLUMN chat_history.run_metadata IS 
'Metadata about the generation run: strategy used, latency, model, token counts, etc.';


CREATE TABLE query_retrieval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_query TEXT NOT NULL,
    retrieved_chunks JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_query_retrieval_notebook_id ON query_retrieval_history(notebook_id);
CREATE INDEX idx_query_retrieval_created_at ON query_retrieval_history(created_at);

COMMENT ON TABLE query_retrieval_history IS 
'Stores query results for caching and analysis purposes.';


CREATE TABLE n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    message JSONB NOT NULL
);

CREATE INDEX idx_n8n_chat_histories_session_id ON n8n_chat_histories(session_id);

COMMENT ON TABLE n8n_chat_histories IS 
'Chat conversation history for n8n workflows.';

-- ============================================================
-- CHAT CONVERSATION FUNCTIONS
-- ============================================================

-- Create a new conversation with chat mode
CREATE OR REPLACE FUNCTION create_conversation(
    p_notebook_id UUID,
    p_user_id TEXT,
    p_title TEXT DEFAULT 'New Chat',
    p_chat_mode TEXT DEFAULT 'rag'
)
RETURNS TABLE (
    conversation_id UUID,
    notebook_id UUID,
    user_id TEXT,
    title TEXT,
    chat_mode TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_conversation_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- Validate chat_mode
    IF p_chat_mode NOT IN ('rag', 'sql') THEN
        RAISE EXCEPTION 'Invalid chat_mode: %. Must be "rag" or "sql"', p_chat_mode;
    END IF;

    INSERT INTO chat_conversations (notebook_id, user_id, title, chat_mode)
    VALUES (p_notebook_id, p_user_id, p_title, p_chat_mode)
    RETURNING chat_conversations.conversation_id, chat_conversations.created_at 
    INTO v_conversation_id, v_created_at;
    
    RETURN QUERY
    SELECT 
        v_conversation_id,
        p_notebook_id,
        p_user_id,
        p_title,
        p_chat_mode,
        v_created_at;
END;
$$;

COMMENT ON FUNCTION create_conversation IS 
'Creates a new chat conversation for a user within a notebook with specified mode (rag or sql).';


-- Delete a conversation (messages cascade automatically)
CREATE OR REPLACE FUNCTION delete_conversation(
    p_conversation_id UUID,
    p_user_id TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    conversation_id UUID,
    messages_deleted BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_message_count BIGINT;
BEGIN
    -- Get message count before deletion
    SELECT COUNT(*) INTO v_message_count
    FROM chat_history ch
    WHERE ch.conversation_id = p_conversation_id;
    
    -- Delete the conversation (messages cascade)
    DELETE FROM chat_conversations cc
    WHERE cc.conversation_id = p_conversation_id 
      AND cc.user_id = p_user_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT TRUE, p_conversation_id, v_message_count;
    ELSE
        RETURN QUERY SELECT FALSE, p_conversation_id, 0::BIGINT;
    END IF;
END;
$$;

COMMENT ON FUNCTION delete_conversation IS 
'Deletes a chat conversation and all its messages. Only the owner can delete.';


-- Rename a conversation
CREATE OR REPLACE FUNCTION rename_conversation(
    p_conversation_id UUID,
    p_user_id TEXT,
    p_new_title TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE chat_conversations
    SET title = p_new_title, updated_at = NOW()
    WHERE conversation_id = p_conversation_id 
      AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION rename_conversation IS 
'Renames a chat conversation. Only the owner can rename.';


-- Toggle pin status
CREATE OR REPLACE FUNCTION toggle_conversation_pin(
    p_conversation_id UUID,
    p_user_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_status BOOLEAN;
BEGIN
    UPDATE chat_conversations
    SET is_pinned = NOT is_pinned, updated_at = NOW()
    WHERE conversation_id = p_conversation_id 
      AND user_id = p_user_id
    RETURNING is_pinned INTO v_new_status;
    
    RETURN v_new_status;
END;
$$;

COMMENT ON FUNCTION toggle_conversation_pin IS 
'Toggles the pinned status of a conversation. Returns the new status.';


-- Update conversation stats (triggered after message insert)
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE chat_conversations
    SET 
        message_count = message_count + 1,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        -- Auto-title from first user message if still default
        title = CASE 
            WHEN title = 'New Chat' AND NEW.role = 'user' 
            THEN LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
            ELSE title
        END
    WHERE conversation_id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_stats
AFTER INSERT ON chat_history
FOR EACH ROW
EXECUTE FUNCTION update_conversation_stats();

COMMENT ON FUNCTION update_conversation_stats IS 
'Automatically updates conversation metadata when new messages are added. Auto-generates title from first user message.';


-- Get conversations for a user in a notebook (includes chat_mode)
CREATE OR REPLACE FUNCTION get_user_conversations(
    p_notebook_id UUID,
    p_user_id TEXT,
    p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    conversation_id UUID,
    title TEXT,
    chat_mode TEXT,
    is_pinned BOOLEAN,
    is_archived BOOLEAN,
    message_count INTEGER,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.conversation_id,
        cc.title,
        cc.chat_mode,
        cc.is_pinned,
        cc.is_archived,
        cc.message_count,
        cc.last_message_at,
        cc.created_at
    FROM chat_conversations cc
    WHERE cc.notebook_id = p_notebook_id 
      AND cc.user_id = p_user_id
      AND (p_include_archived OR cc.is_archived = FALSE)
    ORDER BY cc.is_pinned DESC, cc.last_message_at DESC NULLS LAST, cc.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_user_conversations IS 
'Gets all conversations for a user in a notebook, including chat_mode, ordered by pinned status then recency.';

-- ============================================================
-- CORE FUNCTIONS
-- ============================================================

-- Vector Search for OpenAI embeddings (1536 dimensions)
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 10,
    filter JSONB DEFAULT '{}'
) 
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        (1 - (documents.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
    FROM documents
    WHERE documents.metadata @> filter
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents IS 
'Vector similarity search for OpenAI embeddings (1536 dimensions).';


-- Vector Search for Ollama embeddings (768 dimensions)
CREATE OR REPLACE FUNCTION match_documents_ollama(
    query_embedding VECTOR(768),
    match_count INT DEFAULT 10,
    filter JSONB DEFAULT '{}'
) 
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        (1 - (documents.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
    FROM documents
    WHERE documents.metadata @> filter
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_documents_ollama IS 
'Vector similarity search for Ollama embeddings (768 dimensions).';


-- Hybrid Search (Full-Text + Semantic)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 10,
    filter JSONB DEFAULT '{}',
    full_text_weight FLOAT DEFAULT 1.0,
    semantic_weight FLOAT DEFAULT 1.0,
    rrf_k INT DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    content TEXT,
    metadata JSONB,
    fts_rank INT,
    semantic_rank INT,
    combined_score FLOAT
)
LANGUAGE sql
AS $$
WITH full_text AS (
    SELECT
        documents.id,
        ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, websearch_to_tsquery(query_text)) DESC) AS rank_ix
    FROM documents
    WHERE fts @@ websearch_to_tsquery(query_text)
        AND documents.metadata @> filter
    ORDER BY rank_ix
    LIMIT LEAST(match_count, 30) * 2
),
semantic AS (
    SELECT
        documents.id,
        ROW_NUMBER() OVER (ORDER BY embedding <#> query_embedding) AS rank_ix
    FROM documents
    WHERE documents.metadata @> filter
    ORDER BY rank_ix
    LIMIT LEAST(match_count, 30) * 2
)
SELECT
    documents.id,
    documents.content,
    documents.metadata,
    full_text.rank_ix::INT AS fts_rank,
    semantic.rank_ix::INT AS semantic_rank,
    (COALESCE(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight +
     COALESCE(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight) AS combined_score
FROM full_text
FULL OUTER JOIN semantic ON full_text.id = semantic.id
JOIN documents ON COALESCE(full_text.id, semantic.id) = documents.id
ORDER BY combined_score DESC
LIMIT LEAST(match_count, 30)
$$;

COMMENT ON FUNCTION hybrid_search IS 
'Hybrid search combining full-text and semantic search using Reciprocal Rank Fusion (RRF).';


-- Abandon Jobs (Mark as Permanently Failed)
CREATE OR REPLACE FUNCTION abandon_jobs(
    p_job_ids UUID[],
    p_reason TEXT DEFAULT 'Max retries exceeded'
)
RETURNS TABLE (
    job_id UUID,
    notebook_id UUID,
    file_id TEXT,
    file_name TEXT,
    previous_status TEXT,
    retry_count INTEGER,
    abandoned_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE notebook_file_jobs nfj
    SET 
        status = 'failed',
        error_description = CASE 
            WHEN nfj.error_description IS NULL OR nfj.error_description = '' 
            THEN p_reason
            ELSE nfj.error_description || ' | ' || p_reason
        END,
        updated_at = NOW()
    WHERE nfj.job_id = ANY(p_job_ids)
      AND nfj.status != 'completed'
    RETURNING 
        nfj.job_id,
        nfj.notebook_id,
        nfj.file_id,
        nfj.file_name,
        nfj.status,
        nfj.retry_count,
        NOW();
END;
$$;

COMMENT ON FUNCTION abandon_jobs IS 
'Marks jobs as permanently failed with a custom reason. Skips already completed jobs.';


-- Delete a notebook and all associated data
CREATE OR REPLACE FUNCTION delete_notebook(
    p_notebook_id UUID
)
RETURNS TABLE (
    notebook_id UUID,
    notebook_title TEXT,
    documents_deleted BIGINT,
    document_records_deleted BIGINT,
    jobs_deleted BIGINT,
    chunks_deleted BIGINT,
    chat_messages_deleted BIGINT,
    conversations_deleted BIGINT,
    raw_data_deleted BIGINT,
    deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_notebook_title TEXT;
    v_documents_deleted BIGINT;
    v_document_records_deleted BIGINT;
    v_jobs_deleted BIGINT;
    v_chunks_deleted BIGINT;
    v_chat_deleted BIGINT;
    v_conversations_deleted BIGINT;
    v_raw_data_deleted BIGINT;
BEGIN
    -- Get notebook title and verify it exists
    SELECT nb.notebook_title INTO v_notebook_title
    FROM notebook nb
    WHERE nb.notebook_id = p_notebook_id;
    
    IF v_notebook_title IS NULL THEN
        RAISE EXCEPTION 'Notebook with ID % does not exist', p_notebook_id;
    END IF;
    
    -- Delete from documents table (no FK - uses metadata JSONB)
    DELETE FROM documents 
    WHERE metadata->>'notebook_id' = p_notebook_id::TEXT;
    GET DIAGNOSTICS v_documents_deleted = ROW_COUNT;
    
    -- Get counts before cascade delete for reporting
    SELECT COUNT(*) INTO v_document_records_deleted 
    FROM document_records dr WHERE dr.notebook_id = p_notebook_id;
    
    SELECT COUNT(*) INTO v_jobs_deleted 
    FROM notebook_file_jobs nfj WHERE nfj.notebook_id = p_notebook_id;
    
    SELECT COUNT(*) INTO v_chunks_deleted 
    FROM contextual_retrieval_table crt WHERE crt.notebook_id = p_notebook_id;
    
    SELECT COUNT(*) INTO v_chat_deleted 
    FROM chat_history ch WHERE ch.notebook_id = p_notebook_id;
    
    SELECT COUNT(*) INTO v_conversations_deleted 
    FROM chat_conversations cc WHERE cc.notebook_id = p_notebook_id;
    
    SELECT COUNT(*) INTO v_raw_data_deleted 
    FROM raw_data_table rdt WHERE rdt.notebook_id = p_notebook_id;
    
    -- Delete the notebook (CASCADE handles all related tables)
    DELETE FROM notebook nb WHERE nb.notebook_id = p_notebook_id;
    
    RETURN QUERY
    SELECT 
        p_notebook_id,
        v_notebook_title,
        v_documents_deleted,
        v_document_records_deleted,
        v_jobs_deleted,
        v_chunks_deleted,
        v_chat_deleted,
        v_conversations_deleted,
        v_raw_data_deleted,
        NOW();
END;
$$;

COMMENT ON FUNCTION delete_notebook IS 
'Deletes a notebook and ALL associated data including documents, jobs, chunks, conversations, chat history, and raw data. Returns counts of deleted records.';


-- Delete a file from a notebook
CREATE OR REPLACE FUNCTION delete_file_from_notebook(
    p_file_id TEXT,
    p_notebook_id UUID
)
RETURNS TABLE (
    notebook_id UUID,
    file_id TEXT,
    file_name TEXT,
    documents_deleted BIGINT,
    document_records_deleted BIGINT,
    chunks_deleted BIGINT,
    raw_data_deleted BIGINT,
    jobs_deleted BIGINT,
    deleted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_file_name TEXT;
    v_documents_deleted BIGINT;
    v_document_records_deleted BIGINT;
    v_chunks_deleted BIGINT;
    v_raw_data_deleted BIGINT;
    v_jobs_deleted BIGINT;
BEGIN
    -- Verify the notebook exists
    IF NOT EXISTS (SELECT 1 FROM notebook nb WHERE nb.notebook_id = p_notebook_id) THEN
        RAISE EXCEPTION 'Notebook with ID % does not exist', p_notebook_id;
    END IF;
    
    -- Get the file name from document_records (if exists)
    SELECT dr.file_name INTO v_file_name
    FROM document_records dr
    WHERE dr.file_id = p_file_id 
      AND dr.notebook_id = p_notebook_id
    LIMIT 1;
    
    -- If not found in document_records, try contextual_retrieval_table
    IF v_file_name IS NULL THEN
        SELECT crt.file_name INTO v_file_name
        FROM contextual_retrieval_table crt
        WHERE crt.file_id = p_file_id 
          AND crt.notebook_id = p_notebook_id
        LIMIT 1;
    END IF;
    
    -- If not found in contextual_retrieval_table, try notebook_file_jobs
    IF v_file_name IS NULL THEN
        SELECT nfj.file_name INTO v_file_name
        FROM notebook_file_jobs nfj
        WHERE nfj.file_id = p_file_id 
          AND nfj.notebook_id = p_notebook_id
        LIMIT 1;
    END IF;
    
    -- Default file name if not found anywhere
    IF v_file_name IS NULL THEN
        v_file_name := 'Unknown';
    END IF;
    
    -- Delete from documents table (uses metadata JSONB for file_id and notebook_id)
    DELETE FROM documents d
    WHERE d.metadata->>'file_id' = p_file_id
      AND d.metadata->>'notebook_id' = p_notebook_id::TEXT;
    GET DIAGNOSTICS v_documents_deleted = ROW_COUNT;
    
    -- Delete from document_records
    DELETE FROM document_records dr
    WHERE dr.file_id = p_file_id
      AND dr.notebook_id = p_notebook_id;
    GET DIAGNOSTICS v_document_records_deleted = ROW_COUNT;
    
    -- Delete from contextual_retrieval_table
    DELETE FROM contextual_retrieval_table crt
    WHERE crt.file_id = p_file_id
      AND crt.notebook_id = p_notebook_id;
    GET DIAGNOSTICS v_chunks_deleted = ROW_COUNT;
    
    -- Delete from raw_data_table
    DELETE FROM raw_data_table rdt
    WHERE rdt.file_id = p_file_id
      AND rdt.notebook_id = p_notebook_id;
    GET DIAGNOSTICS v_raw_data_deleted = ROW_COUNT;
    
    -- Delete from notebook_file_jobs
    DELETE FROM notebook_file_jobs nfj
    WHERE nfj.file_id = p_file_id
      AND nfj.notebook_id = p_notebook_id;
    GET DIAGNOSTICS v_jobs_deleted = ROW_COUNT;
    
    -- Update the notebook's document count
    UPDATE notebook nb
    SET 
        number_of_documents = GREATEST(0, nb.number_of_documents - v_document_records_deleted::INTEGER),
        updated_at = NOW()
    WHERE nb.notebook_id = p_notebook_id;
    
    RETURN QUERY
    SELECT 
        p_notebook_id,
        p_file_id,
        v_file_name,
        v_documents_deleted,
        v_document_records_deleted,
        v_chunks_deleted,
        v_raw_data_deleted,
        v_jobs_deleted,
        NOW();
END;
$$;

COMMENT ON FUNCTION delete_file_from_notebook IS 
'Deletes a file and ALL associated data from a notebook including document chunks, records, contextual chunks, raw data, and processing jobs. Also updates the notebook document count.';

-- ============================================================
-- EVALUATION TABLES
-- ============================================================

CREATE TABLE expanded_hybrid_rerank_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    retrieval_strategy TEXT DEFAULT 'expanded_hybrid_rerank',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_expanded_hybrid_done ON expanded_hybrid_rerank_eval(done);
CREATE INDEX idx_expanded_hybrid_notebook_id ON expanded_hybrid_rerank_eval(notebook_id);
CREATE INDEX idx_expanded_hybrid_user_id ON expanded_hybrid_rerank_eval(user_id);
CREATE INDEX idx_expanded_hybrid_question_hash ON expanded_hybrid_rerank_eval(question_hash);
CREATE UNIQUE INDEX idx_expanded_hybrid_unique_question_notebook 
    ON expanded_hybrid_rerank_eval(question_hash, notebook_id);
CREATE INDEX idx_expanded_hybrid_notebook_done 
    ON expanded_hybrid_rerank_eval(notebook_id, done);

COMMENT ON TABLE expanded_hybrid_rerank_eval IS 
'Evaluation results for Expanded Hybrid Rerank retrieval strategy';


CREATE TABLE hybrid_rerank_retrieval_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    retrieval_strategy TEXT DEFAULT 'hybrid_rerank',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_hybrid_rerank_done ON hybrid_rerank_retrieval_eval(done);
CREATE INDEX idx_hybrid_rerank_notebook_id ON hybrid_rerank_retrieval_eval(notebook_id);
CREATE INDEX idx_hybrid_rerank_user_id ON hybrid_rerank_retrieval_eval(user_id);
CREATE INDEX idx_hybrid_rerank_question_hash ON hybrid_rerank_retrieval_eval(question_hash);
CREATE UNIQUE INDEX idx_hybrid_rerank_unique_question_notebook 
    ON hybrid_rerank_retrieval_eval(question_hash, notebook_id);

COMMENT ON TABLE hybrid_rerank_retrieval_eval IS 
'Evaluation results for Hybrid Rerank retrieval strategy';


CREATE TABLE multi_query_rag_retrieval_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    num_queries INTEGER DEFAULT 3,
    retrieval_strategy TEXT DEFAULT 'multi_query_rag',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_multi_query_done ON multi_query_rag_retrieval_eval(done);
CREATE INDEX idx_multi_query_notebook_id ON multi_query_rag_retrieval_eval(notebook_id);
CREATE INDEX idx_multi_query_user_id ON multi_query_rag_retrieval_eval(user_id);
CREATE INDEX idx_multi_query_question_hash ON multi_query_rag_retrieval_eval(question_hash);
CREATE UNIQUE INDEX idx_multi_query_unique_question_notebook 
    ON multi_query_rag_retrieval_eval(question_hash, notebook_id);

COMMENT ON TABLE multi_query_rag_retrieval_eval IS 
'Evaluation results for Multi Query RAG retrieval strategy';


CREATE TABLE semantic_context_retrieval_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    context_window_size INTEGER DEFAULT 2,
    retrieval_strategy TEXT DEFAULT 'semantic_context',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_semantic_context_done ON semantic_context_retrieval_eval(done);
CREATE INDEX idx_semantic_context_notebook_id ON semantic_context_retrieval_eval(notebook_id);
CREATE INDEX idx_semantic_context_user_id ON semantic_context_retrieval_eval(user_id);
CREATE INDEX idx_semantic_context_question_hash ON semantic_context_retrieval_eval(question_hash);
CREATE UNIQUE INDEX idx_semantic_context_unique_question_notebook 
    ON semantic_context_retrieval_eval(question_hash, notebook_id);

COMMENT ON TABLE semantic_context_retrieval_eval IS 
'Evaluation results for Semantic Context retrieval strategy';


CREATE TABLE semantic_rerank_retrieval_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    retrieval_strategy TEXT DEFAULT 'semantic_rerank',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_semantic_rerank_done ON semantic_rerank_retrieval_eval(done);
CREATE INDEX idx_semantic_rerank_notebook_id ON semantic_rerank_retrieval_eval(notebook_id);
CREATE INDEX idx_semantic_rerank_user_id ON semantic_rerank_retrieval_eval(user_id);
CREATE INDEX idx_semantic_rerank_question_hash ON semantic_rerank_retrieval_eval(question_hash);
CREATE UNIQUE INDEX idx_semantic_rerank_unique_question_notebook 
    ON semantic_rerank_retrieval_eval(question_hash, notebook_id);

COMMENT ON TABLE semantic_rerank_retrieval_eval IS 
'Evaluation results for Semantic Rerank retrieval strategy';


CREATE TABLE fusion_based_retrieval_eval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    question_hash TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    actual_answer TEXT,
    correctness TEXT,
    helpfulness TEXT,
    notebook_id UUID NOT NULL REFERENCES notebook(notebook_id) ON DELETE CASCADE,
    notebook_title TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature DECIMAL(3, 2),
    match_count INTEGER NOT NULL,
    full_text_weight DECIMAL(3, 2) NOT NULL,
    semantic_weight DECIMAL(3, 2) NOT NULL,
    rerank_top_k INTEGER NOT NULL,
    rrf_k INTEGER NOT NULL,
    fusion_alpha DECIMAL(3, 2) DEFAULT 0.5,
    retrieval_strategy TEXT DEFAULT 'fusion_based',
    evaluation_metadata JSONB DEFAULT '{}'::jsonb,
    done BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_fusion_based_done ON fusion_based_retrieval_eval(done);
CREATE INDEX idx_fusion_based_notebook_id ON fusion_based_retrieval_eval(notebook_id);
CREATE INDEX idx_fusion_based_user_id ON fusion_based_retrieval_eval(user_id);
CREATE INDEX idx_fusion_based_question_hash ON fusion_based_retrieval_eval(question_hash);
CREATE UNIQUE INDEX idx_fusion_based_unique_question_notebook 
    ON fusion_based_retrieval_eval(question_hash, notebook_id);

COMMENT ON TABLE fusion_based_retrieval_eval IS 
'Evaluation results for Fusion Based retrieval strategy';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
