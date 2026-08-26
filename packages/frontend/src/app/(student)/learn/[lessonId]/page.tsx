import { LessonViewer } from '@/components/student/lesson-viewer';

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return <LessonViewer lessonId={lessonId} />;
}
