// frontend/src/hooks/useInternetIdentity.ts
// Minimal Internet Identity context + hook (no JSX in this file to keep .ts valid)

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AuthClient, type AuthClientLoginOptions } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';

export interface IIContextValue {
  client: AuthClient | null;
  identity: Identity | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;
  principalText: string | null;
  login: (opts?: Partial<AuthClientLoginOptions>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const IIContext = createContext<IIContextValue | undefined>(undefined);

// Resolve provider URL
const resolveIdentityProvider = (): string => {
  const vite = (import.meta as any)?.env;
  if (vite?.VITE_II_URL) return vite.VITE_II_URL as string;
  if (vite?.VITE_IDENTITY_PROVIDER) return vite.VITE_IDENTITY_PROVIDER as string;

  const w = (globalThis as any) as Record<string, any>;
  if (w.II_URL) return String(w.II_URL);
  if (w.IDENTITY_PROVIDER) return String(w.IDENTITY_PROVIDER);

  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return (
      w.LOCAL_II_URL ??
      'http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai'
    );
  }

  return 'https://id.ai'; // new II domain
};

const resolveDerivationOrigin = (): string => {
  const vite = (import.meta as any)?.env;
  const w = (globalThis as any) as Record<string, any>;
  return (
    vite?.VITE_DERIVATION_ORIGIN ||
    w.DERIVATION_ORIGIN ||
    window.location.origin
  );
};

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isInitializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const readSession = useCallback(async (c: AuthClient) => {
    try {
      const authed = await c.isAuthenticated();
      console.log('[II] c.isAuthenticated()', authed);
      if (!mounted.current) return;

      if (authed) {
        const id = c.getIdentity();
        console.log(
          '[II] Got identity:',
          (id as any)?.getPrincipal?.()?.toText?.()
        );
        setIdentity(id);
      } else {
        console.log('[II] Not authenticated');
        setIdentity(null);
      }
    } catch (e: any) {
      if (!mounted.current) return;
      console.error('[II] readSession error', e);
      setError(e?.message ?? String(e));
      setIdentity(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const c = await AuthClient.create();
        if (!mounted.current) return;
        setClient(c);
        await readSession(c);
      } catch (e: any) {
        if (!mounted.current) return;
        setError(e?.message ?? String(e));
      } finally {
        if (mounted.current) setInitializing(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
  }, [readSession]);

  const login = useCallback(
    async (_opts?: Partial<AuthClientLoginOptions>) => {
      setError(null);
      if (!client) {
        setError('AuthClient not ready');
        return;
      }

      const identityProvider = resolveIdentityProvider();
      const derivationOrigin = resolveDerivationOrigin();
      console.log('[II] Using identityProvider:', identityProvider);
      console.log('[II] Using derivationOrigin:', derivationOrigin);

      await new Promise<void>((resolve, reject) => {
        client
          .login({
            identityProvider,
            derivationOrigin,
            maxTimeToLive:
              (BigInt(8) *
                BigInt(60) *
                BigInt(60) *
                BigInt(1_000_000_000)) as unknown as number,
            onSuccess: async () => {
              try {
                await readSession(client);
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onError: (err) => {
              setError(
                typeof err === 'string'
                  ? err
                  : (err as Error)?.message ?? String(err)
              );
              reject(err as unknown as Error);
            },
          })
          .catch(reject);
      });
    },
    [client, readSession]
  );

  const logout = useCallback(async () => {
    setError(null);
    if (!client) return;
    try {
      await client.logout();
    } finally {
      if (mounted.current) {
        setIdentity(null);
      }
    }
  }, [client]);

  const refresh = useCallback(async () => {
    if (!client) return;
    await readSession(client);
  }, [client, readSession]);

  const principalText = useMemo(() => {
    try {
      const p = (identity as any)?.getPrincipal?.();
      return p ? String(p.toText()) : null;
    } catch {
      return null;
    }
  }, [identity]);

  const value: IIContextValue = {
    client,
    identity,
    isAuthenticated: !!identity,
    isInitializing,
    error,
    principalText,
    login,
    logout,
    refresh,
  };

  return React.createElement(IIContext.Provider, { value }, children);
}

export function useInternetIdentity(): IIContextValue {
  const ctx = useContext(IIContext);
  if (!ctx) {
    throw new Error(
      'useInternetIdentity must be used within <InternetIdentityProvider>'
    );
  }
  return ctx;
}

export default useInternetIdentity;