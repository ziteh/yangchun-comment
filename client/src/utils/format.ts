export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  if (hour === 0) hour = 12;
  const h = String(hour).padStart(2, '0');

  return `${y}/${m}/${d} ${h}:${minute} ${period}`;
}
