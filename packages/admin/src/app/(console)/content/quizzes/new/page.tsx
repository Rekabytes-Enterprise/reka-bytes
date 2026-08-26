import { QuizNew } from '@/components/content/quiz-new';

export default async function NewQuizPage({ searchParams }: { searchParams: Promise<{ moduleId?: string }> }) {
  const { moduleId } = await searchParams;
  return <QuizNew moduleId={moduleId ?? ''} />;
}
