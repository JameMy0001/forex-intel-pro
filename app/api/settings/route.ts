import { NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/lib/db/localDb';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      settings,
      allSymbols: DEFAULT_SYMBOLS,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await updateSystemSettings(body);
    return NextResponse.json({
      success: true,
      settings: updated,
      message: 'Settings updated successfully!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
