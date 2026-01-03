# Advanced Agent Harness Architecture

## 🎯 Vision

A **production-grade, persistent, self-correcting AI agent system** that:
- Maintains long-running sessions across multiple interactions
- Understands before acting (comprehension phase)
- Asks for clarification when uncertain
- Self-corrects and investigates when results seem wrong
- Provides full audit trail for debugging
- Learns from successful patterns

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADVANCED AGENT HARNESS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        LAYER 1: GATEWAY                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Session    │  │  Context    │  │  Intent                     │  │   │
│  │  │  Manager    │  │  Loader     │  │  Classifier                 │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 2: UNDERSTANDING                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Query      │  │  Schema     │  │  Clarification              │  │   │
│  │  │  Analyzer   │  │  Explorer   │  │  Handler                    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      LAYER 3: PLANNING                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Strategy   │  │  Task       │  │  Dependency                 │  │   │
│  │  │  Selector   │  │  Planner    │  │  Resolver                   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     LAYER 4: EXECUTION                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Tool       │──▶│  Result     │──▶│  Validation                │  │   │
│  │  │  Executor   │  │  Processor  │  │  Engine                     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│  ┌─────────────────────────┐     ┌─────────────────────────────────────┐   │
│  │ LAYER 5A: CORRECTION    │     │    LAYER 5B: OUTPUT                 │   │
│  │ ┌───────────┐ ┌───────┐ │     │  ┌──────────┐  ┌────────────────┐  │   │
│  │ │ Error     │ │ Retry │ │     │  │ Formatter│  │ Response       │  │   │
│  │ │ Detector  │ │ Logic │ │     │  │          │  │ Generator      │  │   │
│  │ └───────────┘ └───────┘ │     │  └──────────┘  └────────────────┘  │   │
│  └─────────────────────────┘     └─────────────────────────────────────┘   │
│            │                                          │                      │
│            └──────────────────┬───────────────────────┘                     │
│                               ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 6: PERSISTENCE                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  Session    │  │  Action     │  │  Pattern                    │  │   │
│  │  │  Store      │  │  Log        │  │  Memory                     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Core Components

### Layer 1: Gateway

| Component | Purpose |
|-----------|---------|
| **Session Manager** | Create, resume, or close sessions. Track session state. |
| **Context Loader** | Load previous messages, patterns, user preferences |
| **Intent Classifier** | Categorize: question, command, follow-up, clarification |

### Layer 2: Understanding

| Component | Purpose |
|-----------|---------|
| **Query Analyzer** | Parse query into structured components (entities, operations, filters) |
| **Schema Explorer** | Discover and cache dataset schemas |
| **Clarification Handler** | Detect ambiguity, ask targeted questions |

### Layer 3: Planning

| Component | Purpose |
|-----------|---------|
| **Strategy Selector** | Choose approach (simple/aggregate/comparison/exploration) |
| **Task Planner** | Create ordered list of tasks with dependencies |
| **Dependency Resolver** | Ensure tasks execute in correct order |

### Layer 4: Execution

| Component | Purpose |
|-----------|---------|
| **Tool Executor** | Run SQL queries, call APIs, fetch data |
| **Result Processor** | Parse, clean, structure results |
| **Validation Engine** | Check results for sanity (nulls, ranges, types) |

### Layer 5A: Correction

| Component | Purpose |
|-----------|---------|
| **Error Detector** | Identify failed queries, bad results, anomalies |
| **Retry Logic** | Attempt alternative approaches, escalate if needed |

### Layer 5B: Output

| Component | Purpose |
|-----------|---------|
| **Formatter** | Structure output for display (tables, charts, text) |
| **Response Generator** | Create natural language answer with context |

### Layer 6: Persistence

| Component | Purpose |
|-----------|---------|
| **Session Store** | Save/load full session state |
| **Action Log** | Record every action for audit/debugging |
| **Pattern Memory** | Store successful query patterns for reuse |

---

## 🗄️ Database Schema

