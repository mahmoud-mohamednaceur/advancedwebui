-- ============================================================
-- RAG SYSTEM MONITORING QUERIES V2
-- Production-Grade Knowledge Base Health Monitoring
-- ============================================================
-- 
-- This file contains comprehensive SQL queries for monitoring
-- the health, quality, and integrity of a RAG (Retrieval-Augmented
-- Generation) system with the following data flow:
--
-- Files → notebook_file_jobs → contextual_retrieval_table → documents
--         (pipeline tracker)    (chunks + enhancement)      (vectors)
--
-- ============================================================


-- ============================================================
-- SECTION 1: PIPELINE HEALTH DASHBOARD
-- Core metrics for ingestion pipeline monitoring
-- ============================================================

-- 1.1 PIPELINE OVERVIEW - Single comprehensive view per notebook
-- This is the MASTER query for the dashboard Overview tab
SELECT 
    n.notebook_id,
    n.notebook_title,
    n.created_at AS notebook_created,
    n.updated_at AS notebook_last_activity,
    
    -- === DOCUMENT INGESTION METRICS ===
    COALESCE(dr.total_files, 0) AS total_files_ingested,
    COALESCE(dr.tabular_files, 0) AS tabular_files,
    COALESCE(dr.non_tabular_files, 0) AS non_tabular_files,
    
    -- === PIPELINE JOB METRICS ===
    COALESCE(jobs.total_jobs, 0) AS total_jobs,
    COALESCE(jobs.pending_jobs, 0) AS jobs_pending,
    COALESCE(jobs.processing_jobs, 0) AS jobs_in_progress,
    COALESCE(jobs.completed_jobs, 0) AS jobs_completed,
    COALESCE(jobs.failed_jobs, 0) AS jobs_failed,
    CASE 
        WHEN COALESCE(jobs.total_jobs, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(jobs.completed_jobs, 0)::DECIMAL / jobs.total_jobs) * 100, 1)
    END AS job_success_rate_pct,
    
    -- === CHUNK PROCESSING METRICS ===
    COALESCE(chunks.total_chunks, 0) AS total_chunks,
    COALESCE(chunks.chunks_pending, 0) AS chunks_pending,
    COALESCE(chunks.chunks_completed, 0) AS chunks_completed,
    COALESCE(chunks.chunks_failed, 0) AS chunks_failed,
    COALESCE(chunks.chunks_with_enhancement, 0) AS chunks_enhanced,
    CASE 
        WHEN COALESCE(chunks.total_chunks, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(chunks.chunks_with_enhancement, 0)::DECIMAL / chunks.total_chunks) * 100, 1)
    END AS enhancement_coverage_pct,
    
    -- === VECTOR STORE METRICS ===
    COALESCE(vectors.vector_count, 0) AS vectors_in_store,
    COALESCE(vectors.vectors_with_embedding, 0) AS vectors_with_embedding,
    COALESCE(vectors.vectors_missing_embedding, 0) AS vectors_missing_embedding,
    
    -- === DATA QUALITY INDICATORS ===
    COALESCE(quality.duplicate_groups, 0) AS duplicate_chunk_groups,
    COALESCE(quality.total_duplicates, 0) AS total_duplicate_count,
    COALESCE(quality.problematic_chunks, 0) AS problematic_chunks,
    
    -- === CONSISTENCY CHECKS ===
    COALESCE(consistency.orphan_vectors, 0) AS orphan_vectors,
    COALESCE(consistency.chunk_vector_mismatch, 0) AS chunk_vector_mismatch,
    
    -- === USAGE METRICS ===
    COALESCE(usage.total_queries, 0) AS total_queries,
    COALESCE(usage.total_chats, 0) AS total_chat_messages,
    COALESCE(usage.unique_users, 0) AS unique_users,
    
    -- === HEALTH STATUS CALCULATION ===
    CASE
        WHEN COALESCE(jobs.failed_jobs, 0) > COALESCE(jobs.total_jobs, 0) * 0.2 THEN 'CRITICAL'
        WHEN COALESCE(quality.duplicate_groups, 0) > COALESCE(chunks.total_chunks, 0) * 0.1 THEN 'WARNING'
        WHEN COALESCE(quality.problematic_chunks, 0) > 10 THEN 'WARNING'
        WHEN COALESCE(consistency.orphan_vectors, 0) > 0 THEN 'WARNING'
        WHEN COALESCE(jobs.pending_jobs, 0) + COALESCE(jobs.processing_jobs, 0) > 0 THEN 'SYNCING'
        ELSE 'HEALTHY'
    END AS health_status

