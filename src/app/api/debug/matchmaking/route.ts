import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    const body = await req.json();
    const { event, myId, roomId, channelStatus, error } = body;

    console.log(`[Matchmaking Debug] =====================================`);
    console.log(`[Matchmaking Debug] Event: ${event}`);
    console.log(`[Matchmaking Debug] User-Agent: ${userAgent.slice(0, 80)}`);
    console.log(`[Matchmaking Debug] Client IP: ${clientIp}`);
    console.log(`[Matchmaking Debug] My ID: ${myId || 'N/A'}`);
    console.log(`[Matchmaking Debug] Room ID: ${roomId || 'N/A'}`);
    console.log(`[Matchmaking Debug] Channel Status: ${channelStatus || 'N/A'}`);
    if (error) {
      console.log(`[Matchmaking Debug] Error: ${error}`);
    }
    console.log(`[Matchmaking Debug] =====================================`);

    return NextResponse.json({ logged: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Matchmaking Debug] Failed to parse body:`, message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
