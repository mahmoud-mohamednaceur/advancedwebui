# Agent Harness Phase 2: Task Execution Workflow

## Overview

Phase 2 handles the execution of tasks created in Phase 1. It implements a **loop-based execution engine** that:
- Fetches the next pending task
- Executes it based on task type
- Handles success, failure, and retry logic
- Updates session progress
- Summarizes final results

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2: TASK EXECUTOR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐          │
│  │  Start   │───▶│ Get Next     │───▶│ Check         │          │
│  │  (Timer) │    │ Task         │    │ Dependencies  │          │
│  └──────────┘    └──────────────┘    └───────────────┘          │
│                          │                    │                  │
│                          ▼                    ▼                  │
│                  ┌──────────────┐    ┌───────────────┐          │
│                  │ No Tasks?    │    │ Dependencies  │──────┐   │
│                  │ → Complete   │    │ Not Met       │      │   │
│                  └──────────────┘    └───────────────┘      │   │
│                                              │               │   │
│                          ┌───────────────────┘               │   │
│                          ▼                                   │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │              TASK ROUTER (by task_type)               │   │   │
│  ├──────────┬──────────┬──────────┬──────────┬──────────┤   │   │
│  │ analysis │sql_query │sql_agg   │validation│transform │   │   │
│  │   ▼      │   ▼      │   ▼      │   ▼      │   ▼      │   │   │
│  │ LLM      │ Execute  │ Execute  │ LLM      │ Code     │   │   │
│  │ Analyze  │ Query    │ Query    │ Validate │ Process  │   │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │   │
│                          │                                   │   │
│                          ▼                                   │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │                   RESULT HANDLER                      │   │   │
│  ├──────────────┬──────────────┬────────────────────────┤   │   │
│  │   SUCCESS    │    FAILURE   │      HUMAN_NEEDED      │   │   │
│  │   ▼          │   ▼          │      ▼                 │   │   │
│  │ Save Result  │ Check        │ Pause Session          │   │   │
│  │ Mark Done    │ on_failure   │ Set human_context      │   │   │
│  │ Update Count │ → retry/skip │ Wait for input         │   │   │
│  └──────────────┴──────────────┴────────────────────────┘   │   │
│                          │                                   │   │
│                          ▼                                   │   │
│  ┌──────────────────────────────────────────────────────┐   │   │
│  │              MORE TASKS? (Loop Back)                  │◀──┘   │
│  └──────────────────────────────────────────────────────┘       │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              FINAL SUMMARIZER                         │       │
│  │  LLM generates final answer from all task results    │       │
│  └──────────────────────────────────────────────────────┘       │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              RESPOND TO WEBHOOK                       │       │
│  │  Return session summary + final answer to frontend   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Components

### 1. Entry Point: Get Next Task

**Trigger**: Called after Phase 1 completes OR by a loop-back

**SQL Query**:
```sql
SELECT 
    t.task_id,
    t.session_id,
    t.task_order,
    t.task_name,
    t.task_type,
    t.task_description,
    t.depends_on_order,
    t.target_file_id,
    t.target_file_name,
    t.sql_template,
    t.expected_output,
    t.is_critical,
    t.on_failure,
    t.retry_count,
    -- Check if dependency is complete
    CASE 
        WHEN t.depends_on_order IS NULL THEN TRUE
        ELSE EXISTS (
            SELECT 1 FROM agent_tasks dt 
            WHERE dt.session_id = t.session_id 
              AND dt.task_order = t.depends_on_order 
              AND dt.status = 'completed'
        )
    END AS dependency_ready,
    -- Get dependency result if exists
    (SELECT dt.result FROM agent_tasks dt 
     WHERE dt.session_id = t.session_id 
       AND dt.task_order = t.depends_on_order) AS dependency_result
FROM agent_tasks t
WHERE t.session_id = '{{session_id}}'
  AND t.status IN ('pending', 'waiting_dependency')
ORDER BY t.task_order ASC
LIMIT 1;
```

---

### 2. Dependency Check

**Logic**:
```javascript
if (!task) {
    // No more tasks → go to Final Summarizer
    return { action: 'complete' };
}

if (!task.dependency_ready) {
    // Wait - dependency not complete yet
    // Update status to 'waiting_dependency' and loop back
    return { action: 'wait', task_id: task.task_id };
}

// Ready to execute
return { action: 'execute', task: task };
```

---

### 3. Task Router

Routes to different execution paths based on `task_type`:

| Task Type | Handler | Description |
|-----------|---------|-------------|
| `analysis` | LLM Agent | Analyze schema/data to make decisions |
| `sql_query` | PostgreSQL Execute | Run SELECT query, return rows |
| `sql_aggregate` | PostgreSQL Execute | Run COUNT/SUM/AVG, return single value |
| `validation` | LLM Agent | Verify results are reasonable |
| `transform` | Code Node | Format/transform data |