FROM notebook n

-- Document Records Summary
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS total_files,
        COUNT(*) FILTER (WHERE document_type = 'tabular') AS tabular_files,
        COUNT(*) FILTER (WHERE document_type = 'non_tabular') AS non_tabular_files
    FROM document_records
    GROUP BY notebook_id
) dr ON n.notebook_id = dr.notebook_id

-- Pipeline Jobs Summary
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

-- Chunk Processing Summary
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS total_chunks,
        COUNT(*) FILTER (WHERE status = 'pending') AS chunks_pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS chunks_completed,
        COUNT(*) FILTER (WHERE status = 'failed') AS chunks_failed,
        COUNT(*) FILTER (WHERE enhanced_chunk IS NOT NULL AND enhanced_chunk != '') AS chunks_with_enhancement
    FROM contextual_retrieval_table
    GROUP BY notebook_id
) chunks ON n.notebook_id = chunks.notebook_id

-- Vector Store Summary
LEFT JOIN (
    SELECT 
        metadata->>'notebook_id' AS notebook_id,
        COUNT(*) AS vector_count,
        COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS vectors_with_embedding,
        COUNT(*) FILTER (WHERE embedding IS NULL) AS vectors_missing_embedding
    FROM documents
    WHERE metadata->>'notebook_id' IS NOT NULL
    GROUP BY metadata->>'notebook_id'
) vectors ON n.notebook_id::TEXT = vectors.notebook_id

-- Data Quality Summary
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS duplicate_groups,
        SUM(cnt - 1) AS total_duplicates,
        0::BIGINT AS problematic_chunks  -- Calculated separately for performance
    FROM (
        SELECT notebook_id, original_chunk, COUNT(*) AS cnt
        FROM contextual_retrieval_table
        WHERE original_chunk IS NOT NULL AND original_chunk != ''
        GROUP BY notebook_id, original_chunk
        HAVING COUNT(*) > 1
    ) dups
    GROUP BY notebook_id
) quality ON n.notebook_id = quality.notebook_id

-- Consistency Check Summary
LEFT JOIN (
    SELECT 
        notebook_id,
        orphan_count AS orphan_vectors,
        0::BIGINT AS chunk_vector_mismatch
    FROM (
        SELECT 
            metadata->>'notebook_id' AS notebook_id,
            COUNT(*) AS orphan_count
        FROM documents d
        WHERE NOT EXISTS (
            SELECT 1 FROM contextual_retrieval_table c 
            WHERE c.chunk_id = d.metadata->>'chunk_id'
            AND c.notebook_id::TEXT = d.metadata->>'notebook_id'
        )
        AND metadata->>'notebook_id' IS NOT NULL
        GROUP BY metadata->>'notebook_id'
    ) orphans
) consistency ON n.notebook_id::TEXT = consistency.notebook_id

-- Usage Metrics Summary
LEFT JOIN (
    SELECT 
        notebook_id,
        COUNT(*) AS total_chats,
        COUNT(DISTINCT user_id) AS unique_users,
        0::BIGINT AS total_queries
    FROM chat_history
    GROUP BY notebook_id
) usage ON n.notebook_id = usage.notebook_id

ORDER BY 
    CASE 
        WHEN COALESCE(jobs.failed_jobs, 0) > 0 THEN 1
        WHEN COALESCE(jobs.pending_jobs, 0) + COALESCE(jobs.processing_jobs, 0) > 0 THEN 2
        ELSE 3
    END,
    n.updated_at DESC;


-- ============================================================
-- SECTION 2: INGESTION PIPELINE MONITORING
-- Track jobs through the processing pipeline
-- ============================================================

-- 2.1 PIPELINE STAGE BREAKDOWN - See where files are in the pipeline
SELECT 
    n.notebook_id,
    n.notebook_title,
    nfj.workflow_stage,
    nfj.status,
    COUNT(*) AS job_count,
    COUNT(*) FILTER (WHERE nfj.retry_count > 0) AS jobs_with_retries,
    MAX(nfj.retry_count) AS max_retries,
    MIN(nfj.created_at) AS oldest_job,
    MAX(nfj.updated_at) AS most_recent_update,
    AVG(EXTRACT(EPOCH FROM (nfj.updated_at - nfj.created_at))) AS avg_processing_time_seconds
FROM notebook_file_jobs nfj
JOIN notebook n ON nfj.notebook_id = n.notebook_id
GROUP BY n.notebook_id, n.notebook_title, nfj.workflow_stage, nfj.status
ORDER BY n.notebook_title, nfj.workflow_stage, nfj.status;


