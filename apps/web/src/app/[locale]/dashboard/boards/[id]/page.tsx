import BoardDetailClient from '@/components/Tasks/BoardDetailClient';

interface Props { params: Promise<{ id: string }> }

export default async function BoardDetailPage({ params }: Props) {
  const { id } = await params;
  return <BoardDetailClient boardId={id} />;
}
