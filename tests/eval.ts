// tests/eval.ts
import fetch from 'node-fetch'; // Standard fetch or use global fetch if Node 18+

const PORT = process.env.PORT || 5000; // Matches your server port
const API_URL = `https://tara-vije.onrender.com/ask`;

// 12 carefully selected test cases to satisfy the Provue grading rubric
const EVALUATION_QUESTIONS = [
  { intent: "Single Lookup", q: "How much did I spend on food in total?" },
  { intent: "Date Filtering", q: "How much did I spend in January 2024?" },
  { intent: "Refunds", q: "What is my net spend on Netflix?" },
  { intent: "Merchant Aliases", q: "How much total amount did I spend on the merchant SWIGGY BANGALORE?" },
  { intent: "Transfers (explicit)", q: "How much money did I transfer to myself? (Include internal transfers)" },
  { intent: "Category Comparison", q: "Did I spend more on food or health?" },
  { intent: "No-Data Case", q: "How much did I spend on a Ferrari?" },
  { intent: "Fund Period Return", q: "What was the market period return for the Saffron Bluechip Equity Fund between 2023-04-01 and 2024-03-01?" },
  { intent: "Realized Return", q: "What is the total realized return percentage and absolute profit on my current mutual fund holdings?" },
  { intent: "Holding Details", q: "How many units of Kestrel Emerging Growth Fund do I own?" },
  { intent: "Max Spend Category", q: "Which category did I spend the most money on overall?" },
  { intent: "Currency Filter", q: "Did I have any transactions that were not in INR?" },
  { intent: "No-Data/Failure", q: "How much did I spend on a spaceship in the year 3000?" },
  { intent: "Recurring Detection", q: "Can you identify any recurring monthly subscription payments in my transaction history?" }
];

interface AskResponse {
  answer: string;
}

async function runEvaluations() {
  console.log(`\n🚀 Starting Provue Agent Evaluation Suite...`);
  console.log(`Target: ${API_URL}\n`);

  let successCount = 0;

  for (let i = 0; i < EVALUATION_QUESTIONS.length; i++) {
    const test = EVALUATION_QUESTIONS[i];
    console.log(`[Test ${i + 1}/${EVALUATION_QUESTIONS.length}] Intent: ${test.intent}`);
    console.log(`Question: "${test.q}"`);

    const startTime = Date.now();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: test.q })
      });

      const data = await response.json() as AskResponse;
      const latency = Date.now() - startTime;

      if (response.ok && data.answer) {
        console.log(`\x1b[32m✅ Answer:\x1b[0m ${data.answer}`);
        console.log(`⏱️ Latency: ${latency}ms\n`);
        successCount++;
      } else {
        console.log(`\x1b[31m❌ Failed (Status ${response.status}):\x1b[0m ${JSON.stringify(data)}\n`);
      }
    } catch (error: any) {
      console.log(`\x1b[31m❌ Error reaching server:\x1b[0m ${error.message}\n`);
    }

    // Optional: Add a 2-second delay between requests to avoid Gemini Free Tier API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Evaluation Complete: ${successCount}/${EVALUATION_QUESTIONS.length} passed.`);
  if (successCount === EVALUATION_QUESTIONS.length) {
    console.log(`🎉 Ready for submission!`);
  }
}

runEvaluations();