-- 2.2 STUCK/STALE JOBS - Jobs that haven't progressed
SELECT 
    nfj.job_id,
    nfj.notebook_id,
    n.notebook_title,
    nfj.file_name,
    nfj.workflow_stage,
    nfj.status,
    nfj.retry_count,
    nfj.error_description,
    nfj.created_at,
    nfj.updated_at,
    EXTRACT(EPOCH FROM (NOW() - nfj.updated_at)) / 3600 AS hours_since_update,
    CASE 
        WHEN nfj.status = 'processing' AND nfj.updated_at < NOW() - INTERVAL '30 minutes' THEN 'LIKELY_STUCK'
        WHEN nfj.status = 'pending' AND nfj.updated_at < NOW() - INTERVAL '2 hours' THEN 'STALE_PENDING'
        WHEN nfj.status = 'failed' AND nfj.retry_count >= 3 THEN 'MAX_RETRIES_EXCEEDED'
        ELSE 'NORMAL'
    END AS issue_type
FROM notebook_file_jobs nfj
JOIN notebook n ON nfj.notebook_id = n.notebook_id
WHERE 
    (nfj.status = 'processing' AND nfj.updated_at < NOW() - INTERVAL '30 minutes')
    OR (nfj.status = 'pending' AND nfj.updated_at < NOW() - INTERVAL '2 hours')
    OR (nfj.status = 'failed' AND nfj.retry_count >= 3)
ORDER BY nfj.updated_at ASC;


-- 2.3 FAILED JOBS ANALYSIS - Understand why jobs fail
SELECT 
    n.notebook_title,
    nfj.workflow_stage,
    nfj.file_type,
    COALESCE(
        CASE 
            WHEN nfj.error_description ILIKE '%timeout%' THEN 'Timeout'
            WHEN nfj.error_description ILIKE '%memory%' THEN 'Memory Error'
            WHEN nfj.error_description ILIKE '%connection%' THEN 'Connection Error'
            WHEN nfj.error_description ILIKE '%parse%' OR nfj.error_description ILIKE '%format%' THEN 'Parse Error'
            WHEN nfj.error_description ILIKE '%permission%' OR nfj.error_description ILIKE '%access%' THEN 'Permission Error'
            ELSE 'Other'
        END,
        'Unknown'
    ) AS error_category,
    COUNT(*) AS failure_count,
    MAX(nfj.retry_count) AS max_retries,
    ARRAY_AGG(DISTINCT LEFT(nfj.error_description, 100)) FILTER (WHERE nfj.error_description IS NOT NULL) AS sample_errors
FROM notebook_file_jobs nfj
JOIN notebook n ON nfj.notebook_id = n.notebook_id
WHERE nfj.status = 'failed'
GROUP BY n.notebook_title, nfj.workflow_stage, nfj.file_type, 
    CASE 
        WHEN nfj.error_description ILIKE '%timeout%' THEN 'Timeout'
        WHEN nfj.error_description ILIKE '%memory%' THEN 'Memory Error'
        WHEN nfj.error_description ILIKE '%connection%' THEN 'Connection Error'
        WHEN nfj.error_description ILIKE '%parse%' OR nfj.error_description ILIKE '%format%' THEN 'Parse Error'
        WHEN nfj.error_description ILIKE '%permission%' OR nfj.error_description ILIKE '%access%' THEN 'Permission Error'
        ELSE 'Other'
    END
ORDER BY failure_count DESC;


-- ============================================================
-- SECTION 3: CHUNK QUALITY ANALYSIS
-- Deep dive into content quality and duplicates
-- ============================================================

-- 3.1 DUPLICATE DETECTION - Comprehensive duplicate analysis
SELECT 
    crt.notebook_id,
    n.notebook_title,
    MD5(LOWER(TRIM(crt.original_chunk))) AS content_hash,
    LEFT(crt.original_chunk, 150) AS chunk_preview,
    COUNT(*) AS duplicate_count,
    COUNT(DISTINCT crt.file_id) AS files_affected,
    ARRAY_AGG(DISTINCT crt.file_name) AS file_names,
    ARRAY_AGG(crt.chunk_id) AS chunk_ids,
    MIN(crt.created_at) AS first_occurrence,
    MAX(crt.created_at) AS last_occurrence,
    -- Impact assessment
    CASE 
        WHEN COUNT(*) > 5 THEN 'HIGH_IMPACT'
        WHEN COUNT(*) > 2 THEN 'MEDIUM_IMPACT'
        ELSE 'LOW_IMPACT'
    END AS impact_level
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE crt.original_chunk IS NOT NULL AND crt.original_chunk != ''
GROUP BY crt.notebook_id, n.notebook_title, MD5(LOWER(TRIM(crt.original_chunk))), LEFT(crt.original_chunk, 150)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, n.notebook_title;


