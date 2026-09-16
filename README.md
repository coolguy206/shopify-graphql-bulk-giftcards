# Shopify GraphQL Bulk Gift Card Ingestion Engine

A high-performance Node.js backend utility designed to parse bulk CSV export sheets and programmatically issue, activate, and inject gift card assets into Shopify Plus stores utilizing the Admin GraphQL API.

## 🚀 Business Impact & Value
Manually migrating or generating thousands of promotional gift cards during platform migrations or large marketing campaigns is highly error-prone and time-consuming. This utility automates data ingestion, stream-parsing CSV datasets, mapping raw rows to structured payloads, and executing asynchronous GraphQL mutations to safely provision thousands of secure financial balances in seconds.

## 🛠️ Technical Stack
- **Runtime Environment:** Node.js
- **API Protocol:** Shopify Admin GraphQL API (Mutations)
- **Data Parsing:** `csv-parser` (or native file streaming)
- **Security & Config:** `dotenv`

## ⚙️ Core Architecture
- **Stream Ingestion Engine:** Reads incoming CSV files as an asynchronous data stream to process line items line-by-line, keeping memory overhead extremely low even during massive catalog uploads.
- **GraphQL Mutation Pipeline:** Replaced legacy REST endpoints with highly optimized `giftCardCreate` GraphQL mutations, passing specific operational arguments (`initialValue`, `customerId`, `expiryDate`) in a single network trip.
- **Decoupled Security Guardrails:** Completely insulates secret store tokens, admin API URLs, and operational environment keys out of version control via strict `.env` constraints.


## 📋 Prerequisites & Store Setup

⚠️ **Enterprise Constraint:** The Shopify Gift Card API is a protected resource restricted exclusively to **Shopify Plus** merchants. 

Before executing the bulk ingestion engine, your custom application must be granted permissions to create financial gift assets inside the Shopify dashboard:

1. Log into your **Shopify Admin Dashboard**.
2. Navigate to **Settings** > **Apps** > **Develop apps**.
3. Click **Create an app**, name your application (e.g., `Gift Card Importer`).
4. In the **Configure Admin API scopes** select the scopes your downstream endpoint scripts will need (check **`read_gift_cards, write_gift_cards`**).
5. Scroll down to the **Allowed redirection URL(s)** and add exactly: `http://localhost`
6. Click **Release**.
7. Navigate back to the app Overview page and click **Install app** on the right side of the screen and confirm the installation.



## 💻 Installation & Usage

1. Clone the repository:
   ```bash
   git clone https://github.com/coolguy206/shopify-graphql-bulk-giftcards.git
   cd shopify-graphql-bulk-giftcards
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environmental keys. Create a `.env` file in the root folder:
   ```env
   # Your store subdomain only (e.g., if your site is ://myshopify.com, input: store123)
   SHOPIFYURL_LIVE="your-store-subdomain"
   
   # Secure Access Token
   SHOPIFYACCESSTOKEN_LIVE="shpat_your_secure_oauth_token"
   ```

4. Format your source data. Duplicate the provided `gift-cards-template.csv` file, rename it to `gift-cards.csv`, and populate it with your active data records.


5. Execute the bulk upload pipeline:
   ```bash
   npm start
   ```