```sql
-- ============================================
-- AGENT HARNESS: ADVANCED SCHEMA
-- ============================================

-- 1. SESSIONS: Long-running conversation containers
CREATE TABLE agent_sessions_v2 (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    notebook_id UUID NOT NULL REFERENCES notebooks(id),
    user_id TEXT NOT NULL,
    conversation_id UUID, -- Link to chat conversation
    
    -- Query Understanding
    original_query TEXT NOT NULL,
    normalized_query TEXT, -- Cleaned, standardized version
    query_intent TEXT, -- 'question', 'command', 'follow_up', 'clarification'
    query_entities JSONB, -- Extracted entities {columns, values, operations}
    query_complexity TEXT, -- 'simple', 'moderate', 'complex', 'exploratory'
    
    -- Understanding Phase
    understanding_complete BOOLEAN DEFAULT FALSE,
    understanding_summary TEXT, -- Agent's interpretation
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    clarification_needed BOOLEAN DEFAULT FALSE,
    clarification_question TEXT,
    clarification_options JSONB, -- Possible answers to pick from
    
    -- Datasets Context
    available_datasets JSONB, -- [{file_id, file_name, schema, relevance_score}]
    selected_datasets JSONB, -- Datasets chosen for this query
    
    -- Planning Phase
    execution_strategy TEXT, -- 'direct', 'multi_step', 'iterative', 'exploratory'
    planned_steps JSONB, -- Array of planned tasks
    estimated_complexity INTEGER, -- 1-10
    
    -- Execution State
    status TEXT DEFAULT 'created',
    -- Statuses: created, understanding, clarifying, planning, executing, 
    --           validating, correcting, complete, failed, paused
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    
    -- Results
    final_answer TEXT,
    answer_confidence DECIMAL(3,2),
    result_data JSONB, -- Structured result data
    result_format TEXT, -- 'text', 'table', 'chart', 'mixed'
    
    -- Corrections & Iterations
    correction_attempts INTEGER DEFAULT 0,
    max_corrections INTEGER DEFAULT 3,
    correction_history JSONB, -- [{attempt, error, fix_applied}]
    
    -- Human in the Loop
    human_intervention_required BOOLEAN DEFAULT FALSE,
    human_intervention_reason TEXT,
    human_response JSONB,
    
    -- Meta
    model_used TEXT,
    total_tokens_used INTEGER DEFAULT 0,
    total_tool_calls INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    understanding_at TIMESTAMPTZ,
    planning_at TIMESTAMPTZ,
    execution_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Session Management
    is_active BOOLEAN DEFAULT TRUE,
    parent_session_id UUID REFERENCES agent_sessions_v2(session_id), -- For follow-ups
    
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- 2. ACTIONS: Every single action taken by the agent
CREATE TABLE agent_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions_v2(session_id) ON DELETE CASCADE,
    
    -- Action Details
    action_order INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'tool_call', 'llm_call', 'decision', 'validation', 'correction'
    action_name TEXT NOT NULL, -- 'discover_datasets', 'execute_sql', 'ask_clarification', etc.
    
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    output_summary TEXT, -- Brief description of result
    
    -- Execution
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'success', 'failed', 'skipped', 'retried'
    error_message TEXT,
    error_type TEXT, -- 'sql_error', 'timeout', 'invalid_data', 'llm_error'
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Tokens (for LLM calls)
    tokens_used INTEGER,
    
    -- Retry Info
    retry_count INTEGER DEFAULT 0,
    retry_of_action_id UUID REFERENCES agent_actions(action_id),
    
    -- Context
    reasoning TEXT, -- Why this action was taken
    confidence DECIMAL(3,2)
);

-- 3. CLARIFICATIONS: Questions asked to the user
CREATE TABLE agent_clarifications (
    clarification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions_v2(session_id) ON DELETE CASCADE,
    
    -- Question
    question TEXT NOT NULL,
    question_type TEXT, -- 'dataset_choice', 'column_ambiguity', 'filter_value', 'operation_type'
    options JSONB, -- Possible answers
    
    -- Context
    triggered_by TEXT, -- What caused the need for clarification
    related_action_id UUID REFERENCES agent_actions(action_id),
    
    -- Response
    status TEXT DEFAULT 'pending', -- 'pending', 'answered', 'skipped', 'timed_out'
    user_response TEXT,
    response_timestamp TIMESTAMPTZ,
    
    -- Impact
    resolution_action TEXT, -- What we did with the answer
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CORRECTIONS: Self-healing attempts
CREATE TABLE agent_corrections (
    correction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions_v2(session_id) ON DELETE CASCADE,
    
    -- Error Details
    failed_action_id UUID NOT NULL REFERENCES agent_actions(action_id),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    
    -- Analysis
    error_analysis TEXT, -- Agent's understanding of what went wrong
    root_cause TEXT, -- 'bad_sql', 'wrong_column', 'type_mismatch', 'empty_data', etc.
    
    -- Correction
    correction_strategy TEXT, -- 'retry_same', 'try_alternative', 'simplify', 'ask_human'
    correction_action_id UUID REFERENCES agent_actions(action_id),
    
    -- Outcome
    success BOOLEAN,
    resolution_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PATTERNS: Learned successful approaches
CREATE TABLE agent_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope
    notebook_id UUID REFERENCES notebooks(id), -- NULL = global pattern
    
    -- Pattern Definition
    query_pattern TEXT NOT NULL, -- Generalized query template
    query_type TEXT, -- 'aggregation', 'filtering', 'comparison', etc.
    keywords TEXT[], -- Trigger words
    
    -- Successful Approach
    strategy JSONB NOT NULL, -- Steps that worked
    sql_template TEXT, -- Generalized SQL
    
    -- Usage Stats
    times_used INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    avg_execution_time_ms INTEGER,
    
    -- Source
    learned_from_session_id UUID REFERENCES agent_sessions_v2(session_id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 6. INVESTIGATIONS: Deep-dive analysis sessions
CREATE TABLE agent_investigations (
    investigation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions_v2(session_id) ON DELETE CASCADE,
    
    -- Investigation Context
    trigger_reason TEXT, -- 'unexpected_result', 'user_requested', 'anomaly_detected'
    focus_area TEXT, -- What we're investigating
    
    -- Findings
    hypothesis TEXT, -- Initial theory
    evidence JSONB, -- Supporting data
    conclusions JSONB, -- Final findings
    
    -- Actions Taken
    investigation_actions UUID[], -- Array of action_ids
    queries_run INTEGER DEFAULT 0,
    
    -- Outcome
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'concluded', 'inconclusive'
    summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- INDEXES
CREATE INDEX idx_sessions_notebook ON agent_sessions_v2(notebook_id);
CREATE INDEX idx_sessions_status ON agent_sessions_v2(status);
CREATE INDEX idx_sessions_created ON agent_sessions_v2(created_at DESC);
CREATE INDEX idx_sessions_active ON agent_sessions_v2(is_active, last_activity_at DESC);

CREATE INDEX idx_actions_session ON agent_actions(session_id, action_order);
CREATE INDEX idx_actions_status ON agent_actions(status);
CREATE INDEX idx_actions_type ON agent_actions(action_type, action_name);

CREATE INDEX idx_clarifications_session ON agent_clarifications(session_id);
CREATE INDEX idx_clarifications_pending ON agent_clarifications(status) WHERE status = 'pending';

CREATE INDEX idx_corrections_session ON agent_corrections(session_id);

CREATE INDEX idx_patterns_notebook ON agent_patterns(notebook_id);
CREATE INDEX idx_patterns_type ON agent_patterns(query_type);
CREATE INDEX idx_patterns_keywords ON agent_patterns USING GIN(keywords);
```