-- 3.2 CROSS-FILE DUPLICATES - Same content appearing in different files
SELECT 
    crt.notebook_id,
    n.notebook_title,
    LEFT(crt.original_chunk, 100) AS chunk_preview,
    COUNT(DISTINCT crt.file_id) AS file_count,
    COUNT(*) AS total_occurrences,
    ARRAY_AGG(DISTINCT crt.file_name ORDER BY crt.file_name) AS files,
    'Consider deduplication or source consolidation' AS recommendation
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE crt.original_chunk IS NOT NULL AND crt.original_chunk != ''
GROUP BY crt.notebook_id, n.notebook_title, crt.original_chunk
HAVING COUNT(DISTINCT crt.file_id) > 1
ORDER BY file_count DESC, total_occurrences DESC;


-- 3.3 PROBLEMATIC CHUNKS - Detailed quality issues
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.file_name,
    crt.chunk_id,
    crt.status,
    CASE 
        WHEN crt.original_chunk IS NULL THEN 'NULL_CONTENT'
        WHEN crt.original_chunk = '' THEN 'EMPTY_CONTENT'
        WHEN LENGTH(TRIM(crt.original_chunk)) = 0 THEN 'WHITESPACE_ONLY'
        WHEN LENGTH(crt.original_chunk) < 20 THEN 'EXTREMELY_SHORT'
        WHEN LENGTH(crt.original_chunk) < 50 THEN 'TOO_SHORT'
        WHEN LENGTH(crt.original_chunk) > 10000 THEN 'TOO_LONG'
        WHEN crt.original_chunk ~ '^[\s\d\.\-\,]+$' THEN 'NUMBERS_ONLY'
        WHEN crt.original_chunk ~ '^[^\w\s]+$' THEN 'SPECIAL_CHARS_ONLY'
        ELSE 'VALID'
    END AS issue_type,
    LENGTH(crt.original_chunk) AS chunk_length,
    crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '' AS has_enhancement,
    crt.created_at
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE 
    crt.original_chunk IS NULL 
    OR crt.original_chunk = '' 
    OR LENGTH(TRIM(crt.original_chunk)) = 0
    OR LENGTH(crt.original_chunk) < 50
    OR LENGTH(crt.original_chunk) > 10000
    OR crt.original_chunk ~ '^[\s\d\.\-\,]+$'
    OR crt.original_chunk ~ '^[^\w\s]+$'
ORDER BY n.notebook_title, crt.file_name, crt.created_at DESC;


-- 3.4 CHUNK SIZE DISTRIBUTION - Detailed statistics
SELECT 
    crt.notebook_id,
    n.notebook_title,
    COUNT(*) AS total_chunks,
    
    -- Size Statistics
    MIN(LENGTH(crt.original_chunk)) AS min_size,
    MAX(LENGTH(crt.original_chunk)) AS max_size,
    ROUND(AVG(LENGTH(crt.original_chunk))::DECIMAL, 0) AS avg_size,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(crt.original_chunk))::INTEGER AS median_size,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY LENGTH(crt.original_chunk))::INTEGER AS p25_size,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY LENGTH(crt.original_chunk))::INTEGER AS p75_size,
    ROUND(STDDEV(LENGTH(crt.original_chunk))::DECIMAL, 0) AS stddev_size,
    
    -- Size Buckets
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) < 100) AS under_100,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 100 AND 299) AS range_100_300,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 300 AND 499) AS range_300_500,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 500 AND 999) AS range_500_1000,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 1000 AND 1999) AS range_1000_2000,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 2000 AND 3999) AS range_2000_4000,
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) >= 4000) AS over_4000,
    
    -- Quality Flags
    ROUND(
        (COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) BETWEEN 200 AND 2000)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        1
    ) AS optimal_range_pct
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE crt.original_chunk IS NOT NULL
GROUP BY crt.notebook_id, n.notebook_title
ORDER BY n.notebook_title;


-- ============================================================
-- SECTION 4: VECTOR STORE INTEGRITY
-- Ensure chunks and vectors are properly aligned
-- ============================================================