---

### 4. Task Executors

#### 4.1 Analysis Executor (LLM)

**Purpose**: Use LLM to analyze data and make decisions

**Input**:
```json
{
    "task_description": "Identify which dataset contains region column",
    "available_datasets": [...],
    "dependency_result": null
}
```

**System Prompt**:
```
You are analyzing datasets to make a decision.
Task: {task_description}
Available Data: {available_datasets}
Previous Task Result: {dependency_result}

Return a JSON response:
{
    "decision": "file_id or value",
    "reasoning": "brief explanation",
    "confidence": "high|medium|low"
}
```

**Output**: Save to `result` column as JSONB

---

#### 4.2 SQL Query Executor

**Purpose**: Execute SQL queries against `raw_data_table`

**Process**:
1. Get `sql_template` from task
2. Replace placeholders with actual values:
   - `{{file_id}}` → from task or dependency result
   - `{{notebook_id}}` → from session
   - `{{value}}` → from dependency result
3. Execute query
4. Return results

**Example**:
```sql
-- Template
SELECT COUNT(*) as total FROM raw_data_table 
WHERE file_id = '{{file_id}}' 
  AND notebook_id = '{{notebook_id}}'
  AND raw_data->>'region' = 'East'

-- Filled
SELECT COUNT(*) as total FROM raw_data_table 
WHERE file_id = 'abc-123' 
  AND notebook_id = 'notebook-456'
  AND raw_data->>'region' = 'East'
```

---

#### 4.3 Validation Executor (LLM)

**Purpose**: Verify results are reasonable

**Input**:
```json
{
    "task_description": "Verify count is a positive integer",
    "result_to_validate": {"total": 42},
    "expected_output": "Integer count"
}
```

**Output**:
```json
{
    "is_valid": true,
    "message": "Result is a valid positive integer (42)"
}
```

---

### 5. Result Handler

After execution, handle the outcome:

#### 5.1 On Success

```sql
UPDATE agent_tasks
SET 
    status = 'completed',
    result = '{{result_json}}'::jsonb,
    result_summary = '{{summary}}',
    completed_at = NOW()
WHERE task_id = '{{task_id}}';

-- Update session counts
UPDATE agent_sessions
SET completed_task_count = completed_task_count + 1
WHERE session_id = '{{session_id}}';
```

#### 5.2 On Failure

```javascript
const { on_failure, retry_count, is_critical } = task;

switch (on_failure) {
    case 'retry':
        if (retry_count < 2) {
            // Retry
            UPDATE agent_tasks SET 
                status = 'pending', 
                retry_count = retry_count + 1,
                error_message = '{{error}}'
            WHERE task_id = '{{task_id}}';
        } else {
            // Max retries reached → mark failed
            goto 'failed';
        }
        break;
        
    case 'skip':
        UPDATE agent_tasks SET 
            status = 'skipped',
            error_message = '{{error}}'
        WHERE task_id = '{{task_id}}';
        // Continue to next task
        break;
        
    case 'stop':
        // Mark task and session as failed
        UPDATE agent_tasks SET status = 'failed' WHERE task_id = '{{task_id}}';
        UPDATE agent_sessions SET status = 'failed' WHERE session_id = '{{session_id}}';
        // Exit loop, go to error response
        break;
        
    case 'human':
        // Pause for human input
        UPDATE agent_sessions SET 
            status = 'awaiting_human',
            human_input_required = TRUE,
            human_context = '{"task_id": "...", "error": "...", "question": "..."}'::jsonb
        WHERE session_id = '{{session_id}}';
        // Exit loop, wait for human webhook
        break;
}
```

---

### 6. Loop Back

After handling result:
1. Check if more tasks exist
2. If yes → Go back to "Get Next Task"
3. If no → Go to "Final Summarizer"

**Check Query**:
```sql
SELECT COUNT(*) as remaining
FROM agent_tasks
WHERE session_id = '{{session_id}}'
  AND status IN ('pending', 'waiting_dependency');
```

---

### 7. Final Summarizer

**Purpose**: Generate human-readable final answer from all completed tasks

**Input to LLM**:
```json
{
    "original_query": "How many customers are in the East region?",
    "plan_goal": "Count customers in East region",
    "completed_tasks": [
        {
            "order": 1,
            "name": "Identify Dataset",
            "result": {"file_id": "abc-123", "file_name": "customers.xlsx"}
        },
        {
            "order": 2,
            "name": "Count East Customers",
            "result": {"total": 42}
        }
    ]
}
```

**System Prompt**:
```
You are summarizing the results of a data analysis session.

Original Question: {original_query}
Goal: {plan_goal}

Task Results:
{completed_tasks}

Generate a clear, concise answer to the original question.
Include the key numeric findings.
Do not explain the process, just state the answer.
```

