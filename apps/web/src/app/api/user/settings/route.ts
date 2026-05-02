import { NextRequest, NextResponse } from 'next/server';
import { UserSettings } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATE = 'Hola {nombre}, te recordamos tu turno el {fecha} a las {hora} hs. ¡Te esperamos! 🗓️';

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const settings = await UserSettings.findOne({ userId: user._id }).lean() as any;

  return NextResponse.json({
    autoGenerateFichasObrasSociales: settings?.autoGenerateFichasObrasSociales ?? false,
    whatsappReminderTemplate: settings?.whatsappReminderTemplate ?? DEFAULT_TEMPLATE,
  });
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { autoGenerateFichasObrasSociales, whatsappReminderTemplate } = await request.json();

  const updated = await UserSettings.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        ...(typeof autoGenerateFichasObrasSociales === 'boolean' && { autoGenerateFichasObrasSociales }),
        ...(typeof whatsappReminderTemplate === 'string' && { whatsappReminderTemplate }),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    autoGenerateFichasObrasSociales: updated.autoGenerateFichasObrasSociales,
    whatsappReminderTemplate: updated.whatsappReminderTemplate,
  });
}
