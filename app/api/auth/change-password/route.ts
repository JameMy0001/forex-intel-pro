import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword, setMasterPassword, verifySessionToken } from '@/lib/auth/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('nexus_session');
    const isAuthenticated = verifySessionToken(sessionCookie?.value);

    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }

    // Verify current password first if provided
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
          { status: 400 }
        );
      }
    }

    const success = await setMasterPassword(newPassword.trim());
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถบันทึกรหัสผ่านใหม่ลงฐานข้อมูลได้' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว',
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
