import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  console.log(`[API /auth/send-otp] Request started`);
  console.log(`[API /auth/send-otp] User-Agent: ${userAgent}`);
  console.log(`[API /auth/send-otp] Client IP: ${clientIp}`);

  try {
    const body = await req.json();
    const email = body.email;

    if (!email || typeof email !== 'string') {
      console.log(`[API /auth/send-otp] Missing or invalid email`);
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`[API /auth/send-otp] Sending OTP to: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);

    const supabase = await createClient();

    console.log(`[API /auth/send-otp] Calling Supabase signInWithOtp...`);
    const { data, error } = await supabase.auth.signInWithOtp({ email });
    const elapsed = Date.now() - startTime;

    if (error) {
      console.error(`[API /auth/send-otp] Supabase error after ${elapsed}ms:`, error.message, error.status);
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }

    console.log(`[API /auth/send-otp] Success after ${elapsed}ms`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[API /auth/send-otp] Exception after ${elapsed}ms:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
