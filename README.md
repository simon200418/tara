# Provue Finance Research Agent (Tara)

Tara is a research-first AI persona capable of querying transaction histories, analyzing mutual fund market performance, and calculating portfolio returns.

## Setup
1. **Environment**: Install Node.js v18+ and `tsx`.
2. **Database**: Start a local Postgres instance and export your `DATABASE_URL` in `.env`.
3. **Install**: `npm install`
4. **Ingest Data**: 
   - Run `npm run ingest` (defaults to all samples).
   - Or, run `DATA_DIR=./data/sample_a npm run ingest` for specific datasets.

## Development
- **Run Server**: `npm run dev`
- **Run Command**: `Invoke-RestMethod -Uri "http://localhost:5000/ask" -Method POST -ContentType "application/json" -Body '{"question":"How much total amount did I spend on the merchant SWIGGY?"}'`
- **Evaluate**: Run `npm run eval` to execute the 12-case test suite.

## API
`POST /ask`
Body: `{"question": "..."}`
Response: `{"answer": "..."}`

## Ask as Follows:
