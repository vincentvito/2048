import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log(`[API /auth/verify-otp] Request started`);
  console.log(`[API /auth/verify-otp] User-Agent: ${userAgent}`);

  try {
    const body = await req.json();
    const { email, token } = body;

    if (!email || typeof email !== 'string') {
      console.log(`[API /auth/verify-otp] Missing email`);
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!token || typeof token !== 'string') {
      console.log(`[API /auth/verify-otp] Missing token`);
      return NextResponse.json({ error: 'OTP code is required' }, { status: 400 });
    }

    console.log(`[API /auth/verify-otp] Verifying OTP for: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);

    const supabase = await createClient();

    console.log(`[API /auth/verify-otp] Calling Supabase verifyOtp...`);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    const elapsed = Date.now() - startTime;

    if (error) {
      console.error(`[API /auth/verify-otp] Supabase error after ${elapsed}ms:`, error.message, error.status);
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }

    console.log(`[API /auth/verify-otp] Success after ${elapsed}ms, user: ${data.user?.id}`);

    // Return session info so client can set it
    return NextResponse.json({
      success: true,
      session: data.session,
      user: data.user,
    });
  } catch (e) {
    const elapsed = Date.now() - startTime;
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[API /auth/verify-otp] Exception after ${elapsed}ms:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