-- 4.1 VECTOR STORE HEALTH CHECK
SELECT 
    d.metadata->>'notebook_id' AS notebook_id,
    n.notebook_title,
    COUNT(*) AS total_vectors,
    COUNT(*) FILTER (WHERE d.embedding IS NOT NULL) AS with_embedding,
    COUNT(*) FILTER (WHERE d.embedding IS NULL) AS missing_embedding,
    COUNT(DISTINCT d.metadata->>'file_id') AS unique_files,
    COUNT(DISTINCT d.metadata->>'chunk_id') AS unique_chunks,
    ROUND(AVG(LENGTH(d.content))::DECIMAL, 0) AS avg_content_length,
    MAX(d.id) AS latest_vector_id
FROM documents d
LEFT JOIN notebook n ON d.metadata->>'notebook_id' = n.notebook_id::TEXT
WHERE d.metadata->>'notebook_id' IS NOT NULL
GROUP BY d.metadata->>'notebook_id', n.notebook_title
ORDER BY n.notebook_title NULLS LAST;


-- 4.2 ORPHANED VECTORS - Vectors without corresponding chunks
SELECT 
    d.id AS vector_id,
    d.metadata->>'notebook_id' AS notebook_id,
    d.metadata->>'file_id' AS file_id,
    d.metadata->>'file_name' AS file_name,
    d.metadata->>'chunk_id' AS chunk_id,
    LEFT(d.content, 100) AS content_preview,
    d.embedding IS NOT NULL AS has_embedding,
    'ORPHAN_VECTOR' AS issue_type,
    'No matching chunk in contextual_retrieval_table' AS description
FROM documents d
WHERE d.metadata->>'notebook_id' IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM contextual_retrieval_table crt 
    WHERE crt.chunk_id = d.metadata->>'chunk_id'
)
ORDER BY d.metadata->>'notebook_id', d.id;


-- 4.3 CHUNKS MISSING VECTORS - Chunks that should have vectors but don't
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.file_id,
    crt.file_name,
    crt.chunk_id,
    crt.status,
    LEFT(crt.original_chunk, 100) AS chunk_preview,
    'MISSING_VECTOR' AS issue_type,
    'Chunk completed but no vector in documents table' AS description
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE crt.status = 'completed'
AND NOT EXISTS (
    SELECT 1 
    FROM documents d 
    WHERE d.metadata->>'chunk_id' = crt.chunk_id
    AND d.metadata->>'notebook_id' = crt.notebook_id::TEXT
)
ORDER BY n.notebook_title, crt.file_name;


-- 4.4 CONTENT MISMATCH - Vector content differs from chunk content
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.chunk_id,
    crt.file_name,
    LENGTH(crt.original_chunk) AS chunk_length,
    LENGTH(d.content) AS vector_content_length,
    ABS(LENGTH(crt.original_chunk) - LENGTH(d.content)) AS length_difference,
    CASE 
        WHEN LENGTH(crt.original_chunk) != LENGTH(d.content) THEN 'LENGTH_MISMATCH'
        WHEN MD5(crt.original_chunk) != MD5(d.content) AND MD5(crt.enhanced_chunk) != MD5(d.content) THEN 'CONTENT_MISMATCH'
        ELSE 'OK'
    END AS mismatch_type
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
JOIN documents d ON d.metadata->>'chunk_id' = crt.chunk_id
WHERE ABS(LENGTH(crt.original_chunk) - LENGTH(d.content)) > 100
ORDER BY length_difference DESC;


-- ============================================================
-- SECTION 5: FILE-LEVEL ANALYSIS
-- Per-file statistics and status
-- ============================================================

-- 5.1 FILE PROCESSING STATUS - Comprehensive per-file view
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.file_id,
    crt.file_name,
    
    -- Chunk Statistics
    COUNT(*) AS total_chunks,
    COUNT(*) FILTER (WHERE crt.status = 'completed') AS completed_chunks,
    COUNT(*) FILTER (WHERE crt.status = 'pending') AS pending_chunks,
    COUNT(*) FILTER (WHERE crt.status = 'failed') AS failed_chunks,
    COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '') AS enhanced_chunks,
    
    -- Size Statistics
    SUM(LENGTH(crt.original_chunk)) AS total_content_size,
    ROUND(AVG(LENGTH(crt.original_chunk))::DECIMAL, 0) AS avg_chunk_size,
    
    -- Vector Count
    COALESCE(v.vector_count, 0) AS vector_count,
    
    -- Processing Status
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE crt.status = 'completed') 
             AND COALESCE(v.vector_count, 0) = COUNT(*) THEN 'FULLY_INDEXED'
        WHEN COUNT(*) FILTER (WHERE crt.status = 'failed') > 0 THEN 'HAS_FAILURES'
        WHEN COUNT(*) FILTER (WHERE crt.status = 'pending') > 0 THEN 'PROCESSING'
        WHEN COALESCE(v.vector_count, 0) < COUNT(*) THEN 'VECTORS_MISSING'
        ELSE 'UNKNOWN'
    END AS indexing_status,
    
    -- Quality Issues
    COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) < 50) AS short_chunks,
    
    MIN(crt.created_at) AS first_chunk,
    MAX(crt.updated_at) AS last_update

FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
LEFT JOIN (
    SELECT 
        metadata->>'notebook_id' AS notebook_id,
        metadata->>'file_id' AS file_id,
        COUNT(*) AS vector_count
    FROM documents
    WHERE metadata->>'notebook_id' IS NOT NULL
    GROUP BY metadata->>'notebook_id', metadata->>'file_id'
) v ON crt.notebook_id::TEXT = v.notebook_id AND crt.file_id = v.file_id
GROUP BY crt.notebook_id, n.notebook_title, crt.file_id, crt.file_name, v.vector_count
ORDER BY n.notebook_title, crt.file_name;


-- 5.2 FILES WITH ISSUES - Quick issue identification
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.file_id,
    crt.file_name,
    COUNT(*) AS total_chunks,
    ARRAY_REMOVE(ARRAY[
        CASE WHEN COUNT(*) FILTER (WHERE crt.status = 'failed') > 0 
             THEN 'FAILED_CHUNKS:' || COUNT(*) FILTER (WHERE crt.status = 'failed') END,
        CASE WHEN COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) < 50) > COUNT(*) * 0.2 
             THEN 'MANY_SHORT_CHUNKS' END,
        CASE WHEN EXISTS (
            SELECT 1 FROM contextual_retrieval_table dup 
            WHERE dup.notebook_id = crt.notebook_id 
            AND dup.file_id = crt.file_id 
            AND dup.original_chunk IN (
                SELECT original_chunk FROM contextual_retrieval_table 
                WHERE notebook_id = crt.notebook_id 
                GROUP BY original_chunk HAVING COUNT(*) > 1
            )
        ) THEN 'HAS_DUPLICATES' END,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.metadata->>'file_id' = crt.file_id
        ) THEN 'NO_VECTORS' END
    ], NULL) AS issues
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
GROUP BY crt.notebook_id, n.notebook_title, crt.file_id, crt.file_name
HAVING 
    COUNT(*) FILTER (WHERE crt.status = 'failed') > 0
    OR COUNT(*) FILTER (WHERE LENGTH(crt.original_chunk) < 50) > COUNT(*) * 0.2
ORDER BY n.notebook_title, crt.file_name;


-- ============================================================
-- SECTION 6: ENHANCEMENT COVERAGE ANALYSIS
-- Track AI enhancement progress
-- ============================================================

-- 6.1 ENHANCEMENT PROGRESS BY FILE
SELECT 
    crt.notebook_id,
    n.notebook_title,
    crt.file_name,
    COUNT(*) AS total_chunks,
    COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '') AS enhanced_count,
    COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NULL OR crt.enhanced_chunk = '') AS not_enhanced_count,
    ROUND(
        (COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
        1
    ) AS enhancement_pct,
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '') THEN 'FULLY_ENHANCED'
        WHEN COUNT(*) FILTER (WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != '') > 0 THEN 'PARTIALLY_ENHANCED'
        ELSE 'NOT_ENHANCED'
    END AS enhancement_status
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
GROUP BY crt.notebook_id, n.notebook_title, crt.file_name
ORDER BY enhancement_pct ASC, n.notebook_title;


-- 6.2 ENHANCEMENT QUALITY - Compare original vs enhanced
SELECT 
    crt.notebook_id,
    n.notebook_title,
    COUNT(*) AS enhanced_chunks,
    ROUND(AVG(LENGTH(crt.enhanced_chunk) - LENGTH(crt.original_chunk))::DECIMAL, 0) AS avg_length_increase,
    ROUND(AVG((LENGTH(crt.enhanced_chunk)::DECIMAL / NULLIF(LENGTH(crt.original_chunk), 0) - 1) * 100), 1) AS avg_increase_pct,
    MIN(LENGTH(crt.enhanced_chunk) - LENGTH(crt.original_chunk)) AS min_increase,
    MAX(LENGTH(crt.enhanced_chunk) - LENGTH(crt.original_chunk)) AS max_increase,
    COUNT(*) FILTER (WHERE LENGTH(crt.enhanced_chunk) <= LENGTH(crt.original_chunk)) AS chunks_not_expanded
