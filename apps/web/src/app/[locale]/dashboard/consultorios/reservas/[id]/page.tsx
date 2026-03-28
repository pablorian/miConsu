import BookingPageEditor from '@/components/Consultorios/BookingPageEditor';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditReservaPage({ params }: Props) {
  const { locale, id } = await params;

  return (
    <BookingPageEditor
      mode="edit"
      locale={locale}
      pageId={id}
    />
  );
}
