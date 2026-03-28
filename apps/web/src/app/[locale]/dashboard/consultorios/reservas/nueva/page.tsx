import BookingPageEditor from '@/components/Consultorios/BookingPageEditor';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ consultorio?: string }>;
}

export default async function NuevaReservaPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { consultorio } = await searchParams;

  return (
    <BookingPageEditor
      mode="create"
      locale={locale}
      consultorioId={consultorio}
    />
  );
}