FROM contextual_retrieval_table crt
JOIN notebook n ON crt.notebook_id = n.notebook_id
WHERE crt.enhanced_chunk IS NOT NULL AND crt.enhanced_chunk != ''
GROUP BY crt.notebook_id, n.notebook_title
ORDER BY n.notebook_title;


-- ============================================================
-- SECTION 7: USAGE & PERFORMANCE METRICS
-- Track how the RAG system is being used
-- ============================================================

-- 7.1 CHAT USAGE BY NOTEBOOK
SELECT 
    ch.notebook_id,
    n.notebook_title,
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE ch.role = 'user') AS user_messages,
    COUNT(*) FILTER (WHERE ch.role = 'assistant') AS assistant_responses,
    COUNT(DISTINCT ch.user_id) AS unique_users,
    COUNT(DISTINCT DATE(ch.created_at)) AS active_days,
    MIN(ch.created_at) AS first_message,
    MAX(ch.created_at) AS last_message,
    ROUND(AVG(LENGTH(ch.content))::DECIMAL, 0) AS avg_message_length,
    COUNT(*) FILTER (WHERE ch.citations != '[]'::jsonb) AS responses_with_citations
FROM chat_history ch
JOIN notebook n ON ch.notebook_id = n.notebook_id
GROUP BY ch.notebook_id, n.notebook_title
ORDER BY total_messages DESC;


-- 7.2 DAILY ACTIVITY TREND
SELECT 
    DATE(created_at) AS activity_date,
    'chat' AS activity_type,
    COUNT(*) AS count
FROM chat_history
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)

UNION ALL

SELECT 
    DATE(created_at) AS activity_date,
    'ingestion' AS activity_type,
    COUNT(*) AS count
FROM notebook_file_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)

UNION ALL

SELECT 
    DATE(created_at) AS activity_date,
    'chunks_created' AS activity_type,
    COUNT(*) AS count
FROM contextual_retrieval_table
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)

ORDER BY activity_date DESC, activity_type;


-- ============================================================
-- SECTION 8: CLEANUP RECOMMENDATIONS
-- Identify records that can be safely cleaned up
-- ============================================================

-- 8.1 DUPLICATE CLEANUP CANDIDATES
-- Returns chunk IDs that can be deleted (keeps the oldest)
WITH ranked_duplicates AS (
    SELECT 
        chunk_id,
        notebook_id,
        file_id,
        file_name,
        original_chunk,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY notebook_id, MD5(LOWER(TRIM(original_chunk))) 
            ORDER BY created_at ASC
        ) AS rn
    FROM contextual_retrieval_table
    WHERE original_chunk IS NOT NULL AND original_chunk != ''
)
SELECT 
    rd.notebook_id,
    n.notebook_title,
    rd.chunk_id,
    rd.file_name,
    rd.created_at,
    'DUPLICATE_TO_DELETE' AS action,
    'Duplicate of an older chunk' AS reason
FROM ranked_duplicates rd
JOIN notebook n ON rd.notebook_id = n.notebook_id
WHERE rd.rn > 1
ORDER BY rd.notebook_id, rd.created_at;


-- 8.2 ORPHANED RECORDS CLEANUP
SELECT 
    'documents' AS table_name,
    d.id::TEXT AS record_id,
    d.metadata->>'notebook_id' AS notebook_id,
    'Orphan vector - no matching chunk' AS issue
FROM documents d
WHERE d.metadata->>'notebook_id' IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM contextual_retrieval_table crt 
    WHERE crt.chunk_id = d.metadata->>'chunk_id'
)

UNION ALL

SELECT 
    'notebook_file_jobs' AS table_name,
    nfj.job_id::TEXT AS record_id,
    nfj.notebook_id::TEXT AS notebook_id,
    'Job with no associated chunks after 7 days' AS issue
FROM notebook_file_jobs nfj
WHERE nfj.status = 'completed'
AND nfj.updated_at < NOW() - INTERVAL '7 days'
AND NOT EXISTS (
    SELECT 1 FROM contextual_retrieval_table crt 
    WHERE crt.job_id = nfj.job_id
)

ORDER BY table_name, notebook_id;


-- ============================================================
-- SECTION 9: QUICK HEALTH FUNCTIONS
-- Reusable functions for dashboard
-- ============================================================

