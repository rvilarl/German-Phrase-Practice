export type AuthTokenListener = (token: string | null) => void;

let currentToken: string | null = null;
const listeners = new Set<AuthTokenListener>();
let unauthorizedHandler: (() => void) | null = null;

export const getAccessToken = (): string | null => currentToken;

export const setAccessToken = (token: string | null): void => {
  currentToken = token;
  listeners.forEach(listener => {
    try {
      listener(currentToken);
    } catch (error) {
      console.error('Auth token listener failed', error);
    }
  });
};

export const subscribe = (listener: AuthTokenListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearAccessToken = (): void => {
  setAccessToken(null);
};

export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = (): void => {
  try {
    unauthorizedHandler?.();
  } catch (error) {
    console.error('Unauthorized handler failed', error);
  }
};
