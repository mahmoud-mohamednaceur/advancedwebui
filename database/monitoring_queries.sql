-- ============================================================
-- NOTEBOOK MONITORING QUERIES
-- For Dashboard & Data Quality Monitoring
-- ============================================================

-- ============================================================
-- 1. DUPLICATE CHUNK DETECTION
-- ============================================================

-- 1.1 Find exact duplicate chunks within the same notebook (contextual_retrieval_table)
-- Returns chunks that have identical original_chunk content within the same notebook
SELECT 
    notebook_id,
    original_chunk,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(chunk_id) AS chunk_ids,
    ARRAY_AGG(file_id) AS file_ids,
    ARRAY_AGG(file_name) AS file_names,
    MIN(created_at) AS first_created,
    MAX(created_at) AS last_created
FROM contextual_retrieval_table
WHERE original_chunk IS NOT NULL AND original_chunk != ''
GROUP BY notebook_id, original_chunk
HAVING COUNT(*) > 1
ORDER BY notebook_id, duplicate_count DESC;


-- 1.2 Find exact duplicate chunks within the same FILE (more granular)
SELECT 
    notebook_id,
    file_id,
    file_name,
    original_chunk,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(chunk_id) AS chunk_ids
FROM contextual_retrieval_table
WHERE original_chunk IS NOT NULL AND original_chunk != ''
GROUP BY notebook_id, file_id, file_name, original_chunk
HAVING COUNT(*) > 1
ORDER BY notebook_id, file_id, duplicate_count DESC;


-- 1.3 Find duplicate enhanced chunks within the same notebook
SELECT 
    notebook_id,
    enhanced_chunk,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(chunk_id) AS chunk_ids,
    ARRAY_AGG(file_name) AS file_names
FROM contextual_retrieval_table
WHERE enhanced_chunk IS NOT NULL AND enhanced_chunk != ''
GROUP BY notebook_id, enhanced_chunk
HAVING COUNT(*) > 1
ORDER BY notebook_id, duplicate_count DESC;


-- 1.4 Find duplicate content in documents table (vector store)
SELECT 
    metadata->>'notebook_id' AS notebook_id,
    content,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(id) AS document_ids,
    ARRAY_AGG(metadata->>'file_id') AS file_ids,
    ARRAY_AGG(metadata->>'file_name') AS file_names
FROM documents
WHERE content IS NOT NULL AND content != ''
GROUP BY metadata->>'notebook_id', content
HAVING COUNT(*) > 1
ORDER BY metadata->>'notebook_id', duplicate_count DESC;


-- 1.5 Find near-duplicate chunks using content hash comparison
-- This query finds chunks where the content is similar but not exact
SELECT 
    crt1.notebook_id,
    crt1.chunk_id AS chunk_1_id,
    crt2.chunk_id AS chunk_2_id,
    crt1.file_name AS file_1,
    crt2.file_name AS file_2,
    LENGTH(crt1.original_chunk) AS chunk_1_length,
    LENGTH(crt2.original_chunk) AS chunk_2_length,
    LEFT(crt1.original_chunk, 100) AS chunk_1_preview,
    LEFT(crt2.original_chunk, 100) AS chunk_2_preview
FROM contextual_retrieval_table crt1
JOIN contextual_retrieval_table crt2 
    ON crt1.notebook_id = crt2.notebook_id
    AND crt1.chunk_id < crt2.chunk_id  -- Avoid self-joins and duplicates
    AND MD5(LOWER(TRIM(crt1.original_chunk))) = MD5(LOWER(TRIM(crt2.original_chunk)))
WHERE crt1.original_chunk IS NOT NULL 
    AND crt2.original_chunk IS NOT NULL
ORDER BY crt1.notebook_id, crt1.file_name;


-- ============================================================
-- 2. NOTEBOOK HEALTH SUMMARY
-- ============================================================