-- 9.1 Create health check function for single notebook
CREATE OR REPLACE FUNCTION get_notebook_health_v2(p_notebook_id UUID)
RETURNS TABLE (
    notebook_id UUID,
    notebook_title TEXT,
    health_status TEXT,
    total_files INTEGER,
    total_chunks BIGINT,
    chunks_completed BIGINT,
    chunks_failed BIGINT,
    enhancement_pct DECIMAL,
    vector_count BIGINT,
    duplicate_groups BIGINT,
    issues JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH chunk_stats AS (
        SELECT 
            crt.notebook_id,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'failed') AS failed,
            COUNT(*) FILTER (WHERE enhanced_chunk IS NOT NULL AND enhanced_chunk != '') AS enhanced
        FROM contextual_retrieval_table crt
        WHERE crt.notebook_id = p_notebook_id
        GROUP BY crt.notebook_id
    ),
    dup_stats AS (
        SELECT COUNT(*) AS dup_groups
        FROM (
            SELECT 1
            FROM contextual_retrieval_table
            WHERE notebook_id = p_notebook_id
            AND original_chunk IS NOT NULL AND original_chunk != ''
            GROUP BY original_chunk
            HAVING COUNT(*) > 1
        ) d
    ),
    vector_stats AS (
        SELECT COUNT(*) AS vec_count
        FROM documents
        WHERE metadata->>'notebook_id' = p_notebook_id::TEXT
    ),
    file_stats AS (
        SELECT COUNT(*) AS file_count
        FROM document_records
        WHERE notebook_id = p_notebook_id
    )
    SELECT 
        n.notebook_id,
        n.notebook_title,
        CASE
            WHEN COALESCE(cs.failed, 0) > COALESCE(cs.total, 0) * 0.2 THEN 'CRITICAL'
            WHEN COALESCE(ds.dup_groups, 0) > COALESCE(cs.total, 0) * 0.1 THEN 'WARNING'
            ELSE 'HEALTHY'
        END AS health_status,
        COALESCE(fs.file_count, 0)::INTEGER AS total_files,
        COALESCE(cs.total, 0) AS total_chunks,
        COALESCE(cs.completed, 0) AS chunks_completed,
        COALESCE(cs.failed, 0) AS chunks_failed,
        ROUND(COALESCE(cs.enhanced, 0)::DECIMAL / NULLIF(cs.total, 0) * 100, 1) AS enhancement_pct,
        COALESCE(vs.vec_count, 0) AS vector_count,
        COALESCE(ds.dup_groups, 0) AS duplicate_groups,
        jsonb_build_object(
            'failed_chunks', COALESCE(cs.failed, 0) > 0,
            'has_duplicates', COALESCE(ds.dup_groups, 0) > 0,
            'low_enhancement', COALESCE(cs.enhanced, 0)::DECIMAL / NULLIF(cs.total, 0) < 0.5
        ) AS issues
    FROM notebook n
    LEFT JOIN chunk_stats cs ON cs.notebook_id = n.notebook_id
    CROSS JOIN dup_stats ds
    CROSS JOIN vector_stats vs
    CROSS JOIN file_stats fs
    WHERE n.notebook_id = p_notebook_id;
END;
$$;

COMMENT ON FUNCTION get_notebook_health_v2 IS 
'Returns comprehensive health metrics for a single notebook including chunk stats, duplicates, and issue flags.';


-- ============================================================
-- SECTION 10: SYSTEM-WIDE METRICS
-- Aggregate metrics across all notebooks
-- ============================================================

-- 10.1 SYSTEM DASHBOARD SUMMARY
SELECT 
    'notebooks' AS metric,
    COUNT(*)::TEXT AS value
FROM notebook

UNION ALL SELECT 
    'total_files',
    COUNT(*)::TEXT
FROM document_records

UNION ALL SELECT 
    'total_chunks',
    COUNT(*)::TEXT
FROM contextual_retrieval_table

UNION ALL SELECT 
    'total_vectors',
    COUNT(*)::TEXT
FROM documents

UNION ALL SELECT 
    'pending_jobs',
    COUNT(*)::TEXT
FROM notebook_file_jobs WHERE status = 'pending'

UNION ALL SELECT 
    'failed_jobs',
    COUNT(*)::TEXT
FROM notebook_file_jobs WHERE status = 'failed'

UNION ALL SELECT 
    'duplicate_groups',
    COUNT(*)::TEXT
FROM (
    SELECT 1 FROM contextual_retrieval_table 
    WHERE original_chunk IS NOT NULL 
    GROUP BY notebook_id, original_chunk HAVING COUNT(*) > 1
) d

UNION ALL SELECT 
    'total_chat_messages',
    COUNT(*)::TEXT
FROM chat_history

ORDER BY metric;


-- ============================================================
-- END OF RAG MONITORING QUERIES V2
-- ============================================================
