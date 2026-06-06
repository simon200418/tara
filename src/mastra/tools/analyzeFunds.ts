import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getFundPeriodReturn, getHoldingReturns } from '../db/queries';

export const analyzeFunds = createTool({
  id: 'analyzeFunds',
  description: `Analyzes mutual funds and portfolio holdings. 
    Crucial distinction: 
    1. 'period_return' calculates a fund's market performance between two dates. Requires fundId, startDate, and endDate.
    2. 'holding_return' calculates the user's actual realized return (profit/loss) on the funds they own today. Provides total portfolio profit and individual holding breakdown.`,
  inputSchema: z.object({
    action: z.enum(['period_return', 'holding_return']).describe('Which calculation to perform.'),
    // FIX: Updated description to accept Name or ID
    fundId: z.string().optional().describe('Required for period_return. The ID or exact name of the fund (e.g., Saffron Bluechip Equity Fund).'),
    startDate: z.string().optional().describe('Required for period_return. Format YYYY-MM-DD.'),
    endDate: z.string().optional().describe('Required for period_return. Format YYYY-MM-DD.')
  }),
  execute: async (data) => {
    try {
      if (data.action === 'holding_return') {
        const holdingsData = await getHoldingReturns();
        return { status: 'success', data: holdingsData };
      } 
      
      if (data.action === 'period_return') {
        if (!data.fundId || !data.startDate || !data.endDate) {
          return { status: 'error', message: 'Missing required parameters for period_return (fundId, startDate, endDate).' };
        }
        const fundReturn = await getFundPeriodReturn(data.fundId, data.startDate, data.endDate);
        if (!fundReturn) {
          return { status: 'success', data: null, message: 'No NAV data found for the requested fund and date range.' };
        }
        return { status: 'success', data: fundReturn };
      }

      return { status: 'error', message: 'Invalid action.' };
    } catch (error: any) {
      console.error('Tool Error [analyzeFunds]:', error.message);
      return { status: 'error', message: 'Failed to analyze funds.' };
    }
  }
});