-- 2.1 Comprehensive notebook health overview
SELECT 
    n.notebook_id,
    n.notebook_title,
    n.number_of_documents,
    n.created_at,
    n.updated_at,
    
    -- Document Records Stats
    COALESCE(dr.doc_count, 0) AS actual_document_records,
    COALESCE(dr.tabular_count, 0) AS tabular_documents,
    COALESCE(dr.non_tabular_count, 0) AS non_tabular_documents,
    
    -- Chunk Stats
    COALESCE(crt.total_chunks, 0) AS total_chunks,
    COALESCE(crt.pending_chunks, 0) AS pending_chunks,
    COALESCE(crt.completed_chunks, 0) AS completed_chunks,
    COALESCE(crt.failed_chunks, 0) AS failed_chunks,
    COALESCE(crt.enhanced_chunks, 0) AS enhanced_chunks,
    
    -- Job Stats
    COALESCE(jobs.total_jobs, 0) AS total_jobs,
    COALESCE(jobs.pending_jobs, 0) AS pending_jobs,
    COALESCE(jobs.processing_jobs, 0) AS processing_jobs,
    COALESCE(jobs.completed_jobs, 0) AS completed_jobs,
    COALESCE(jobs.failed_jobs, 0) AS failed_jobs,
    
    -- Vector Store Stats
    COALESCE(docs.vector_count, 0) AS vector_documents,
    
    -- Duplicate Detection
    COALESCE(dups.duplicate_chunk_groups, 0) AS duplicate_chunk_groups,
    COALESCE(dups.total_duplicate_chunks, 0) AS total_duplicate_chunks,
    
    -- Chat Stats
    COALESCE(chat.message_count, 0) AS chat_messages

FROM notebook n

-- Document Records
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS doc_count,
        COUNT(*) FILTER (WHERE document_type = 'tabular') AS tabular_count,
        COUNT(*) FILTER (WHERE document_type = 'non_tabular') AS non_tabular_count
    FROM document_records
    GROUP BY notebook_id
) dr ON n.notebook_id = dr.notebook_id

-- Chunks
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS total_chunks,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_chunks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_chunks,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_chunks,
        COUNT(*) FILTER (WHERE enhanced_chunk IS NOT NULL AND enhanced_chunk != '') AS enhanced_chunks
    FROM contextual_retrieval_table
    GROUP BY notebook_id
) crt ON n.notebook_id = crt.notebook_id

-- Jobs
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_jobs,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed_jobs
    FROM notebook_file_jobs
    GROUP BY notebook_id
) jobs ON n.notebook_id = jobs.notebook_id

-- Vector Documents
LEFT JOIN (
    SELECT 
        metadata->>'notebook_id' AS notebook_id,
        COUNT(*) AS vector_count
    FROM documents
    WHERE metadata->>'notebook_id' IS NOT NULL
    GROUP BY metadata->>'notebook_id'
) docs ON n.notebook_id::TEXT = docs.notebook_id

-- Duplicate Chunks
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS duplicate_chunk_groups,
        SUM(cnt) - COUNT(*) AS total_duplicate_chunks
    FROM (
        SELECT notebook_id, original_chunk, COUNT(*) AS cnt
        FROM contextual_retrieval_table
        WHERE original_chunk IS NOT NULL AND original_chunk != ''
        GROUP BY notebook_id, original_chunk
        HAVING COUNT(*) > 1
    ) dup_groups
    GROUP BY notebook_id
) dups ON n.notebook_id = dups.notebook_id

-- Chat Messages
LEFT JOIN (
    SELECT notebook_id, COUNT(*) AS message_count
    FROM chat_history
    GROUP BY notebook_id
) chat ON n.notebook_id = chat.notebook_id

ORDER BY n.updated_at DESC;


-- ============================================================
-- 3. DUPLICATE METRICS BY NOTEBOOK
-- ============================================================

-- 3.1 Duplicate ratio per notebook
SELECT 
    n.notebook_id,
    n.notebook_title,
    COALESCE(crt.total_chunks, 0) AS total_chunks,
    COALESCE(dups.duplicate_count, 0) AS duplicate_chunks,
    CASE 
        WHEN COALESCE(crt.total_chunks, 0) > 0 
        THEN ROUND((COALESCE(dups.duplicate_count, 0)::DECIMAL / crt.total_chunks) * 100, 2)
        ELSE 0 
    END AS duplicate_percentage,
    CASE
        WHEN COALESCE(dups.duplicate_count, 0) = 0 THEN 'HEALTHY'
        WHEN (COALESCE(dups.duplicate_count, 0)::DECIMAL / NULLIF(crt.total_chunks, 0)) < 0.05 THEN 'MINOR'
        WHEN (COALESCE(dups.duplicate_count, 0)::DECIMAL / NULLIF(crt.total_chunks, 0)) < 0.15 THEN 'MODERATE'
        ELSE 'CRITICAL'
    END AS health_status
