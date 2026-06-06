import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getRecurringTransactions, queryTransactionsDB } from "../db/queries";

export const queryTransactions = createTool({
  id: "queryTransactions",
  description: `Queries the user's transaction history. 
    Use this to find specific transactions, compute total spending, or aggregate spend by category, merchant, or month.
    Always pass ignoreTransfers: true unless the user specifically asks about internal transfers.`,
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter by exact category name (e.g., food, travel)."),
    merchant: z
      .string()
      .optional()
      .describe(
        "Filter by merchant name. Pass a single lowercase word (e.g., swiggy).",
      ),
    startDate: z
      .string()
      .optional()
      .describe("Start date in YYYY-MM-DD format."),
    endDate: z.string().optional().describe("End date in YYYY-MM-DD format."),
    ignoreTransfers: z
      .boolean()
      .optional()
      .describe("Set to true to exclude self-transfers from spending totals."),
    groupBy: z
      .enum(["category", "merchant", "month"])
      .optional()
      .describe(
        "Aggregate results by this dimension instead of returning raw rows.",
      ),
  }),

  execute: async (data) => {
    try {
      const results = await queryTransactionsDB({
        ...data,
        ignoreTransfers: data.ignoreTransfers !== false, // Defaults to true, but accepts false
      });
      if (!results || results.length === 0) {
        return {
          status: "success",
          data: [],
          message: "No data found for the given parameters.",
        };
      }
      
      if (data.action === "recurring") {
        const recurring = await getRecurringTransactions(); // Ensure this is imported
        return { status: "success", data: recurring };
      }
      return { status: "success", data: results };
    } catch (error: any) {
      console.error("Tool Error [queryTransactions]:", error.message);
      return {
        status: "error",
        message: "Failed to query database. Adjust parameters and try again.",
      };
    }
  },
});
