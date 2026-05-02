import { NextRequest, NextResponse } from 'next/server';
import { Professional, ProfessionalLiquidation } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; liquidationId: string }> }
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id: professionalId, liquidationId } = await params;

    const prof = await Professional.findOne({ _id: professionalId, userId: user._id }).lean();
    if (!prof) return NextResponse.json({ error: 'Professional not found' }, { status: 404 });

    const liquidation = await (ProfessionalLiquidation as any).findOneAndDelete({
      _id: liquidationId,
      professionalId,
      userId: user._id,
    });

    if (!liquidation) {
      return NextResponse.json({ error: 'Liquidation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
