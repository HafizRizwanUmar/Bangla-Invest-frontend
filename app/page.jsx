import React from 'react';
import AppWrapper from './AppWrapper';
// import prisma from '@/lib/prisma'; // Assuming we have a prisma client instance

export async function generateMetadata() {
  // In a real implementation:
  // const latest = await prisma.bajusRate.findFirst({ orderBy: { date: 'desc' } });
  // const price = latest?.k22_vori || '1,16,000';
  
  const price = '1,16,000'; // Mock price for now
  
  return {
    title: `22K Gold Price: ৳${price} / Bhori | Today's BAJUS Rate`,
    description: `Check the latest daily gold prices in Bangladesh based on official BAJUS rates. Track 22K, 21K, 18K, and traditional gold prices per bhori, gram, and ana updated today.`
  };
}

export default async function Page() {
  // In a real implementation:
  // const latest = await prisma.bajusRate.findFirst({ orderBy: { date: 'desc' } });
  
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How many grams is a vori, an ana and a roti?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "One vori is 11.664 grams. It divides into 16 ana of 0.729 g, each ana into 6 roti of 0.1215 g, and each roti into 10 point."
        }
      },
      {
        "@type": "Question",
        "name": "Why is gold more expensive in Bangladesh than the world price?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Import duty, 5% VAT and the cost of bringing metal in mean a vori of 22K here costs a third more than the same weight at the international spot price."
        }
      }
    ]
  };

  const financialProductSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": "22 Karat Gold (Bangladesh)",
    "offers": {
      "@type": "Offer",
      "price": "116000",
      "priceCurrency": "BDT",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "price": "116000",
        "priceCurrency": "BDT",
        "referenceQuantity": {
          "@type": "QuantitativeValue",
          "value": "1",
          "unitText": "Bhori"
        }
      }
    }
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Historical BAJUS Gold Prices in Bangladesh",
    "description": "A dataset of daily gold prices in Bangladesh according to the Bangladesh Jewellers Association (BAJUS) spanning 2007 to present.",
    "url": "https://banglainvest.com/"
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(financialProductSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />
      
      <AppWrapper />
    </>
  );
}
