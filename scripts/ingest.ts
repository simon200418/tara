import fs from 'fs/promises';
import path from 'path';
import { pool, initDB } from '../src/mastra/db/index';

// Generic Merchant Alias Strategy
function normalizeMerchant(name: string): string {
  if (!name) return 'unknown';
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const firstWord = clean.split(' ')[0];
  return firstWord || 'unknown';
}

// Helper to check if a directory/file exists
async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ingest() {
  const dirsToLoad = process.env.DATA_DIR 
    ? [process.env.DATA_DIR] 
    : ['./data/sample_a', './data/sample_b', './data/sample_c'];
  
  console.log(`Starting ingestion from: ${dirsToLoad.join(', ')}`);

  // Ensure tables exist
  await initDB();

  const client = await pool.connect();
  try {
    // Wipe existing data ONCE before looping
    await client.query('TRUNCATE TABLE holdings, fund_navs, funds, transactions CASCADE');
    
    // Track how many prices we actually save
    let totalNavsInserted = 0; 

    for (const dataDir of dirsToLoad) {
      console.log(`\n--- Processing directory: ${dataDir} ---`);
      
      if (!(await pathExists(dataDir))) {
        console.warn(`⚠️ Directory ${dataDir} not found. Skipping...`);
        continue;
      }

      // Read JSON files
      const transactionsData = JSON.parse(await fs.readFile(path.join(dataDir, 'transactions.json'), 'utf-8'));
      const fundsData = JSON.parse(await fs.readFile(path.join(dataDir, 'funds.json'), 'utf-8'));
      const holdingsData = JSON.parse(await fs.readFile(path.join(dataDir, 'holdings.json'), 'utf-8'));

      console.log(`Ingesting ${transactionsData.length} transactions...`);
      for (const t of transactionsData) {
        const normalized = normalizeMerchant(t.merchant);
        try {
          await client.query(
            `INSERT INTO transactions (id, date, merchant, normalized_merchant, category, amount, currency, memo)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [t.id, t.date, t.merchant, normalized, t.category || 'uncategorized', t.amount, t.currency, t.memo]
          );
        } catch (error: any) {
          if (error.code !== '23505') throw error; 
        }
      }

      console.log(`Ingesting ${fundsData.length} funds...`);
      for (const f of fundsData) {
        try {
          await client.query(
            `INSERT INTO funds (id, name, category) VALUES ($1, $2, $3)`,
            [f.id, f.name, f.category]
          );
        } catch (error: any) {
          if (error.code !== '23505') throw error;
        }

        // FIX: Added f.nav (singular) so it correctly finds the data!
        const navs = f.nav || f.navs || f.history || f.nav_history;
        
        if (Array.isArray(navs)) {
          for (const navPoint of navs) {
            const navValue = navPoint.value !== undefined ? navPoint.value : navPoint.nav;
            try {
              await client.query(
                `INSERT INTO fund_navs (fund_id, date, nav) VALUES ($1, $2, $3)`,
                [f.id, navPoint.date, navValue]
              );
              totalNavsInserted++; // Count successful inserts
            } catch (error: any) {
              if (error.code !== '23505') throw error;
            }
          }
        } else if (typeof navs === 'object' && navs !== null) {
          for (const [date, navPoint] of Object.entries(navs)) {
            try {
              await client.query(
                `INSERT INTO fund_navs (fund_id, date, nav) VALUES ($1, $2, $3)`,
                [f.id, date, navPoint]
              );
              totalNavsInserted++; // Count successful inserts
            } catch (error: any) {
               if (error.code !== '23505') throw error;
            }
          }
        }
      }

      console.log(`Ingesting ${holdingsData.length} holdings...`);
      for (const h of holdingsData) {
        try {
          await client.query(
            `INSERT INTO holdings (fund_id, fund_name, units, purchase_date, purchase_nav)
             VALUES ($1, $2, $3, $4, $5)`,
            [h.fund_id, h.fund_name, h.units, h.purchase_date, h.purchase_nav]
          );
        } catch (error: any) {
          if (error.code !== '23505') throw error;
        }
      }
    }

    console.log(`\n✅ Ingestion complete! Successfully saved ${totalNavsInserted} historical NAV prices.`);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
  } finally {
    client.release();
  }
}

ingest()
  .catch(console.error)
  .finally(() => pool.end());