FROM notebook n
LEFT JOIN (
    SELECT notebook_id, COUNT(*) AS total_chunks
    FROM contextual_retrieval_table
    GROUP BY notebook_id
) crt ON n.notebook_id = crt.notebook_id
LEFT JOIN (
    SELECT notebook_id, SUM(cnt - 1) AS duplicate_count
    FROM (
        SELECT notebook_id, original_chunk, COUNT(*) AS cnt
        FROM contextual_retrieval_table
        WHERE original_chunk IS NOT NULL AND original_chunk != ''
        GROUP BY notebook_id, original_chunk
        HAVING COUNT(*) > 1
    ) dup_inner
    GROUP BY notebook_id
) dups ON n.notebook_id = dups.notebook_id
ORDER BY duplicate_percentage DESC NULLS LAST;


-- ============================================================
-- 4. FILE-LEVEL ANALYSIS
-- ============================================================

-- 4.1 Files with duplicate chunks
SELECT 
    notebook_id,
    file_id,
    file_name,
    COUNT(*) AS total_chunks,
    COUNT(*) - COUNT(DISTINCT original_chunk) AS duplicate_chunks,
    CASE 
        WHEN COUNT(*) > 0 
        THEN ROUND(((COUNT(*) - COUNT(DISTINCT original_chunk))::DECIMAL / COUNT(*)) * 100, 2)
        ELSE 0 
    END AS duplicate_percentage
FROM contextual_retrieval_table
WHERE original_chunk IS NOT NULL AND original_chunk != ''
GROUP BY notebook_id, file_id, file_name
HAVING COUNT(*) > COUNT(DISTINCT original_chunk)
ORDER BY duplicate_chunks DESC;


-- 4.2 Cross-file duplicate detection (same content in different files within notebook)
SELECT 
    notebook_id,
    original_chunk,
    COUNT(DISTINCT file_id) AS files_containing_chunk,
    ARRAY_AGG(DISTINCT file_name) AS file_names,
    COUNT(*) AS total_occurrences
FROM contextual_retrieval_table
WHERE original_chunk IS NOT NULL AND original_chunk != ''
GROUP BY notebook_id, original_chunk
HAVING COUNT(DISTINCT file_id) > 1
ORDER BY files_containing_chunk DESC, total_occurrences DESC;


-- ============================================================
-- 5. CHUNK QUALITY METRICS
-- ============================================================

-- 5.1 Chunk size distribution per notebook
SELECT 
    notebook_id,
    COUNT(*) AS total_chunks,
    MIN(LENGTH(original_chunk)) AS min_chunk_size,
    MAX(LENGTH(original_chunk)) AS max_chunk_size,
    ROUND(AVG(LENGTH(original_chunk))::DECIMAL, 2) AS avg_chunk_size,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(original_chunk)) AS median_chunk_size,
    COUNT(*) FILTER (WHERE LENGTH(original_chunk) < 100) AS very_small_chunks,
    COUNT(*) FILTER (WHERE LENGTH(original_chunk) >= 100 AND LENGTH(original_chunk) < 500) AS small_chunks,
    COUNT(*) FILTER (WHERE LENGTH(original_chunk) >= 500 AND LENGTH(original_chunk) < 2000) AS medium_chunks,
    COUNT(*) FILTER (WHERE LENGTH(original_chunk) >= 2000) AS large_chunks
FROM contextual_retrieval_table
WHERE original_chunk IS NOT NULL
GROUP BY notebook_id
ORDER BY notebook_id;


-- 5.2 Empty or problematic chunks detection
SELECT 
    notebook_id,
    file_name,
    chunk_id,
    status,
    CASE 
        WHEN original_chunk IS NULL THEN 'NULL_CONTENT'
        WHEN original_chunk = '' THEN 'EMPTY_CONTENT'
        WHEN LENGTH(original_chunk) < 50 THEN 'TOO_SHORT'
        WHEN LENGTH(TRIM(original_chunk)) = 0 THEN 'WHITESPACE_ONLY'
        ELSE 'VALID'
    END AS issue_type,
    LENGTH(original_chunk) AS chunk_length,
    created_at
FROM contextual_retrieval_table
WHERE original_chunk IS NULL 
   OR original_chunk = '' 
   OR LENGTH(original_chunk) < 50
   OR LENGTH(TRIM(original_chunk)) = 0
