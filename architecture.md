# Bangla Invest - Full-Stack Architecture Plan

## 1. System Overview

Currently, the application is a static React site that relies on a hardcoded `data.json` file. To transition into a robust, automated platform that fetches, stores, and serves real-time and historical gold prices, we need to implement a full-stack architecture. 

This document outlines the proposed modern tech stack, database design, API specifications, and the data ingestion strategy.

---

## 2. Proposed Tech Stack

### Frontend: Next.js (React)
- **Framework:** Next.js (App Router). Next.js provides excellent SEO capabilities through Server-Side Rendering (SSR) and Static Site Generation (SSG), which is crucial for a financial tracking website to rank well on search engines.
- **Styling:** Tailwind CSS (matches current ecosystem) for responsive, fast UI development.
- **State Management:** React Context or Zustand for lightweight global state.
- **Data Fetching:** React Query or native Next.js fetch with revalidation.
- **Hosting:** Vercel or Netlify.

### Backend: Node.js / Express OR Next.js API Routes
- **Framework:** Next.js API Routes (Serverless Functions) to keep the repository unified (monorepo). Alternatively, a standalone Node.js/Express or Python (FastAPI) server if scraping requires heavy processing.
- **Architecture:** RESTful API to serve data to the frontend.
- **Task Scheduling:** GitHub Actions (cron jobs) or a dedicated worker (like Render Background Worker / Inngest) to run scheduled scraping/ingestion tasks.

### Database: MongoDB
- **Database Engine:** MongoDB. NoSQL databases provide flexibility for documents and work great with JS/TS ecosystems.
- **Hosting:** MongoDB Atlas.
- **ORM/ODM:** Prisma ORM or Mongoose for schema definition and queries.

---

## 3. Database Schema (Collections)

Using MongoDB, we can store the data in flexible documents using Prisma or Mongoose.

### `bajus_rates` Collection (Local Gold/Silver Prices)
| Field | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `_id` | ObjectId | Primary Key | Unique identifier |
| `date` | Date | Unique | The date the rate was announced |
| `k22_vori` | Number | Required | 22 Karat price per Vori |
| `k21_vori` | Number | Required | 21 Karat price per Vori |
| `k18_vori` | Number | Required | 18 Karat price per Vori |
| `trad_vori` | Number | Required | Traditional gold price per Vori |
| `change_amt` | Number | | Change from previous rate |
| `reason` | String | | e.g., "Cut after tejabi gold fell locally" |
| `createdAt` | Date | Default Date.now | Record creation time |

### `global_metrics` Collection (Spot Price & FX Rates)
| Field | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `_id` | ObjectId | Primary Key | Unique identifier |
| `date` | Date | Unique | Timestamp of the metric |
| `spot_usd` | Number | Required | XAU/USD Spot Price |
| `usd_bdt` | Number | Required | USD to BDT exchange rate |
| `spot_source`| String | | e.g., "Kitco API" |

---

## 4. API Endpoints

The backend will expose the following endpoints for the frontend to consume:

### `GET /api/v1/rates/latest`
- **Description:** Returns the most recent BAJUS rates, current global spot price, and exchange rate.
- **Response Structure:** Combines the latest document from `bajus_rates` and `global_metrics`. Used for the main dashboard.

### `GET /api/v1/rates/history`
- **Query Params:** `?limit=10` or `?startDate=YYYY-MM-DD`
- **Description:** Retrieves historical BAJUS rates.
- **Use Case:** Populating the historical changes table and generating line charts.

### `GET /api/v1/stats/summary`
- **Description:** Calculates derived statistics (e.g., Year-over-Year growth, All-time High record, up/down tally for the year).
- **Use Case:** Displaying quick stats/metrics blocks.

---

## 5. Data Ingestion Strategy

To replace the hardcoded `data.json`, we need an automated pipeline to fetch real data. 

### Sources
1. **BAJUS (Local Rates):** BAJUS does not provide a public API. We will use a web scraper (e.g., Cheerio/Puppeteer in Node.js, or BeautifulSoup in Python) to parse the official BAJUS website periodically.
2. **Spot Price:** Use a third-party API like Metals-API, GoldAPI.io, or scrape Kitco for XAU/USD rates.
3. **Exchange Rate:** Use an API like Open Exchange Rates or ExchangeRate-API for the latest USD to BDT mid-market rates.

### Workflow & Automation
1. **Cron Job Schedule:** Run a background job every 4-6 hours. (GitHub Actions can trigger this for free).
2. **Scraping Step:** 
   - Fetch the latest rate published on the BAJUS site.
   - Fetch current spot price and FX rate.
3. **Comparison & DB Update:** 
   - Compare the scraped BAJUS rate with the latest date/rate in the MongoDB database.
   - If there is a new announcement, insert a new document into the `bajus_rates` collection.
   - Always insert new spot/fx snapshots into `global_metrics` collection.
4. **Cache Invalidation:** 
   - Upon a new BAJUS rate insertion, call the Next.js On-Demand Revalidation API (`/api/revalidate?secret=...`). This forces the Next.js frontend to rebuild the static pages so users see the new rates instantly without requiring server rendering for every visitor.

## 6. Migration Plan

1. **Phase 1: Setup Foundation:** Initialize Next.js project. Port existing React components and Tailwind styles. Keep `data.json` as a temporary data source.
2. **Phase 2: Database & API:** Setup MongoDB Atlas. Define Prisma/Mongoose schemas. Build Next.js API Routes and connect to DB.
3. **Phase 3: Ingestion Pipeline:** Write the scraping script. Set up a cron job to populate the DB.
4. **Phase 4: Integration:** Update frontend to fetch from `/api/v1/rates/...` instead of `data.json`.
5. **Phase 5: Deployment:** Deploy DB on MongoDB Atlas, Frontend to Vercel.
