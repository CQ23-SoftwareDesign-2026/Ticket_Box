const PREFETCH_MAX_AGE_MS = 30 * 60 * 1000;

export function isPrefetchExpired(prefetchedAt: string, now = Date.now()) {
  const prefetchedTime = new Date(prefetchedAt).getTime();

  if (Number.isNaN(prefetchedTime)) {
    return true;
  }

  return now - prefetchedTime > PREFETCH_MAX_AGE_MS;
}

export function formatPrefetchAge(prefetchedAt: string, now = Date.now()) {
  const prefetchedTime = new Date(prefetchedAt).getTime();

  if (Number.isNaN(prefetchedTime)) {
    return 'Unknown';
  }

  const ageMinutes = Math.max(0, Math.round((now - prefetchedTime) / 60000));

  if (ageMinutes < 1) {
    return 'Just now';
  }

  if (ageMinutes === 1) {
    return '1 minute ago';
  }

  if (ageMinutes < 60) {
    return `${ageMinutes} minutes ago`;
  }

  const ageHours = Math.round(ageMinutes / 60);
  return ageHours === 1 ? '1 hour ago' : `${ageHours} hours ago`;
}