ORDER BY notebook_id, created_at DESC;


-- ============================================================
-- 6. PROCESSING STATUS MONITORING
-- ============================================================

-- 6.1 Chunk processing status summary
SELECT 
    notebook_id,
    status,
    COUNT(*) AS chunk_count,
    ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY notebook_id)) * 100, 2) AS percentage
FROM contextual_retrieval_table
GROUP BY notebook_id, status
ORDER BY notebook_id, chunk_count DESC;


-- 6.2 Failed chunks with retry information
SELECT 
    notebook_id,
    file_id,
    file_name,
    chunk_id,
    status,
    retry_count,
    created_at,
    updated_at,
    LEFT(original_chunk, 100) AS chunk_preview
FROM contextual_retrieval_table
WHERE status = 'failed' OR retry_count > 0
ORDER BY retry_count DESC, updated_at DESC;


-- 6.3 Stale pending chunks (pending for too long)
SELECT 
    notebook_id,
    file_name,
    chunk_id,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 AS hours_since_update
FROM contextual_retrieval_table
WHERE status = 'pending' 
  AND updated_at < NOW() - INTERVAL '1 hour'
ORDER BY updated_at ASC;


-- ============================================================
-- 7. DASHBOARD AGGREGATE QUERIES
-- ============================================================

-- 7.1 System-wide statistics
SELECT 
    (SELECT COUNT(*) FROM notebook) AS total_notebooks,
    (SELECT COUNT(*) FROM document_records) AS total_document_records,
    (SELECT COUNT(*) FROM contextual_retrieval_table) AS total_chunks,
    (SELECT COUNT(*) FROM documents) AS total_vector_documents,
    (SELECT COUNT(*) FROM notebook_file_jobs) AS total_jobs,
    (SELECT COUNT(*) FROM chat_history) AS total_chat_messages,
    
    -- Duplicate stats
    (SELECT COUNT(*) FROM (
        SELECT notebook_id, original_chunk
        FROM contextual_retrieval_table
        WHERE original_chunk IS NOT NULL AND original_chunk != ''
        GROUP BY notebook_id, original_chunk
        HAVING COUNT(*) > 1
    ) dups) AS duplicate_groups_count,
    
    -- Status breakdown
    (SELECT COUNT(*) FROM contextual_retrieval_table WHERE status = 'pending') AS pending_chunks,
    (SELECT COUNT(*) FROM contextual_retrieval_table WHERE status = 'completed') AS completed_chunks,
    (SELECT COUNT(*) FROM contextual_retrieval_table WHERE status = 'failed') AS failed_chunks,
    
    -- Job status
    (SELECT COUNT(*) FROM notebook_file_jobs WHERE status = 'pending') AS pending_jobs,
    (SELECT COUNT(*) FROM notebook_file_jobs WHERE status = 'processing') AS processing_jobs,
    (SELECT COUNT(*) FROM notebook_file_jobs WHERE status = 'completed') AS completed_jobs,
    (SELECT COUNT(*) FROM notebook_file_jobs WHERE status = 'failed') AS failed_jobs;


-- 7.2 Recent activity timeline (last 24 hours)
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) FILTER (WHERE source = 'chunks') AS chunks_created,
    COUNT(*) FILTER (WHERE source = 'jobs') AS jobs_created,
    COUNT(*) FILTER (WHERE source = 'documents') AS documents_created
FROM (
    SELECT created_at, 'chunks' AS source FROM contextual_retrieval_table WHERE created_at > NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT created_at, 'jobs' AS source FROM notebook_file_jobs WHERE created_at > NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT created_at, 'documents' AS source FROM document_records WHERE created_at > NOW() - INTERVAL '24 hours'
) activity
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;


-- ============================================================
-- 8. CLEANUP HELPER QUERIES
-- ============================================================

-- 8.1 Identify duplicate chunks to keep (keeps the oldest, returns IDs to delete)
-- USE WITH CAUTION - Review before executing any DELETE
SELECT 
    chunk_id,
    notebook_id,
    file_name,
    created_at,
    'DELETE CANDIDATE' AS action
