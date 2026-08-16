import { NextResponse } from 'next/server';
import { verifyPassword, createSessionToken } from '@/lib/auth/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, rememberMe = true } = body;

    if (!password) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสผ่าน' }, { status: 400 });
    }

    const isValid = await verifyPassword(password);
    if (!isValid) {
      // Artificial delay to mitigate brute-force attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
    });

    response.cookies.set({
      name: 'nexus_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
