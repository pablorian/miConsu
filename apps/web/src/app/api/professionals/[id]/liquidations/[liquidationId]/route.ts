import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Professional, ProfessionalLiquidation } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value) as any;
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: session.id }).lean() as any;
}

// DELETE /api/professionals/[id]/liquidations/[liquidationId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; liquidationId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: professionalId, liquidationId } = await params;

    // Verify professional belongs to user
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