FROM contextual_retrieval_table crt
WHERE EXISTS (
    SELECT 1 
    FROM contextual_retrieval_table crt2 
    WHERE crt.notebook_id = crt2.notebook_id 
      AND crt.original_chunk = crt2.original_chunk
      AND crt.created_at > crt2.created_at
)
ORDER BY notebook_id, original_chunk, created_at;


-- 8.2 Safe duplicate cleanup query (DRY RUN - shows what would be deleted)
WITH duplicates AS (
    SELECT 
        chunk_id,
        notebook_id,
        file_id,
        file_name,
        original_chunk,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY notebook_id, original_chunk 
            ORDER BY created_at ASC
        ) AS rn
    FROM contextual_retrieval_table
    WHERE original_chunk IS NOT NULL AND original_chunk != ''
)
SELECT 
    chunk_id,
    notebook_id,
    file_id,
    file_name,
    LEFT(original_chunk, 100) AS chunk_preview,
    created_at,
    'WOULD_DELETE' AS action
FROM duplicates
WHERE rn > 1
ORDER BY notebook_id, original_chunk, created_at;


-- 8.3 Actual DELETE query for duplicates (EXECUTE WITH CAUTION!)
-- Uncomment and run only after reviewing the DRY RUN above
/*
WITH duplicates AS (
    SELECT 
        chunk_id,
        ROW_NUMBER() OVER (
            PARTITION BY notebook_id, original_chunk 
            ORDER BY created_at ASC
        ) AS rn
    FROM contextual_retrieval_table
    WHERE original_chunk IS NOT NULL AND original_chunk != ''
)
DELETE FROM contextual_retrieval_table
WHERE chunk_id IN (
    SELECT chunk_id FROM duplicates WHERE rn > 1
);
*/


-- ============================================================
-- 9. PARAMETERIZED QUERIES FOR DASHBOARD API
-- ============================================================

-- 9.1 Get duplicates for specific notebook (replace $1 with notebook_id)
-- For use in prepared statements or API calls
/*
PREPARE get_notebook_duplicates(UUID) AS
SELECT 
    original_chunk,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(chunk_id) AS chunk_ids,
    ARRAY_AGG(file_name) AS file_names
FROM contextual_retrieval_table
WHERE notebook_id = $1
  AND original_chunk IS NOT NULL 
  AND original_chunk != ''
GROUP BY original_chunk
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
*/


