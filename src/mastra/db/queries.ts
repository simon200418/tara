import { pool } from './index';

// 1. Transactions & Spending Analytics
export async function queryTransactionsDB(params: {
  category?: string;
  merchant?: string;
  startDate?: string;
  endDate?: string;
  ignoreTransfers?: boolean;
  groupBy?: 'category' | 'merchant' | 'month';
}) {
  let sql = `SELECT `;
  const values: any[] = [];
  let idx = 1;

  if (params.groupBy === 'category') {
    sql += `category, SUM(amount) as net_spend, COUNT(*) as tx_count `;
  } else if (params.groupBy === 'merchant') {
    sql += `normalized_merchant as merchant, SUM(amount) as net_spend, COUNT(*) as tx_count `;
  } else if (params.groupBy === 'month') {
    sql += `TO_CHAR(date, 'YYYY-MM') as month, SUM(amount) as net_spend `;
  } else {
    sql += `* `;
  }

  sql += `FROM transactions WHERE 1=1 `;

  if (params.ignoreTransfers) {
    sql += `AND category != 'transfer' `;
  }
  if (params.category) {
    sql += `AND category = $${idx++} `;
    values.push(params.category.toLowerCase());
  }
  if (params.merchant) {
    sql += `AND normalized_merchant = $${idx++} `;
    values.push(params.merchant.toLowerCase());
  }
  if (params.startDate) {
    sql += `AND date >= $${idx++} `;
    values.push(params.startDate);
  }
  if (params.endDate) {
    sql += `AND date <= $${idx++} `;
    values.push(params.endDate);
  }

  if (params.groupBy) {
    const groupCol = params.groupBy === 'merchant' ? 'normalized_merchant' : params.groupBy;
    sql += `GROUP BY ${groupCol} ORDER BY net_spend DESC `;
  } else {
    sql += `ORDER BY date DESC LIMIT 500 `;
  }

  const client = await pool.connect();
  try {
    const res = await client.query(sql, values);
    return res.rows.map(row => {
      if (row.net_spend) row.net_spend = parseFloat(row.net_spend);
      if (row.amount) row.amount = parseFloat(row.amount);
      return row;
    });
  } finally {
    client.release();
  }
}

// 2. Fund Period Return (UPDATED to resolve names to IDs)
export async function getFundPeriodReturn(fundIdentifier: string, startDate: string, endDate: string) {
  const client = await pool.connect();
  try {
    // FIX: Look up by ID or partial Name if Tara passes the natural language name
    const fundRes = await client.query('SELECT id FROM funds WHERE id = $1 OR name ILIKE $2 LIMIT 1', [fundIdentifier, `%${fundIdentifier}%`]);
    if (!fundRes.rows.length) return null;
    const resolvedFundId = fundRes.rows[0].id;

    const query = `
      WITH start_nav AS (
        SELECT nav FROM fund_navs WHERE fund_id = $1 AND date >= $2 ORDER BY date ASC LIMIT 1
      ),
      end_nav AS (
        SELECT nav FROM fund_navs WHERE fund_id = $1 AND date <= $3 ORDER BY date DESC LIMIT 1
      )
      SELECT 
        (SELECT nav FROM start_nav) as start_nav,
        (SELECT nav FROM end_nav) as end_nav
    `;
    const res = await client.query(query, [resolvedFundId, startDate, endDate]);
    if (!res.rows.length || !res.rows[0].start_nav || !res.rows[0].end_nav) return null;
    
    const startNav = parseFloat(res.rows[0].start_nav);
    const endNav = parseFloat(res.rows[0].end_nav);
    const returnPct = ((endNav - startNav) / startNav) * 100;
    
    return { fundId: resolvedFundId, startNav, endNav, returnPct: parseFloat(returnPct.toFixed(2)) };
  } finally {
    client.release();
  }
}

// 3. Holding Realized Return (UPDATED to compute global totals for Tara)
export async function getHoldingReturns() {
  const query = `
    SELECT 
      h.fund_id, 
      h.fund_name, 
      h.units, 
      h.purchase_nav,
      (h.units * h.purchase_nav) as purchase_value,
      (
        SELECT nav FROM fund_navs fn 
        WHERE fn.fund_id = h.fund_id 
        ORDER BY fn.date DESC LIMIT 1
      ) as current_nav
    FROM holdings h
  `;
  const client = await pool.connect();
  try {
    const res = await client.query(query);
    
    let total_purchase = 0;
    let total_current = 0;
    let total_absolute_return = 0;

    const holdings = res.rows.map(row => {
      const currentNav = parseFloat(row.current_nav);
      const purchaseValue = parseFloat(row.purchase_value);
      const currentValue = parseFloat(row.units) * currentNav;
      const absoluteReturn = currentValue - purchaseValue;
      const returnPct = (absoluteReturn / purchaseValue) * 100;
      
      // Accumulate totals
      total_purchase += purchaseValue;
      total_current += currentValue;
      total_absolute_return += absoluteReturn;
      
      return {
        fund_name: row.fund_name,
        units: parseFloat(row.units),
        purchase_value: parseFloat(purchaseValue.toFixed(2)),
        current_value: parseFloat(currentValue.toFixed(2)),
        absolute_return_inr: parseFloat(absoluteReturn.toFixed(2)),
        realized_return_pct: parseFloat(returnPct.toFixed(2))
      };
    });

    const total_return_pct = total_purchase > 0 ? (total_absolute_return / total_purchase) * 100 : 0;

    // FIX: Return both the list and the pre-computed totals so Tara doesn't break her math rule
    return {
      holdings,
      portfolio_totals: {
        total_purchase_value: parseFloat(total_purchase.toFixed(2)),
        total_current_value: parseFloat(total_current.toFixed(2)),
        total_absolute_return_inr: parseFloat(total_absolute_return.toFixed(2)),
        total_realized_return_pct: parseFloat(total_return_pct.toFixed(2))
      }
    };
  } finally {
    client.release();
  }
}

//4.Recurring Detection
export async function getRecurringTransactions() {
  const query = `
    SELECT merchant, amount, COUNT(*) as frequency 
    FROM transactions 
    GROUP BY merchant, amount 
    HAVING COUNT(*) > 1 
    ORDER BY frequency DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
}