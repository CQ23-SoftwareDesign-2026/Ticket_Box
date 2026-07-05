export function formatSchedule(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Schedule unavailable';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatScanTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTicketTypes(labels: string[]) {
  if (labels.length === 0) {
    return 'Not configured';
  }

  return labels.join(', ');
}

export function shortenQrValue(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
