1. Postgres Schema
The schema is designed for high-performance financial time-series analysis and efficient transaction filtering.

transactions: Stores historical spend data.

Columns: id (PK), date, merchant, normalized_merchant (Indexed), category, amount, currency, memo.

Reasoning: Indexed normalized_merchant enables rapid filtering for recurring spend analysis.

funds: Metadata for mutual funds.

Columns: id (PK), name, category.

fund_navs: Historical price data.

Columns: fund_id (FK -> funds.id), date, nav.

Reasoning: Separate table allows efficient JOINs for period return calculations.

holdings: User's investment portfolio.

Columns: fund_id (FK), units, purchase_date, purchase_nav.

2. Tool Design
I split tools into two distinct domains to maintain separation of concerns:

queryTransactions: Handles all spend-related logic.

analyzeFunds: Handles portfolio and market performance.

Why? This separation allows the LLM to easily identify the correct domain. Adding/updating transaction logic won't accidentally impact complex financial investment calculations.

3. Grounding & Reliability
To prevent hallucination, the agent never performs math in the prompt window.

Pre-computed Math: My tools return fully processed results (e.g., realized_return_pct). The LLM acts only as a synthesizer of pre-computed database outputs, not a calculator.

SQL Logic: All aggregations use SQL SUM() or CTEs, ensuring arithmetic precision directly from the DB.

4. Key Financial Formulas
Spend: SUM(amount).

Net Spend: SUM(amount) where category != 'transfer'.

Merchant Matching: LOWER(name).trim().split(' ')[0] creates a clean alias for grouping disparate transaction names.

Recurring Detection: GROUP BY merchant, amount HAVING COUNT(*) > 1.

Fund Period Return: (End_NAV - Start_NAV) / Start_NAV * 100.

Holding Realized Return: ((Current_NAV * Units) - (Purchase_NAV * Units)) / (Purchase_NAV * Units) * 100.

5. Evals & Observability
Evals: tests/eval.ts runs 14 cases ranging from simple lookups to complex fund returns. Cases include edge cases like "no-data" and "currency filters."

Observability: I used standard console logging with request IDs in server.ts.

Inspection: To inspect a failed run, check the Render logs for the Request ID associated with the timestamp. This reveals exactly which SQL query the agent constructed and where the data gap exists.

6. Milestones & Deployment
Async Milestone: I intentionally skipped long-running async tool milestones to minimize architectural complexity, as the dataset fits comfortably in memory/DB for synchronous processing.

Deployment: Deployed on Render with a Neon Postgres instance.

Tradeoff: Cloud-hosted Postgres introduces latency (50-100ms) compared to local, but it satisfies the requirement for a public URL.

7. Failure Modes & Future Work
Failure Modes: System can fail if the user queries a fund name that does not exist in the DB (though ILIKE mitigates this) or if NAV data is missing for specific date windows.

Future Improvements:

Add a caching layer (Redis) to reduce latency on repeated fund performance queries.

Implement robust error retries for the LLM if a tool call returns a database connectivity timeout.