import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || 10;
  
  try {
    // const history = await prisma.bajusRate.findMany({
    //   orderBy: { date: 'desc' },
    //   take: parseInt(limit)
    // });
    return NextResponse.json({ message: 'History API Endpoint', data: [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
