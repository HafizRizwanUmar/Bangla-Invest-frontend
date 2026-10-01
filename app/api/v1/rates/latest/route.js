import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

export async function GET() {
  try {
    // In a real implementation, we would query the database here.
    // const latestRate = await prisma.bajusRate.findFirst({
    //   orderBy: { date: 'desc' }
    // });
    // const latestMetric = await prisma.globalMetric.findFirst({
    //   orderBy: { date: 'desc' }
    // });

    // Mocking response based on data.json for now to keep it working
    const mockData = {
      bajus: {
        date: new Date().toISOString(),
        k22_vori: 116000,
        k21_vori: 110000,
        k18_vori: 95000,
        trad_vori: 80000,
        change_amt: 500,
      },
      global: {
        spot_usd: 2600.50,
        usd_bdt: 121.50
      }
    };

    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
