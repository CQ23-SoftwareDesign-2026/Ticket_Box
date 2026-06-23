export function isAudienceOnly(roles: string[] = []) {
  return roles.length > 0 && roles.every((role) => role === 'Audience');
}

export function isCheckerOrAdmin(roles: string[] = []) {
  return roles.some((role) => role === 'Checker' || role === 'Admin');
}
