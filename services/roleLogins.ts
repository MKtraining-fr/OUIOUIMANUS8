import type { RoleLogin } from '../types';

const STORAGE_KEY = 'ouiouipos:role-logins';
const MAX_STORED_LOGINS = 500;

const ensureStorage = (): Storage => {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('Local storage is not available for role login tracking.');
  }
  return window.localStorage;
};

const parseLogins = (raw: string | null): RoleLogin[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const { roleId, roleName, loginAt } = item as Partial<RoleLogin>;
        if (typeof roleId !== 'string' || typeof roleName !== 'string' || typeof loginAt !== 'string') {
          return null;
        }

        const timestamp = Date.parse(loginAt);
        if (Number.isNaN(timestamp)) {
          return null;
        }

        return {
          roleId,
          roleName,
          loginAt: new Date(timestamp).toISOString(),
        } as RoleLogin;
      })
      .filter((login): login is RoleLogin => Boolean(login))
      .sort((a, b) => Date.parse(a.loginAt) - Date.parse(b.loginAt));
  } catch (error) {
    console.warn('Unable to parse stored role logins, clearing history.', error);
    return [];
  }
};

const readLogins = (): RoleLogin[] => {
  const storage = ensureStorage();
  const raw = storage.getItem(STORAGE_KEY);
  return parseLogins(raw);
};

const writeLogins = (logins: RoleLogin[]): void => {
  const storage = ensureStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(logins.slice(-MAX_STORED_LOGINS)));
};

export const logRoleLogin = async (roleId: string, roleName: string, loginAt?: string): Promise<RoleLogin> => {
  const timestamp = loginAt ?? new Date().toISOString();
  const login: RoleLogin = { roleId, roleName, loginAt: timestamp };

  try {
    const existing = readLogins();
    existing.push(login);
    writeLogins(existing);
  } catch (error) {
    console.warn('Unable to persist role login locally.', error);
  }

  return login;
};

export const fetchRoleLoginsSince = async (startIso: string): Promise<RoleLogin[]> => {
  const startTime = Date.parse(startIso);
  if (Number.isNaN(startTime)) {
    throw new Error('Invalid start date provided when fetching role logins.');
  }

  const logins = readLogins();
  return logins.filter(login => Date.parse(login.loginAt) >= startTime);
};

export const clearRoleLoginsBefore = (cutoffIso: string): void => {
  try {
    const cutoff = Date.parse(cutoffIso);
    if (Number.isNaN(cutoff)) {
      return;
    }

    const logins = readLogins().filter(login => Date.parse(login.loginAt) >= cutoff);
    writeLogins(logins);
  } catch (error) {
    console.warn('Unable to prune stored role logins.', error);
  }
};
