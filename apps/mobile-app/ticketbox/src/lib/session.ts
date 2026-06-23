let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => Promise<void> | void) | null = null;
let sessionUserHandler: ((user: unknown) => void) | null = null;

export function setSessionTokens(nextAccessToken: string | null, nextRefreshToken: string | null) {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function registerUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  unauthorizedHandler = handler;
}

export async function handleUnauthorized() {
  await unauthorizedHandler?.();
}

export function registerSessionUserHandler(handler: ((user: unknown) => void) | null) {
  sessionUserHandler = handler;
}

export function handleSessionUser(user: unknown) {
  sessionUserHandler?.(user);
}
