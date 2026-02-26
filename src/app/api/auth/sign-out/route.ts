import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  console.log(`[API /auth/sign-out] Request from: ${userAgent.slice(0, 50)}`);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(`[API /auth/sign-out] Error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[API /auth/sign-out] Success`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[API /auth/sign-out] Exception:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
