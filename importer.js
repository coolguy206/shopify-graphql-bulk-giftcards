require('dotenv').config();

const fs = require('fs');
const csv = require('csv-parser');


const SHOP_SUBDOMAIN = process.env.SHOPIFYURL_LIVE;
const ACCESS_TOKEN = process.env.SHOPIFYACCESSTOKEN_LIVE;
const API_VERSION = '2026-04'; 

// Targets your single file name directly in the root directory
const CSV_FILE_PATH = './gift-cards.csv';
const ERROR_LOG_PATH = './errors.txt';

// Core Endpoint (Using the updated 2026 stable API path)
const GRAPHQL_URL = `https://${SHOP_SUBDOMAIN}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

// Gift Card Creation GraphQL Mutation
const CREATE_MUTATION = `
  mutation giftCardCreate($input: GiftCardCreateInput!) {
    giftCardCreate(input: $input) {
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to log errors both to the terminal and to errors.txt instantly
function logError(message, details = '') {
  const timestamp = new Date().toISOString();
  const detailedString = typeof details === 'object' ? JSON.stringify(details, null, 2) : details;
  const logMessage = `[${timestamp}] ${message} ${detailedString}\n`;
  
  console.error(message, details); 
  fs.appendFileSync(ERROR_LOG_PATH, logMessage); 
}

async function uploadToShopify(giftCardInput, token) {
  const variables = {
    input: giftCardInput
  };

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({ query: CREATE_MUTATION, variables })
    });
    const result = await response.json();

    if (result.errors) {
      logError(`Fatal GraphQL Schema Error for code [${giftCardInput.code}]:`, result.errors);
      return false;
    }

    const giftCardResult = result.data?.giftCardCreate;
    if (giftCardResult?.userErrors?.length > 0) {
      logError(`❌ Shopify Reject for code [${giftCardInput.code}]:`, giftCardResult.userErrors);
      return false;
    }

    console.log(`✅ Successfully synced Gift Card: ${giftCardInput.code}`);
    return true;
  } catch (err) {
    logError(`Network request failed for code [${giftCardInput.code}]:`, err.message);
    return false;
  }
}

function processCsvFile(token) {
  return new Promise((resolve, reject) => {
    const rows = [];

    if (!fs.existsSync(CSV_FILE_PATH)) {
      logError(`File not found: ${CSV_FILE_PATH}`);
      return resolve();
    }

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('error', (err) => {
        logError('CSV Stream Error:', err.message);
        reject(err);
      })
      .on('end', async () => {
        console.log(`\nProcessing file: ${CSV_FILE_PATH} (${rows.length} rows)`);

        for (const row of rows) {
          // Normalize row keys dynamically to prevent spaces/case mismatch bugs
          const cleanRow = {};
          for (let header in row) {
            const normalizedKey = header.toLowerCase().trim().replace(/[\r\n]/g, '');
            cleanRow[normalizedKey] = row[header] ? row[header].trim() : '';
          }

          // Verify row has required minimum data before trying to create it
          if (!cleanRow.code || !cleanRow.initial_value) {
            console.warn(`⚠️ Skipping row because code or initial_value is missing.`);
            continue;
          }

          const originalCode = cleanRow.code;

          // STRICT VALIDATION: Catch invalid code lengths before hitting Shopify
          if (originalCode.length < 8 || originalCode.length > 20) {
            logError(`\n❌ [VALIDATION FAILURE]: Gift card code "${originalCode}" is invalid!`, 
                     `Length: ${originalCode.length}. Code must be 8-20 characters. SKIPPING.`);
            continue; 
          }

          // Build your giftCardInput object matching the 2026-04 schema rules
          const giftCardInput = {
            code: originalCode,
            initialValue: parseFloat(cleanRow.initial_value).toFixed(2), // Formatted string for Decimal Scalar
            note: cleanRow.note || '' 
          };

          // Schema fix: Shopify GraphQL expects 'expiresAt', not 'expiresOn'
          if (cleanRow.expires_on && cleanRow.expires_on !== '') {
            giftCardInput.expiresAt = cleanRow.expires_on;
          }

          // Upload card and wait brief period to satisfy standard Shopify API limits
          await uploadToShopify(giftCardInput, token);
          await sleep(250);
        }
        resolve();
      });
  });
}

async function runImporter() {
  // Clear or initialize the errors file on start
  fs.writeFileSync(ERROR_LOG_PATH, `--- Error Log Session Started: ${new Date().toISOString()} ---\n`);

  console.log('Validating configuration using Shopify Access Token...');

  // Fallback checks to ensure variables loaded from .env
  if (!SHOP_SUBDOMAIN || !ACCESS_TOKEN) {
    logError('Configuration Error: Missing SHOPIFYURL_LIVE or SHOPIFYACCESSTOKEN_LIVE keys in your .env file!');
    return;
  }

  // Pass the token directly into the loop processor
  await processCsvFile(ACCESS_TOKEN);
  console.log('\n🏁 Importer complete!');
}

runImporter();
