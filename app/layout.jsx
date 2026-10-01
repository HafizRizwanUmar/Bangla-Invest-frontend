import './globals.css';

export const metadata = {
  title: {
    template: '%s | Bangla Invest',
    default: "Today's Gold Price in Bangladesh (BAJUS Rate)",
  },
  description: "Check the latest daily gold prices in Bangladesh based on official BAJUS rates. Track 22K, 21K, 18K, and traditional gold prices per bhori, gram, and ana updated today.",
  keywords: ["Gold price in Bangladesh", "Today gold price in Bangladesh", "BAJUS gold price", "Bangladesh gold rate today", "Gold price per bhori in Bangladesh"],
  alternates: {
    canonical: 'https://banglainvest.com',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
