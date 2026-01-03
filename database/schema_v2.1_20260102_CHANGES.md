# Schema v2.1 Changes - January 2, 2026

## Summary
Removed the **Agent Harness** tables (`agent_sessions` and `agent_tasks`) from the database schema as they are no longer needed.

---

## Changes Made

### Removed Tables

#### 1. `agent_sessions`
This table was used for tracking agent analysis sessions for the agentic SQL workflow. It contained:
- Session tracking with `session_id`, `notebook_id`, `user_id`
- Query information: `original_query`, `enhanced_query`
- Configuration: `inference_config`, `available_datasets`, `selected_datasets`
- Planning fields: `plan_name`, `plan_goal`, `plan_complexity`, `plan_assumptions`
- Status tracking: `task_count`, `completed_task_count`, `failed_task_count`, `status`
- Output: `final_answer`, `error_message`
- Timestamps: `planning_completed_at`, `execution_started_at`, `completed_at`, `created_at`, `updated_at`

**Removed indexes:**
- `idx_agent_sessions_notebook`
- `idx_agent_sessions_user`
- `idx_agent_sessions_status`
- `idx_agent_sessions_created`

#### 2. `agent_tasks`
This table was used for tracking individual tasks within an agent session. It contained:
- Task identification: `task_id`, `session_id`, `task_order`, `task_name`
- Task configuration: `task_type`, `task_description`, `depends_on_order`
- Target info: `target_file_id`, `target_file_name`
- Execution: `sql_template`, `expected_output`, `is_critical`, `on_failure`
- Status: `status`, `result`, `result_summary`, `error_message`, `retry_count`
- Timestamps: `started_at`, `completed_at`, `created_at`

**Removed indexes:**
- `idx_agent_tasks_session`
- `idx_agent_tasks_status`

---

## CLEANUP Section Updates

Removed the following DROP statements from the cleanup section:
```sql
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
```

---

## Migration Notes

### If you already have these tables in production:
Run the following SQL to drop them before applying the new schema:

```sql
-- Drop agent harness tables
DROP TABLE IF EXISTS agent_tasks CASCADE;
DROP TABLE IF EXISTS agent_sessions CASCADE;
```

### If this is a fresh install:
Simply use the new `schema_v2.1_20260102.sql` file directly.

---

## Reason for Removal
The agent harness tables (`agent_sessions` and `agent_tasks`) were originally created to support an n8n Agentic SQL Workflow. These tables are being removed as part of a schema cleanup/simplification effort.

---

## File Reference
- **New Schema File**: `schema_v2.1_20260102.sql`
- **Previous Schema File**: `main_migration_file.sql`
