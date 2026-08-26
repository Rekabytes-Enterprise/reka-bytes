import { QuizRunner } from '@/components/student/quiz-runner';

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  return <QuizRunner quizId={quizId} />;
}
