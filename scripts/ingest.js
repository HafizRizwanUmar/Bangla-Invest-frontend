// scripts/ingest.js
const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');
// Note: In Node.js 18+, fetch is available natively.

const prisma = new PrismaClient();

async function scrapeBajus() {
  console.log('Fetching BAJUS website...');
  // Mocking the fetch since we don't have the actual BAJUS URL/HTML to parse right now.
  // const response = await fetch('https://www.bajus.org/gold-price');
  // const html = await response.text();
  // const $ = cheerio.load(html);
  
  // Example extraction logic:
  // const k22Price = parseInt($('.k22-price-selector').text().replace(/[^\d]/g, ''), 10);
  
  const mockedScrapedData = {
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    k22_vori: 116000,
    k21_vori: 110000,
    k18_vori: 95000,
    trad_vori: 80000,
    reason: "Adjusted with global market",
  };
  
  return mockedScrapedData;
}

async function scrapeGlobalMetrics() {
  console.log('Fetching global metrics...');
  // Example: fetch from a free spot price API or scrape
  // const response = await fetch('https://api.metals.live/v1/spot');
  
  const mockedGlobal = {
    date: new Date(),
    spot_usd: 2600.50,
    usd_bdt: 121.50,
    spot_source: "Mock API"
  };
  
  return mockedGlobal;
}

async function run() {
  try {
    const bajusData = await scrapeBajus();
    const globalData = await scrapeGlobalMetrics();
    
    // Check if the bajus rate for this date already exists
    const existingBajus = await prisma.bajusRate.findUnique({
      where: { date: bajusData.date }
    });
    
    if (!existingBajus) {
      // Calculate change_amt by fetching the previous latest
      const previousRate = await prisma.bajusRate.findFirst({
        orderBy: { date: 'desc' }
      });
      
      const changeAmt = previousRate ? bajusData.k22_vori - previousRate.k22_vori : 0;
      
      console.log('Inserting new BAJUS rate into MongoDB...');
      await prisma.bajusRate.create({
        data: {
          ...bajusData,
          change_amt: changeAmt
        }
      });
    } else {
      console.log('BAJUS rate for today already exists in MongoDB. Skipping insert.');
    }
    
    console.log('Inserting global metrics into MongoDB...');
    await prisma.globalMetric.create({
      data: globalData
    });
    
    console.log('Ingestion completed successfully.');
  } catch (err) {
    console.error('Error during ingestion:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