---

## 🔄 Session States & Transitions

```
                    ┌──────────────┐
                    │   CREATED    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
           ┌───────│UNDERSTANDING │◀──────┐
           │       └──────┬───────┘       │
           │              │               │
           │     ┌────────┴────────┐      │
           │     ▼                 ▼      │
    ┌─────────────────┐    ┌─────────────┐
    │   CLARIFYING    │───▶│  Received   │
    │  (ask user)     │    │  Answer     │
    └─────────────────┘    └──────┬──────┘
                                  │
                           ┌──────┴───────┐
                           │   PLANNING   │
                           └──────┬───────┘
                                  │
                           ┌──────┴───────┐
                           │  EXECUTING   │◀────────┐
                           └──────┬───────┘         │
                                  │                 │
                           ┌──────┴───────┐         │
                           │  VALIDATING  │         │
                           └──────┬───────┘         │
                                  │                 │
                    ┌─────────────┴─────────────┐   │
                    ▼                           ▼   │
            ┌──────────────┐            ┌──────────┴───┐
            │   COMPLETE   │            │  CORRECTING  │
            └──────────────┘            └──────────────┘
                    │                           │
                    │                     (max 3 attempts)
                    │                           │
                    │                     ┌─────┴─────┐
                    │                     ▼           ▼
                    │              ┌──────────┐ ┌──────────┐
                    │              │  FAILED  │ │  PAUSED  │
                    │              └──────────┘ │ (human)  │
                    │                           └──────────┘
                    ▼
            ┌──────────────┐
            │   ARCHIVED   │
            └──────────────┘
```

