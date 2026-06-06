# Provue Finance Research Agent (Tara)

Tara is a research-first AI persona capable of querying transaction histories, analyzing mutual fund market performance, and calculating portfolio realized returns.

## Architecture Overview

Tara is built using the Mastra SDK, utilizing a PostgreSQL database to ensure all financial calculations are grounded in actual data rather than LLM inference.

## Setup Instructions

### 1. Prerequisites

* **Node.js**: v22.13.0 or newer.
* **PostgreSQL**: Version 14 or higher (Local or Cloud-hosted via Neon/Supabase).
* **TypeScript Runner**: Install globally: `npm install -g tsx`

### 2. Environment Setup

Create a `.env` file in the project root with the following variables:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[db]?sslmode=require
OPENAI_API_KEY=your_key_here
NODE_ENV=production

```

### 3. Data Ingestion

To populate your database with the provided financial samples, run:

```bash
npm run ingest

```

This script will truncate existing tables and ingest all data from `data/sample_a`, `sample_b`, and `sample_c`.

## Development & Testing

* **Run Server Locally**: `npm run dev`
To ask questions to agent run this in your terminal
* **Talking to agent** : `Invoke-RestMethod -Uri "https://tara-vije.onrender.com/ask" -Method POST -ContentType "application/json" -Body '{"question":"How much total amount did I spend on the merchant SWIGGY?"}'` 
* **Run Evaluation Suite**:
This script executes 14 test cases (including single lookups, refunds, category comparisons, and fund returns) to ensure the agent's accuracy and reliability.
```bash
npm run eval

```



## Deployment

This project is configured for deployment on **Render**.

1. **Deploy**: Connect your GitHub repository to Render as a "Web Service".
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**: Ensure `DATABASE_URL` and `OPENAI_API_KEY` are configured in the Render Dashboard.
5. **Node Version**: Set `NODE_VERSION` to `22.13.0` in Render Settings.

## API Documentation

The agent exposes a single endpoint for all interactions:

**`POST /ask`**

* **Body**: `{"question": "How much did I spend on food in total?"}`
* **Response**: `{"answer": "..."}`

## Observability

* **Logging**: The system logs every incoming request, tool call, and latency metric.
* **Failure Inspection**: If a query fails (e.g., "no-data" case), the logs will provide the exact tool output and parameters to debug the SQL query construction.

---