**Output**:
```
There are 42 customers in the East region.
```

---

### 8. Final Response

Update session and return:

```sql
UPDATE agent_sessions
SET 
    status = 'completed',
    final_answer = '{{final_answer}}',
    completed_at = NOW()
WHERE session_id = '{{session_id}}';
```

**Webhook Response**:
```json
{
    "success": true,
    "session_id": "...",
    "status": "completed",
    "answer": "There are 42 customers in the East region.",
    "tasks_completed": 2,
    "tasks_failed": 0
}
```

---

## n8n Workflow Structure

```
┌─────────────────────────────────────────────────────────────┐
│ NODES                                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. [Webhook: Start Execution]                               │
│     ↓                                                        │
│  2. [Postgres: Get Next Task]                                │
│     ↓                                                        │
│  3. [IF: Has Task?]                                          │
│     ├── NO → [Go to: Final Summarizer]                       │
│     └── YES ↓                                                │
│  4. [IF: Dependency Ready?]                                  │
│     ├── NO → [Update: waiting_dependency] → [Loop Back]      │
│     └── YES ↓                                                │
│  5. [Update: status = running]                               │
│     ↓                                                        │
│  6. [Switch: task_type]                                      │
│     ├── analysis → [LLM: Analyze]                            │
│     ├── sql_query → [Postgres: Execute Query]                │
│     ├── sql_aggregate → [Postgres: Execute Aggregate]        │
│     ├── validation → [LLM: Validate]                         │
│     └── transform → [Code: Transform]                        │
│     ↓                                                        │
│  7. [IF: Success?]                                           │
│     ├── YES → [Update: completed] → [Loop: Get Next Task]    │
│     └── NO  → [Failure Handler]                              │
│                  ↓                                           │
│  8. [Switch: on_failure]                                     │
│     ├── retry → [IF: retries < 2?]                           │
│     │           ├── YES → [Update: retry] → [Loop Back]      │
│     │           └── NO  → [Mark Failed]                      │
│     ├── skip → [Update: skipped] → [Loop Back]               │
│     ├── stop → [Update: failed] → [Error Response]           │
│     └── human → [Update: awaiting_human] → [Human Response]  │
│                                                              │
│  9. [Final Summarizer]                                       │
│     ↓                                                        │
│  10. [LLM: Generate Final Answer]                            │
│     ↓                                                        │
│  11. [Update: session completed]                             │
│     ↓                                                        │
│  12. [Respond to Webhook]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Human-in-the-Loop Handling

When a task requires human input:

### 1. Pause Session
```sql
UPDATE agent_sessions SET
    status = 'awaiting_human',
    human_input_required = TRUE,
    human_context = '{
        "task_id": "{{task_id}}",
        "task_name": "{{task_name}}",
        "question": "Which dataset should be used?",
        "options": ["customers.xlsx", "orders.xlsx"],
        "error": "Multiple datasets contain region column"
    }'::jsonb
WHERE session_id = '{{session_id}}';
```

### 2. Frontend Displays Prompt
The frontend can poll or receive notification that human input is needed.

### 3. Human Response Webhook
New webhook endpoint: `/webhook/agent-human-response`

**Payload**:
```json
{
    "session_id": "...",
    "task_id": "...",
    "response": {
        "selected_option": "customers.xlsx"
    }
}
```

### 4. Resume Execution
```sql
UPDATE agent_sessions SET
    status = 'executing',
    human_input_required = FALSE,
    human_response = '{{response}}'::jsonb
WHERE session_id = '{{session_id}}';

UPDATE agent_tasks SET
    status = 'pending',
    -- Store human decision in result for use
    result = '{"human_decision": "customers.xlsx"}'::jsonb
WHERE task_id = '{{task_id}}';
```

Then loop back to task execution.

---

## Error Categories

| Error Type | Example | Default Action |
|------------|---------|----------------|
| `sql_error` | Invalid query syntax | retry |
| `timeout` | Query took too long | retry |
| `no_data` | Query returned empty | skip (if not critical) |
| `ambiguous` | Multiple valid options | human |
| `permission` | Access denied | stop |
| `schema_mismatch` | Column doesn't exist | stop |

---

## Next Steps

1. **Create Phase 2 n8n Workflow JSON**
2. **Implement Task Executors** for each type
3. **Add Loop-back Logic** using n8n's loop mechanism
4. **Create Human Response Webhook**
5. **Test End-to-End Flow**

---

## Files

| File | Purpose |
|------|---------|
| `advanced_sql_with_harness_v2.json` | Phase 1: Planning |
| `advanced_sql_executor.json` | Phase 2: Execution (to be created) |
| `database_sql.sql` | Schema with agent tables |
