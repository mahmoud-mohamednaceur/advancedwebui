# Agent Harness Implementation Plan (v2)

> **Created:** 2025-12-29  
> **Updated:** 2025-12-29  
> **Status:** Planning  
> **Goal:** Task-based agent harness with persistent state, dependencies, and human-in-the-loop

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Complete Architecture](#complete-architecture)
3. [Task System](#task-system)
4. [Error Handling & Human-in-the-Loop](#error-handling--human-in-the-loop)
5. [Database Schema](#database-schema)
6. [N8N Workflow Structure](#n8n-workflow-structure)
7. [System Prompts](#system-prompts)
8. [API Contracts](#api-contracts)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

### What We're Building

A **task-based agent harness** that:

1. **Discovers** available datasets in the notebook (file_id, schema)
2. **Plans** by breaking user query into specific tasks
3. **Saves** all tasks to database (persistent)
4. **Executes** tasks one by one with dependency awareness
5. **Handles errors** smartly - retry, skip, or ask human
6. **Summarizes** all results into final answer

### Key Features

| Feature | Description |
|---------|-------------|
| **Dataset-Aware Planning** | Planner sees real schemas before creating tasks |
| **Persistent Tasks** | Every task saved to database |
| **Task Dependencies** | Task 2 can depend on Task 1's result |
| **Smart Error Handling** | Auto-retry, skip, or human-in-the-loop |
| **Resumable Sessions** | Can resume from last pending task |
| **Full Audit Trail** | Complete history of what happened |

---

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TASK-BASED AGENT HARNESS - FULL FLOW                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    USER
                                      │
                                      ▼ Sends question
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION                                                          │
│                                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                    │
│   │   WEBHOOK    │ ──→ │   CREATE     │ ──→ │    GET       │                    │
│   │   Receive    │     │   SESSION    │     │  DATASETS    │                    │
│   │   Question   │     │              │     │              │                    │
│   └──────────────┘     └──────────────┘     └──────┬───────┘                    │
│                                                     │                            │
│        Saves to DB:                    Queries: SELECT file_id, file_name,      │
│        agent_sessions                           schema FROM document_records     │
│        status='created'                         WHERE notebook_id=X              │
│                                                     │                            │
│                                                     ▼                            │
│                              ┌─────────────────────────────────────────────┐    │
│                              │ Available Datasets:                         │    │
│                              │ • customers.xlsx → [id, name, region, rev]  │    │
│                              │ • orders.xlsx → [order_id, amount, date]    │    │
│                              └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: PLANNING                                                                │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                         PLANNER AGENT (LLM)                               │  │
│   │                                                                           │  │
│   │  Input:                                                                   │  │
│   │  • User Query: "Total revenue from East region customers"                │  │
│   │  • Datasets: [customers.xlsx with schema, orders.xlsx with schema]       │  │
│   │                                                                           │  │
│   │  Output:                                                                  │  │
│   │  • Plan Summary: "Query customers, filter East, sum revenue"             │  │
│   │  • Task List with dependencies                                           │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                           │
│                                      ▼                                           │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                           GENERATED TASKS                                 │  │
│   ├──────┬───────────────────────────────────────┬──────────┬────────────────┤  │
│   │ Task │ Description                           │ Type     │ Depends On     │  │
│   ├──────┼───────────────────────────────────────┼──────────┼────────────────┤  │
│   │  1   │ Verify 'region' column in customers   │ discovery│ -              │  │
│   │  2   │ Query customers where region='East'   │ query    │ Task 1         │  │
│   │  3   │ Sum revenue from filtered customers   │ aggregate│ Task 2         │  │
│   │  4   │ Validate result is reasonable         │ validate │ Task 3         │  │
│   └──────┴───────────────────────────────────────┴──────────┴────────────────┘  │
│                                      │                                           │
│                                      ▼                                           │
│   ┌──────────────┐                                                              │
│   │  SAVE TASKS  │ ──→ INSERT INTO agent_tasks (multiple rows)                  │
│   │  TO DATABASE │     Each task with: order, description, type, depends_on     │
│   └──────────────┘                                                              │
│                                                                                  │
│        Updates: agent_sessions.status = 'executing'                             │
│                 agent_sessions.task_count = 4                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: EXECUTION LOOP                                                          │
│                                                                                  │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                         TASK EXECUTION LOOP                             │    │
│   │                                                                         │    │
│   │         ┌──────────────┐                                               │    │
│   │         │  LOAD NEXT   │◄──────────────────────────────────┐           │    │
│   │         │    TASK      │                                    │           │    │
│   │         └──────┬───────┘                                    │           │    │
│   │                │                                            │           │    │
│   │                ▼                                            │           │    │
│   │         ┌──────────────┐                                    │           │    │
│   │         │    CHECK     │ Task depends on another?           │           │    │
│   │         │ DEPENDENCIES │ Is dependency completed?           │           │    │
│   │         └──────┬───────┘                                    │           │    │
│   │                │                                            │           │    │
│   │    ┌───────────┴───────────┐                               │           │    │
│   │    ▼                       ▼                                │           │    │
│   │  Ready              Not Ready (wait)                        │           │    │
│   │    │                       │                                │           │    │
│   │    ▼                       └────────────────────────────────┤           │    │
│   │ ┌──────────────┐                                            │           │    │
│   │ │   EXECUTE    │ ──→ Call SQL Agent with task context       │           │    │
│   │ │    TASK      │     Include: task description, file_id,    │           │    │
│   │ │              │             dependency results             │           │    │
│   │ └──────┬───────┘                                            │           │    │
│   │        │                                                    │           │    │
│   │        ▼                                                    │           │    │
│   │ ┌──────────────┐                                            │           │    │
│   │ │   SUCCESS?   │                                            │           │    │
│   │ └──────┬───────┘                                            │           │    │
│   │        │                                                    │           │    │
│   │   ┌────┴────┐                                               │           │    │
│   │   ▼         ▼                                               │           │    │
│   │  YES        NO ──→ [ERROR HANDLING - See Phase 3b]          │           │    │
│   │   │                                                         │           │    │
│   │   ▼                                                         │           │    │
│   │ ┌──────────────┐                                            │           │    │
│   │ │    SAVE      │ ──→ UPDATE agent_tasks                     │           │    │
│   │ │   RESULT     │     SET status='completed', result=...     │           │    │
│   │ └──────┬───────┘                                            │           │    │
│   │        │                                                    │           │    │
│   │        ▼                                                    │           │    │
│   │ ┌──────────────┐                                            │           │    │
│   │ │  MORE TASKS? │ ──→ YES ───────────────────────────────────┘           │    │
│   │ └──────┬───────┘                                                        │    │
│   │        │ NO                                                             │    │
│   │        ▼                                                                │    │
│   │   [Continue to Phase 4]                                                 │    │
│   │                                                                         │    │
│   └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3b: ERROR HANDLING (when task fails)                                       │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                         ERROR ANALYZER (LLM)                              │  │
│   │                                                                           │  │
│   │  Input: Task that failed, error message, context                         │  │
│   │                                                                           │  │
│   │  Decision Options:                                                        │  │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │
│   │  │   RETRY     │  │    SKIP     │  │   REPLAN    │  │    HUMAN    │     │  │
│   │  │             │  │             │  │             │  │   IN LOOP   │     │  │
│   │  │ Try again   │  │ Skip this   │  │ Create new  │  │ Pause and   │     │  │
│   │  │ (max 2x)    │  │ task, cont. │  │ approach    │  │ ask user    │     │  │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │  │
│   │                                                                           │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│   When HUMAN IN LOOP triggered:                                                 │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  1. Update session: status = 'awaiting_human'                            │  │
│   │  2. Save error context to session                                        │  │
│   │  3. Send notification to user (webhook/UI)                               │  │
│   │  4. WAIT for user response                                               │  │
│   │  5. Resume with user's guidance                                          │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: SUMMARY & COMPLETION                                                    │
│                                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                    │
│   │  LOAD ALL    │ ──→ │  GENERATE    │ ──→ │   UPDATE     │                    │
│   │  COMPLETED   │     │   SUMMARY    │     │   SESSION    │                    │
│   │   TASKS      │     │              │     │              │                    │
│   └──────────────┘     └──────────────┘     └──────────────┘                    │
│                                                                                  │
│   Query: SELECT *         LLM synthesizes        Updates:                       │
│   FROM agent_tasks        all results into       agent_sessions.status =        │
│   WHERE session_id=X      final answer           'completed'                    │
│                                                  agent_sessions.summary = ...   │
│                                                  agent_sessions.final_answer    │
│                                                                                  │
│   ┌──────────────┐                                                              │
│   │   RESPOND    │ ──→ Return final answer to user                              │
│   │  TO WEBHOOK  │                                                              │
│   └──────────────┘                                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Task System

### Task Types

| Type | Purpose | Example |
|------|---------|---------|
| **discovery** | Find/verify data exists | "Check if 'region' column exists in customers dataset" |
| **query** | Retrieve data with SQL | "Get all customers where region = 'East'" |
| **aggregation** | Calculate metrics | "Sum total revenue from filtered customers" |
| **validation** | Verify results make sense | "Confirm revenue sum is positive and reasonable" |
| **transform** | Modify/combine data | "Join customer IDs with order amounts" |

### Task Dependencies

Tasks can depend on other tasks. The executor:
1. Checks if dependency task is completed
2. Passes dependency result as context to current task
3. Waits if dependency not yet done

```
Task 1: discovery ─────────────────────────────┐
   "Find dataset with region column"           │
                                               ▼
Task 2: query ◄───── depends_on: Task 1 ───────┤
   "Query customers where region='East'"       │
   (uses Task 1 result to know which file_id)  ▼
                                               │
Task 3: aggregation ◄── depends_on: Task 2 ────┤
   "Sum revenue from Task 2 results"           │
   (uses Task 2 filter results)                ▼
                                               │
Task 4: validation ◄─── depends_on: Task 3 ────┘
   "Verify sum is reasonable"
   (uses Task 3 calculation)
```

### Task Status Flow

```
pending ──→ running ──→ completed
                │
                └──→ failed ──→ retry_1 ──→ retry_2 ──→ human_required
                          │           │
                          └─→ skip    └─→ skip
```

---

## Error Handling & Human-in-the-Loop

### Error Analysis Logic

When a task fails, the Error Analyzer LLM decides:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR DECISION MATRIX                                │
├─────────────────────────────────────┬───────────────────────────────────────┤
│ Error Type                          │ Decision                              │
├─────────────────────────────────────┼───────────────────────────────────────┤
│ SQL Syntax Error                    │ RETRY with corrected query            │
│ Column Not Found                    │ REPLAN (wrong dataset assumption)     │
│ Timeout                             │ RETRY once, then SKIP                 │
│ Empty Result                        │ VALIDATE if expected, else REPLAN     │
│ Unexpected Data Format              │ HUMAN IN LOOP                         │
│ Permission/Access Error             │ HUMAN IN LOOP                         │
│ Ambiguous User Intent               │ HUMAN IN LOOP                         │
│ Multiple Failures (3+)              │ HUMAN IN LOOP                         │
└─────────────────────────────────────┴───────────────────────────────────────┘
```

### Human-in-the-Loop Flow

```
Task Fails → Error Analyzer → "Need Human Input"
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  UPDATE agent_sessions    │
                    │  status = 'awaiting_human'│
                    │  human_context = {...}    │
                    └───────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  RETURN TO USER:          │
                    │  {                        │
                    │    status: "needs_input", │
                    │    session_id: "abc",     │
                    │    question: "Did you..." │
                    │    options: ["A", "B"]    │
                    │  }                        │
                    └───────────────────────────┘
                                    │
                                    ▼
                    (User responds via UI/webhook)
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │  RESUME WEBHOOK:          │
                    │  /webhook/harness-resume  │
                    │  {                        │
                    │    session_id: "abc",     │
                    │    human_response: "A"    │
                    │  }                        │
                    └───────────────────────────┘
                                    │
                                    ▼
                        Continue Execution
```

---

## Database Schema

### Table 1: `agent_sessions`

```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
    -- Identity
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    conversation_id UUID,
    
    -- Original Request
    original_query TEXT NOT NULL,
    inference_config JSONB,
    
    -- Discovery Results
    available_datasets JSONB,
    /*
    [
      {"file_id": "abc", "file_name": "customers.xlsx", "schema": [...columns...]},
      {"file_id": "xyz", "file_name": "orders.xlsx", "schema": [...columns...]}
    ]
    */
    
    -- Planning Results
    plan_summary TEXT,
    plan_details JSONB,         -- Full plan from Planner Agent
    task_count INTEGER DEFAULT 0,
    completed_task_count INTEGER DEFAULT 0,
    failed_task_count INTEGER DEFAULT 0,
    
    -- Execution State
    current_task_id UUID,       -- Currently executing task
    
    -- Final Results
    final_answer TEXT,
    summary TEXT,               -- Summary of all tasks
    
    -- Status
    status TEXT DEFAULT 'created' CHECK (status IN (
        'created',           -- Session initialized
        'discovering',       -- Getting datasets
        'planning',          -- Creating tasks
        'executing',         -- Running tasks
        'awaiting_human',    -- Paused for human input
        'summarizing',       -- Generating final answer
        'completed',         -- Successfully finished
        'failed'             -- Unrecoverable error
    )),
    
    -- Human-in-the-Loop
    human_input_required BOOLEAN DEFAULT FALSE,
    human_context JSONB,        -- What to ask the human
    human_response JSONB,       -- What human answered
    
    -- Error Tracking
    error_message TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- Metrics
    total_tokens_used INTEGER DEFAULT 0,
    total_duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    planning_started_at TIMESTAMP WITH TIME ZONE,
    execution_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_agent_sessions_notebook ON agent_sessions(notebook_id);
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX idx_agent_sessions_awaiting ON agent_sessions(human_input_required) WHERE human_input_required = TRUE;
```

### Table 2: `agent_tasks`

```sql
CREATE TABLE IF NOT EXISTS agent_tasks (
    -- Identity
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
    
    -- Task Definition
    task_order INTEGER NOT NULL,            -- Execution order (1, 2, 3...)
    task_type TEXT NOT NULL CHECK (task_type IN (
        'discovery',    -- Find/verify data exists
        'query',        -- Retrieve data
        'aggregation',  -- Calculate metrics
        'validation',   -- Verify results
        'transform'     -- Modify/combine data
    )),
    task_description TEXT NOT NULL,         -- Human-readable description
    
    -- Target Data
    target_file_id TEXT,                    -- Which dataset to query
    target_file_name TEXT,                  -- For display
    
    -- Dependency
    depends_on_task_id UUID REFERENCES agent_tasks(task_id),
    dependency_result JSONB,                -- Copied result from dependency
    
    -- Execution Details
    sql_query TEXT,                         -- The SQL that was executed
    execution_context JSONB,                -- Additional context passed to executor
    
    -- Results
    result JSONB,                           -- Task output
    result_summary TEXT,                    -- Brief summary of result
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Waiting to execute
        'waiting_dependency',-- Dependency not yet complete
        'running',           -- Currently executing
        'completed',         -- Successfully finished
        'failed',            -- Failed (may retry)
        'retrying',          -- Retry in progress
        'skipped',           -- Skipped due to error
        'human_required'     -- Needs human input
    )),
    
    -- Error Handling
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    error_message TEXT,
    error_type TEXT,                        -- sql_error, timeout, data_error, etc.
    
    -- Metrics
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique order per session
    UNIQUE(session_id, task_order)
);

-- Indexes
CREATE INDEX idx_agent_tasks_session ON agent_tasks(session_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_pending ON agent_tasks(session_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_tasks_order ON agent_tasks(session_id, task_order);
```

### Helpful Views

```sql
-- View: Session with task progress
CREATE OR REPLACE VIEW v_session_progress AS
SELECT 
    s.session_id,
    s.notebook_id,
    LEFT(s.original_query, 80) AS query_preview,
    s.status,
    s.task_count,
    s.completed_task_count,
    s.failed_task_count,
    CASE 
        WHEN s.task_count > 0 
        THEN ROUND(100.0 * s.completed_task_count / s.task_count, 0)
        ELSE 0 
    END AS progress_pct,
    s.human_input_required,
    s.created_at,
    s.completed_at
FROM agent_sessions s
ORDER BY s.created_at DESC;

-- View: Tasks for a session with status
CREATE OR REPLACE VIEW v_session_tasks AS
SELECT 
    t.task_id,
    t.session_id,
    t.task_order,
    t.task_type,
    t.task_description,
    t.target_file_name,
    t.status,
    t.retry_count,
    t.result_summary,
    t.error_message,
    t.duration_ms,
    dt.task_description AS depends_on_description
FROM agent_tasks t
LEFT JOIN agent_tasks dt ON t.depends_on_task_id = dt.task_id
ORDER BY t.session_id, t.task_order;
```

---

## N8N Workflow Structure

### Workflow 1: Main Harness (Orchestrator)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Agent Harness Main                                                 │
│ Webhook: POST /webhook/agent-harness                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Webhook] → [Create Session] → [Get Datasets] → [Planner Agent]            │
│                    │                                  │                      │
│                    │                                  ▼                      │
│                    │                          [Save Tasks]                   │
│                    │                                  │                      │
│                    │                                  ▼                      │
│                    │                    ┌─────────────────────────┐          │
│                    │                    │    EXECUTION LOOP       │          │
│                    │                    │                         │          │
│                    │                    │ [Load Next Task]        │          │
│                    │                    │       │                 │          │
│                    │                    │       ▼                 │          │
│                    │                    │ [Check Dependency]      │          │
│                    │                    │       │                 │          │
│                    │                    │       ▼                 │          │
│                    │                    │ [Execute Task]          │          │
│                    │                    │ (HTTP → SQL Agent)      │          │
│                    │                    │       │                 │          │
│                    │                    │       ▼                 │          │
│                    │                    │ [Save Result]           │          │
│                    │                    │       │                 │          │
│                    │                    │       ▼                 │          │
│                    │                    │ [Error?] ──→ [Error     │          │
│                    │                    │    │        Handler]    │          │
│                    │                    │    │            │       │          │
│                    │                    │    ▼            ▼       │          │
│                    │                    │ [More?] ◄── [Retry/     │          │
│                    │                    │    │        Skip/Human] │          │
│                    │                    │    │                    │          │
│                    │                    │ YES│    NO              │          │
│                    │                    │    │     │              │          │
│                    │                    │    ▼     │              │          │
│                    │                    │ [Loop]───┘              │          │
│                    │                    │                         │          │
│                    │                    └───────────┬─────────────┘          │
│                    │                                │                        │
│                    │                                ▼                        │
│                    │                     [Generate Summary]                  │
│                    │                                │                        │
│                    │                                ▼                        │
│                    └──────────────────────→ [Complete Session]               │
│                                                     │                        │
│                                                     ▼                        │
│                                              [Respond]                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workflow 2: Resume Harness (Human Response)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Agent Harness Resume                                               │
│ Webhook: POST /webhook/agent-harness-resume                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Webhook] → [Load Session] → [Save Human Response] → [Resume Execution]     │
│    │                                                          │              │
│    │ Input:                                                   │              │
│    │ {session_id, human_response}                            │              │
│    │                                                          ▼              │
│    │                                              [Continue to Loop]         │
│    │                                                          │              │
│    │                                                          ▼              │
│    │                                              [Complete Flow]            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Node Details

| Node | Type | Purpose |
|------|------|---------|
| **Webhook** | n8n-nodes-base.webhook | Receive initial request |
| **Create Session** | n8n-nodes-base.postgres | INSERT INTO agent_sessions |
| **Get Datasets** | n8n-nodes-base.postgres | SELECT from document_records |
| **Planner Agent** | @n8n/n8n-nodes-langchain.openAi | LLM creates task list |
| **Save Tasks** | n8n-nodes-base.postgres | INSERT INTO agent_tasks (loop) |
| **Load Next Task** | n8n-nodes-base.postgres | SELECT WHERE status='pending' |
| **Check Dependency** | n8n-nodes-base.if | Is dependency completed? |
| **Execute Task** | n8n-nodes-base.httpRequest | Call existing SQL Agent |
| **Save Result** | n8n-nodes-base.postgres | UPDATE agent_tasks |
| **Error Handler** | @n8n/n8n-nodes-langchain.openAi | Decide: retry/skip/human |
| **More Tasks?** | n8n-nodes-base.if | Check for pending tasks |
| **Loop** | n8n-nodes-base.merge | Back to Load Next Task |
| **Generate Summary** | @n8n/n8n-nodes-langchain.openAi | Synthesize final answer |
| **Complete Session** | n8n-nodes-base.postgres | UPDATE agent_sessions |
| **Respond** | n8n-nodes-base.respondToWebhook | Return to user |

---

## System Prompts

### Planner Agent Prompt

```markdown
# Task Planner Agent

You are a task planning agent for a SQL data analysis system.

## Your Input
1. **User Query**: What the user wants to know
2. **Available Datasets**: List of datasets with their schemas (columns and types)

## Your Job
Break down the user's query into specific, executable tasks.

## Task Types
- **discovery**: Verify data exists (check columns, find correct dataset)
- **query**: Retrieve specific data with SQL filters
- **aggregation**: Calculate sums, averages, counts, etc.
- **validation**: Verify results are reasonable
- **transform**: Combine or modify data

## Task Dependencies
- Tasks can depend on other tasks
- A task should depend on another if it needs that task's result
- Example: "Sum revenue" depends on "Filter customers by region"

## Output Format (JSON)

```json
{
  "plan_summary": "One sentence describing the overall approach",
  "complexity": "simple | moderate | complex",
  "tasks": [
    {
      "order": 1,
      "type": "discovery",
      "description": "Clear description of what this task does",
      "target_file_id": "file_id from available datasets (or null if not yet known)",
      "target_file_name": "filename for display",
      "depends_on": null,
      "reasoning": "Why this task is needed"
    },
    {
      "order": 2,
      "type": "query",
      "description": "...",
      "target_file_id": "abc123",
      "target_file_name": "customers.xlsx",
      "depends_on": 1,
      "reasoning": "..."
    }
  ]
}
```

## Rules
1. Always start with discovery if unsure which dataset has needed columns
2. Keep tasks atomic - one clear action per task
3. Order tasks logically with correct dependencies
4. Include validation task if result could be wrong
5. Maximum 6 tasks per query (keep it focused)
```

### Error Analyzer Prompt

```markdown
# Error Analyzer Agent

You analyze task failures and decide how to proceed.

## Your Input
1. **Task**: What was being attempted
2. **Error**: What went wrong
3. **Context**: Previous task results, retry count

## Decision Options

### RETRY
Use when: Temporary failure, syntax error that can be fixed
Response: `{"decision": "retry", "fix": "description of how to fix"}`

### SKIP
Use when: Task is optional, or can proceed without it
Response: `{"decision": "skip", "reason": "why it's safe to skip"}`

### REPLAN
Use when: Wrong approach, need different strategy
Response: `{"decision": "replan", "new_approach": "what to do instead"}`

### HUMAN
Use when: Ambiguous, permission issue, multiple failures, unclear intent
Response: `{"decision": "human", "question": "what to ask user", "options": ["A", "B", "C"]}`

## Guidelines
- Prefer RETRY for first-time failures
- Use SKIP sparingly (only if task is truly optional)
- Use HUMAN when genuinely stuck or need clarification
- Maximum 2 retries before escalating

## Output Format (JSON)
{
  "decision": "retry | skip | replan | human",
  "reasoning": "Why this decision",
  "details": { ... decision-specific fields ... }
}
```

### Summary Generator Prompt

```markdown
# Summary Generator Agent

You synthesize task results into a clear final answer.

## Your Input
1. **Original Query**: What the user asked
2. **Completed Tasks**: List of tasks with their results

## Your Job
Create a comprehensive, well-formatted answer that:
1. Directly answers the user's question
2. Includes relevant numbers and data
3. Mentions any important caveats
4. Is conversational but professional

## Guidelines
- Format numbers nicely (commas, currency symbols, percentages)
- Use bullet points for multiple data points
- Bold key findings
- If some tasks failed/skipped, mention what couldn't be determined
- Keep it concise but complete

## Output
Just the final answer text (no JSON wrapper needed).
```

---

## API Contracts

### Start Session

**Endpoint:** `POST /webhook/agent-harness`

**Request:**
```json
{
  "question": "Total revenue from East region customers",
  "notebook_id": "166d1752-3e3b-4164-a406-17ecac24424f",
  "user_id": "user_abc",
  "conversation_id": "conv_123",
  "inference_config": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0
  },
  "system_prompts": {
    "dataset": "...",
    "retrieval": "..."
  }
}
```

**Response (Success):**
```json
{
  "session_id": "sess_abc123",
  "status": "completed",
  "answer": "The total revenue from East region customers is **$125,000**, from 3 customers.",
  "summary": "Queried customers dataset, filtered by East region, calculated sum of revenue.",
  "tasks_completed": 4,
  "duration_ms": 3500
}
```

**Response (Needs Human Input):**
```json
{
  "session_id": "sess_abc123",
  "status": "awaiting_human",
  "question": "I found 2 datasets with revenue data. Which one should I use?",
  "options": [
    "customers.xlsx - has customer-level revenue",
    "orders.xlsx - has order-level amounts"
  ],
  "context": {
    "task_failed": "Identify correct revenue source",
    "error": "Multiple datasets contain revenue-like columns"
  }
}
```

### Resume Session

**Endpoint:** `POST /webhook/agent-harness-resume`

**Request:**
```json
{
  "session_id": "sess_abc123",
  "human_response": "customers.xlsx - has customer-level revenue"
}
```

**Response:** Same as Start Session response

### Get Session Status

**Endpoint:** `GET /webhook/agent-harness-status?session_id=xxx`

**Response:**
```json
{
  "session_id": "sess_abc123",
  "status": "executing",
  "progress": {
    "total_tasks": 4,
    "completed": 2,
    "failed": 0,
    "current_task": "Sum revenue from filtered customers"
  },
  "created_at": "2025-12-29T14:00:00Z"
}
```

---

## Implementation Checklist

### Phase 1: Database (Day 1)

- [ ] Create `agent_sessions` table
- [ ] Create `agent_tasks` table
- [ ] Create views (`v_session_progress`, `v_session_tasks`)
- [ ] Test INSERT/UPDATE/SELECT queries
- [ ] Add to `database/agent_harness_schema.sql`

### Phase 2: Core Workflow - Init (Day 2)

- [ ] Create "Agent Harness Main" workflow
- [ ] Add Webhook trigger
- [ ] Add Create Session node (Postgres INSERT)
- [ ] Add Get Datasets node (SELECT from document_records)
- [ ] Test: session creation works

### Phase 3: Planner Agent (Day 3)

- [ ] Add Planner Agent node (OpenAI)
- [ ] Create planner system prompt
- [ ] Add Save Tasks node (loop INSERT)
- [ ] Test: tasks are created correctly

### Phase 4: Task Execution Loop (Day 4)

- [ ] Add Load Next Task node
- [ ] Add Check Dependency node
- [ ] Add Execute Task node (HTTP to SQL Agent)
- [ ] Add Save Result node
- [ ] Add More Tasks? node (IF)
- [ ] Add Loop connection
- [ ] Test: tasks execute in order

### Phase 5: Error Handling (Day 5)

- [ ] Add Error Handler node (OpenAI)
- [ ] Create error analyzer prompt
- [ ] Implement retry logic
- [ ] Implement skip logic
- [ ] Implement human-in-the-loop pause
- [ ] Test: errors are handled correctly

### Phase 6: Summary & Completion (Day 6)

- [ ] Add Generate Summary node
- [ ] Create summary prompt
- [ ] Add Complete Session node
- [ ] Add Respond to Webhook node
- [ ] Test: full flow works

### Phase 7: Resume Workflow (Day 7)

- [ ] Create "Agent Harness Resume" workflow
- [ ] Add resume webhook
- [ ] Load session and human response
- [ ] Resume execution loop
- [ ] Test: human-in-the-loop works

### Phase 8: Integration & Polish (Day 8)

- [ ] Update frontend to call new endpoint
- [ ] Add loading states for human-in-the-loop
- [ ] Add session history UI (optional)
- [ ] Error handling edge cases
- [ ] Documentation

---

## Notes

### Keeping Existing SQL Agent Unchanged

The existing SQL Agent workflow remains **completely unchanged**. We call it via HTTP Request from the harness, passing:
- Task description as the question
- Target file_id context
- Dependency results as additional context

### Scalability Considerations

- Sessions older than 30 days can be archived/deleted
- Consider adding task timeout (e.g., 60 seconds max per task)
- Human-in-the-loop timeout: auto-fail after 24 hours if no response

### Future Enhancements

- Real-time progress updates via WebSocket
- Task parallel execution (for independent tasks)
- Learning from past sessions (which approaches worked)
- Cost tracking (token usage per session)
