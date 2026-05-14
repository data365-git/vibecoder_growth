import { useParams } from 'react-router-dom';

export default function WeeklyReview() {
  const { vibecoderId } = useParams();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Weekly review {vibecoderId ? `· vc#${vibecoderId}` : ''}</h1>
      <p className="text-sm text-muted-foreground">
        Выбери vibecoder’а слева в команде, чтобы пройти weekly review.
        В этой версии review проходится в боте + менеджер заполняет manager_notes здесь.
      </p>
      <p className="text-sm text-muted-foreground">
        (Подробный UI weekly review будет дополнен после первого месяца использования системы.)
      </p>
    </div>
  );
}
