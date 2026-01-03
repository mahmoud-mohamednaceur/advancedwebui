# Schema v2.2 Changes - January 2, 2026

## Summary
Added **Agent Knowledge Base Tables** to enable self-aware AI agent behavior. The agent can now query these tables to understand its available tools and the database schema.

---

## New Tables

### 1. `agent_available_tools`
**Purpose**: Registry of all tools the AI agent can use.

| Column | Type | Description |
|--------|------|-------------|
| `tool_id` | TEXT PK | Unique identifier (e.g., `execute_sql_query`) |
| `tool_name` | TEXT | Human-readable name |
| `tool_category` | TEXT | Category: `sql_execution`, `data_discovery`, `retrieval`, `search`, `chat_management`, `system` |
| `description` | TEXT | What the tool does |
| `when_to_use` | TEXT | **Critical for agent** - guidance on when to use this tool |
| `input_schema` | JSONB | Expected input parameters |
| `output_schema` | JSONB | What the tool returns |
| `example_usage` | JSONB | Example use cases |
| `webhook_url` | TEXT | Optional n8n webhook URL |
| `is_active` | BOOLEAN | Whether tool is available |
| `requires_notebook_context` | BOOLEAN | Does it need notebook_id? |
| `execution_priority` | INTEGER | Lower = try first |

**Pre-populated Tools (7 total):**
1. `execute_sql_query` - Main SQL execution tool
2. `preview_sample_data` - View first 5 rows
3. `refresh_dataset_list` - Discover available files
4. `vector_search` - Semantic document search
5. `hybrid_search` - Combined FTS + vector search
6. `save_chat_message` - Persist messages
7. `get_conversation_history` - Retrieve chat context

---

### 2. `agent_table_metadata`
**Purpose**: Schema documentation so the agent understands the database.

| Column | Type | Description |
|--------|------|-------------|
| `table_name` | TEXT PK | Table identifier |
| `table_category` | TEXT | Category: `core`, `documents`, `chat`, `workflow`, `evaluation`, `agent` |
| `description` | TEXT | What the table stores |
| `purpose` | TEXT | Why it exists |
| `key_columns` | JSONB | Array of important columns with descriptions |
| `relationships` | JSONB | Foreign key relationships |
| `query_patterns` | JSONB | Example SQL patterns |
| `access_notes` | TEXT | Special instructions for querying |
| `is_queryable_by_agent` | BOOLEAN | Can agent run queries against it? |

**Pre-populated Tables (11 total):**
- **Core**: `notebook`, `notebook_settings`
- **Documents**: `documents`, `document_records`, `raw_data_table`, `contextual_retrieval_table`
- **Chat**: `chat_conversations`, `chat_history`
- **Workflow**: `notebook_file_jobs`
- **Agent**: `agent_available_tools`, `agent_table_metadata` (self-referential!)

---

## Agent Usage Guide

### Discovering Available Tools
```sql
SELECT tool_id, tool_name, description, when_to_use 
FROM agent_available_tools 
WHERE is_active = TRUE 
ORDER BY execution_priority;
```

### Understanding What Tables to Query
```sql
SELECT table_name, description, query_patterns 
FROM agent_table_metadata 
WHERE is_queryable_by_agent = TRUE;
```

### Getting Column Info for a Table
```sql
SELECT key_columns, access_notes 
FROM agent_table_metadata 
WHERE table_name = 'raw_data_table';
```

---

## Migration Notes

### Apply to Existing Database
Run the new schema file - it includes `DROP TABLE IF EXISTS` for clean setup:
```sql
\i schema_v2.2_20260102.sql
```

### Adding New Tools
```sql
INSERT INTO agent_available_tools (tool_id, tool_name, tool_category, description, when_to_use, input_schema, output_schema)
VALUES ('my_new_tool', 'My New Tool', 'system', 'Description...', 'Use when...', '{}', '{}');
```

### Adding New Table Documentation
```sql
INSERT INTO agent_table_metadata (table_name, table_category, description, purpose, key_columns, is_queryable_by_agent)
VALUES ('new_table', 'core', 'Description...', 'Purpose...', '[{"name": "col1", "type": "TEXT"}]', FALSE);
```

---

## Key Design Decisions

1. **Self-Documenting**: The agent tables document themselves - the agent can query `agent_table_metadata` to learn about... `agent_table_metadata`!

2. **Queryable Flag**: Not all tables should be directly queried by the agent. `is_queryable_by_agent` controls this.

3. **Tool Priority**: Tools have `execution_priority` to guide the agent on which to try first.

4. **Usage Guidance**: The `when_to_use` field is the most important for agent decision-making.

---

## File Reference
- **New Schema File**: `schema_v2.2_20260102.sql`
- **This requires**: Base schema from `schema_v2.1_20260102.sql` or `main_migration_file.sql`