---

## 🧠 Understanding Phase (Deep)

Before executing anything, the agent must **truly understand**:

### 1. Query Decomposition

```javascript
// Input: "Show me the top 5 customers by total sales in Q4 2024"

// Output:
{
  "intent": "aggregation_with_ranking",
  "operation": "TOP_N",
  "entities": {
    "target": "customers",
    "metric": "total sales",
    "aggregation": "SUM",
    "n": 5,
    "time_filter": {
      "type": "quarter",
      "value": "Q4",
      "year": 2024
    }
  },
  "required_columns": ["customer", "sales", "date"],
  "sql_pattern": "SELECT ... GROUP BY ... ORDER BY ... LIMIT"
}
```

### 2. Schema Mapping

```javascript
// Map query entities to actual columns
{
  "mappings": [
    { "entity": "customers", "column": "customer_name", "confidence": 0.95 },
    { "entity": "total sales", "column": "amount", "confidence": 0.88 },
    { "entity": "date", "column": "order_date", "confidence": 0.92 }
  ],
  "ambiguities": [
    { "entity": "sales", "candidates": ["amount", "revenue", "total"], "needs_clarification": true }
  ]
}
```

### 3. Confidence Calculation

```javascript
// Overall understanding confidence
confidence = (
  entity_extraction_confidence * 0.3 +
  schema_mapping_confidence * 0.3 +
  pattern_match_confidence * 0.2 +
  no_ambiguities * 0.2
)

// If confidence < 0.7, trigger clarification
```

---

## 🔧 Clarification System

### Clarification Types

| Type | Example Trigger | Example Question |
|------|-----------------|------------------|
| **Dataset Choice** | Multiple relevant datasets | "Which dataset should I use: sales.xlsx or orders.xlsx?" |
| **Column Ambiguity** | Multiple similar columns | "By 'amount', do you mean 'order_amount' or 'total_amount'?" |
| **Filter Value** | Vague filter | "What time period should I include?" |
| **Operation Type** | Unclear operation | "Should I count unique customers or total transactions?" |
| **Missing Info** | Incomplete query | "Which region would you like to filter by?" |

### Clarification Flow

```
1. Detect Ambiguity
   ↓
2. Generate Smart Question (with options if possible)
   ↓
3. Store in agent_clarifications (status: pending)
   ↓
4. Return to user with need_clarification flag
   ↓
5. User provides answer (via new message or selection)
   ↓
6. Update session with clarification
   ↓
7. Resume from Understanding phase
```

---

## 🔁 Self-Correction Loop

### Error Detection

| Error Type | Detection Method | Correction Strategy |
|------------|------------------|---------------------|
| **SQL Syntax** | PostgreSQL error | Fix syntax, try simpler query |
| **Column Missing** | Error message | Check schema, try alternatives |
| **Type Mismatch** | Cast error | Add explicit casting |
| **Empty Result** | Zero rows | Relax filters, check data exists |
| **Unexpected NULL** | Many nulls | Add NULL handling |
| **Timeout** | Execution time | Simplify query, add limits |
| **Illogical Result** | Validation rules | Re-examine approach |

### Correction Process

```
1. Detect Error
   ↓
2. Analyze Root Cause
   ↓
3. Generate Alternative Approach
   ↓
4. Log Correction Attempt
   ↓
5. Execute Corrected Query
   ↓
6. Validate New Result
   ↓
7. If still failing after 3 attempts → Human Intervention
```

---

## 🔍 Investigation Mode

When results seem suspicious or user requests deeper analysis:

### Triggers

- User says "why?", "explain", "investigate"
- Result seems anomalous (e.g., negative count)
- Large unexpected changes from previous data
- Quality validation fails

### Investigation Steps

```
1. State Hypothesis
   "The count might be low because of null values"
   ↓
2. Design Validation Queries
   - Check for nulls: SELECT COUNT(*) WHERE column IS NULL
   - Check distinct values: SELECT DISTINCT column
   - Check date range: SELECT MIN(date), MAX(date)
   ↓
3. Execute and Collect Evidence
   ↓
4. Analyze Findings
   ↓
5. Draw Conclusions
   ↓
6. Report to User with Full Context
```

---

## 📈 Pattern Learning

### What Gets Learned

```javascript
{
  "pattern": {
    "query_template": "total {metric} by {grouping} for {time_period}",
    "query_type": "aggregation_grouped",
    "keywords": ["total", "by", "for"],
    
    "successful_strategy": {
      "steps": [
        { "action": "discover_datasets", "purpose": "find relevant data" },
        { "action": "execute_sql", "template": "SELECT {grouping}, SUM({metric}) FROM ... GROUP BY 1" }
      ],
      "sql_template": "SELECT raw_data->>'{grouping}' as group, SUM((raw_data->>'{metric}')::numeric) as total FROM raw_data_table WHERE file_id = '{file_id}' AND notebook_id = '{notebook_id}' AND {time_filter} GROUP BY 1 ORDER BY 2 DESC"
    },
    
    "stats": {
      "times_used": 47,
      "success_rate": 0.94,
      "avg_time_ms": 1250
    }
  }
}
```

### Pattern Matching

```javascript
// On new query, check for matching patterns:
function findMatchingPattern(query, notebook_id) {
  // 1. Extract keywords from query
  // 2. Search patterns by keywords
  // 3. Score similarity to query template
  // 4. Return best match if confidence > 0.8
  // 5. Use pattern strategy as starting point
}
```

---

## 🎯 Response Quality

### Quality Dimensions

| Dimension | Check | Score |
|-----------|-------|-------|
| **Accuracy** | Result matches query intent | 0-100 |
| **Completeness** | All aspects addressed | 0-100 |
| **Clarity** | Easy to understand | 0-100 |
| **Confidence** | Data reliability | 0-100 |

### Quality Score Formula

```javascript
quality_score = (
  accuracy * 0.4 +
  completeness * 0.3 +
  clarity * 0.2 +
  confidence * 0.1
)

// If quality_score < 70, consider correction or clarification
```

---

## 🔐 Human-in-the-Loop Triggers

### When to Pause for Human

| Situation | Action |
|-----------|--------|
| Correction attempts exhausted | Pause, show error, ask for help |
| Very low confidence (<0.5) | Ask for confirmation before proceeding |
| Destructive operation detected | Require explicit approval |
| Unusual data access pattern | Security review |
| User explicitly requests review | Pause and wait |

### Human Response Handling

```javascript
// When human provides input:
1. Load paused session
2. Apply human guidance to context
3. Resume from appropriate phase
4. Log human intervention for learning
```

---

## 📊 Metrics & Monitoring

### Key Metrics to Track

| Metric | Description |
|--------|-------------|
| **Session Success Rate** | % of sessions completing successfully |
| **Avg Clarifications Needed** | How often we need to ask |
| **Correction Success Rate** | % of self-corrections that work |
| **Time to First Answer** | Speed metric |
| **Pattern Reuse Rate** | Learning effectiveness |
| **Human Intervention Rate** | Escalation frequency |

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Database schema V2
- [ ] Session management
- [ ] Basic action logging
- [ ] Simple execution loop

### Phase 2: Understanding & Clarification (Week 3-4)
- [ ] Query decomposition
- [ ] Schema mapping
- [ ] Clarification detection
- [ ] User clarification flow

### Phase 3: Self-Correction (Week 5-6)
- [ ] Error detection
- [ ] Correction strategies
- [ ] Retry logic
- [ ] Investigation mode

### Phase 4: Learning & Optimization (Week 7-8)
- [ ] Pattern extraction
- [ ] Pattern matching
- [ ] Quality scoring
- [ ] Performance optimization

---

## 📁 File Outputs

This plan will generate:

1. **Database Migration**: `database/agent_harness_v2.sql`
2. **n8n Workflow**: `n8n/agent_harness_advanced.json`
3. **Frontend Components**: Session viewer, clarification UI
4. **API Endpoints**: Session management, clarification handling

---

## Next Steps

1. **Review this architecture** - Does it cover your needs?
2. **Prioritize features** - Which capabilities are most important?
3. **Start with Phase 1** - Build foundation first
4. **Iterate** - Add capabilities based on real usage

Would you like me to proceed with implementing any specific part of this architecture?