-- 9.2 Notebook health check function
CREATE OR REPLACE FUNCTION get_notebook_health(p_notebook_id UUID)
RETURNS TABLE (
    notebook_id UUID,
    notebook_title TEXT,
    total_chunks BIGINT,
    duplicate_chunks BIGINT,
    duplicate_percentage DECIMAL,
    pending_chunks BIGINT,
    failed_chunks BIGINT,
    health_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.notebook_id,
        n.notebook_title,
        COALESCE(crt.total, 0::BIGINT) AS total_chunks,
        COALESCE(dups.dup_count, 0::BIGINT) AS duplicate_chunks,
        CASE 
            WHEN COALESCE(crt.total, 0) > 0 
            THEN ROUND((COALESCE(dups.dup_count, 0)::DECIMAL / crt.total) * 100, 2)
            ELSE 0 
        END AS duplicate_percentage,
        COALESCE(crt.pending, 0::BIGINT) AS pending_chunks,
        COALESCE(crt.failed, 0::BIGINT) AS failed_chunks,
        CASE
            WHEN COALESCE(crt.failed, 0) > COALESCE(crt.total, 0) * 0.1 THEN 'CRITICAL'
            WHEN COALESCE(dups.dup_count, 0) > COALESCE(crt.total, 0) * 0.15 THEN 'WARNING'
            WHEN COALESCE(crt.pending, 0) > COALESCE(crt.total, 0) * 0.3 THEN 'PROCESSING'
            ELSE 'HEALTHY'
        END AS health_status
    FROM notebook n
    LEFT JOIN (
        SELECT 
            notebook_id AS nb_id,
            COUNT(*)::BIGINT AS total,
            COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
            COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed
        FROM contextual_retrieval_table
        GROUP BY notebook_id
    ) crt ON n.notebook_id = crt.nb_id
    LEFT JOIN (
        SELECT notebook_id AS nb_id, SUM(cnt - 1)::BIGINT AS dup_count
        FROM (
            SELECT notebook_id, COUNT(*) AS cnt
            FROM contextual_retrieval_table
            WHERE original_chunk IS NOT NULL AND original_chunk != ''
            GROUP BY notebook_id, original_chunk
            HAVING COUNT(*) > 1
        ) dup_inner
        GROUP BY notebook_id
    ) dups ON n.notebook_id = dups.nb_id
    WHERE n.notebook_id = p_notebook_id;
END;
$$;

COMMENT ON FUNCTION get_notebook_health IS 
'Returns health metrics for a specific notebook including duplicate detection and status counts.';


-- 9.3 Get all notebooks health summary function
CREATE OR REPLACE FUNCTION get_all_notebooks_health()
RETURNS TABLE (
    notebook_id UUID,
    notebook_title TEXT,
    total_chunks BIGINT,
    duplicate_chunks BIGINT,
    duplicate_percentage DECIMAL,
    pending_chunks BIGINT,
    failed_chunks BIGINT,
    health_status TEXT,
    last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.notebook_id,
        n.notebook_title,
        COALESCE(crt.total, 0::BIGINT) AS total_chunks,
        COALESCE(dups.dup_count, 0::BIGINT) AS duplicate_chunks,
        CASE 
            WHEN COALESCE(crt.total, 0) > 0 
            THEN ROUND((COALESCE(dups.dup_count, 0)::DECIMAL / crt.total) * 100, 2)
            ELSE 0 
        END AS duplicate_percentage,
        COALESCE(crt.pending, 0::BIGINT) AS pending_chunks,
        COALESCE(crt.failed, 0::BIGINT) AS failed_chunks,
        CASE
            WHEN COALESCE(crt.failed, 0) > COALESCE(crt.total, 0) * 0.1 THEN 'CRITICAL'
            WHEN COALESCE(dups.dup_count, 0) > COALESCE(crt.total, 0) * 0.15 THEN 'WARNING'
            WHEN COALESCE(crt.pending, 0) > COALESCE(crt.total, 0) * 0.3 THEN 'PROCESSING'
            ELSE 'HEALTHY'
        END AS health_status,
        n.updated_at AS last_updated
    FROM notebook n
    LEFT JOIN (
        SELECT 
            notebook_id AS nb_id,
            COUNT(*)::BIGINT AS total,
            COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending,
            COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed
        FROM contextual_retrieval_table
        GROUP BY notebook_id
    ) crt ON n.notebook_id = crt.nb_id
    LEFT JOIN (
        SELECT notebook_id AS nb_id, SUM(cnt - 1)::BIGINT AS dup_count
        FROM (
            SELECT notebook_id, COUNT(*) AS cnt
            FROM contextual_retrieval_table
            WHERE original_chunk IS NOT NULL AND original_chunk != ''
            GROUP BY notebook_id, original_chunk
            HAVING COUNT(*) > 1
        ) dup_inner
        GROUP BY notebook_id
    ) dups ON n.notebook_id = dups.nb_id
    ORDER BY 
        CASE 
            WHEN COALESCE(crt.failed, 0) > COALESCE(crt.total, 0) * 0.1 THEN 1
            WHEN COALESCE(dups.dup_count, 0) > COALESCE(crt.total, 0) * 0.15 THEN 2
            ELSE 3
        END,
        n.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_notebooks_health IS 
'Returns health metrics for all notebooks, sorted by health status (critical first).';


-- ============================================================
-- 10. VECTOR STORE DUPLICATE DETECTION
-- ============================================================

-- 10.1 Find duplicate vectors in documents table by content
SELECT 
    metadata->>'notebook_id' AS notebook_id,
    metadata->>'file_id' AS file_id,
    content,
    COUNT(*) AS duplicate_count,
    ARRAY_AGG(id) AS document_ids
FROM documents
WHERE content IS NOT NULL AND content != ''
GROUP BY metadata->>'notebook_id', metadata->>'file_id', content
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;


-- 10.2 Documents without embeddings (potential issues)
SELECT 
    id,
    metadata->>'notebook_id' AS notebook_id,
    metadata->>'file_id' AS file_id,
    LEFT(content, 100) AS content_preview,
    CASE 
        WHEN embedding IS NULL THEN 'MISSING_EMBEDDING'
        ELSE 'HAS_EMBEDDING'
    END AS embedding_status
FROM documents
WHERE embedding IS NULL
ORDER BY id;


-- ============================================================
-- END OF MONITORING QUERIES
-- ============================================================
