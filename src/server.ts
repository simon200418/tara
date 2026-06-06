import express from 'express';
import { taraAgent } from './mastra/agents/taraAgent';

const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { question } = req.body;
  const requestId = Math.random().toString(36).substring(2, 9);

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A valid "question" string is required in the JSON body.' });
  }

  // Basic Observability Logging
  console.log(`\n[Req: ${requestId}] --------------------------------`);
  console.log(`[Req: ${requestId}] Question: "${question}"`);
  const startTime = Date.now();

  try {
    // Pass the question to the Mastra agent
    const response = await taraAgent.generate(question);
    
    const latency = Date.now() - startTime;
    console.log(`[Req: ${requestId}] Status: SUCCESS | Latency: ${latency}ms`);
    
    // Return the exact JSON shape required by the grading script
    res.json({ answer: response.text });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error(`[Req: ${requestId}] Status: FAILED | Latency: ${latency}ms`);
    console.error(`[Req: ${requestId}] Error: ${error.message}`);
    
    // Fallback response for safety
    res.status(500).json({ answer: "I encountered an internal error while looking up that information." });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Tara agent server is running on http://localhost:${PORT}`);
  console.log(`Ready to accept POST requests at http://localhost:${PORT}/ask`);
});