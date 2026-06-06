# Design Document: Provue Finance Research Agent (Tara)

## Architecture
Tara is a synchronous, Express-backed agent built on the Mastra SDK. 
- **Agent**: `tara` (configured via `src/agent/taraAgent.ts`).
- **Orchestration**: Direct LLM-to-tool invocation loop.
- **Storage**: PostgreSQL 14+; schema optimized for financial time-series and transaction lookups.

## Key Design Decisions
1. **Merchant Alias Normalization**: Rather than hardcoding merchant names, we implement a normalization function (`lowercase` -> `strip special chars` -> `first token`). This allows the agent to handle unseen merchants by grouping them by their core brand name.
2. **Synchronous Execution**: To prioritize reliability and simplify the state machine, we avoid asynchronous queues (BullMQ). Tool results are returned immediately to the agent's context window.
3. **Database Layer**: All business logic (e.g., realized return math, total spend aggregation) resides in the database layer. This ensures the LLM is only tasked with natural language synthesis, minimizing hallucinations.

## Data Schema
- `transactions`: Indexed by `normalized_merchant` and `date` for fast lookups.
- `funds`: Time-series table for NAV history.
- `holdings`: Tracks portfolio units to enable realized return calculations.