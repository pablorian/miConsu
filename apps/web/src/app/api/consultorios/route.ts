import { NextRequest, NextResponse } from 'next/server';
import { Consultorio } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const consultorios = await Consultorio.find({ userId: user._id }).sort({ name: 1 });
    return NextResponse.json({ consultorios });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { name, description, hourlyRate, color } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const consultorio = await Consultorio.create({
      userId: user._id, name, description, hourlyRate: hourlyRate || 0, color: color || '#6366f1',
    });
    return NextResponse.json({ consultorio });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
