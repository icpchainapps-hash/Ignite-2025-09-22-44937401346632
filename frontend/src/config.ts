// frontend/src/config.ts

/** -------- Public constants (tweak as needed) -------- */
export const DEFAULT_STORAGE_GATEWAY_URL = 'https://dev-blob.caffeine.ai';
export const DEFAULT_BUCKET_NAME = 'default-bucket';
export const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000000';

import {
  createActor as createBackendActor,
  canisterId as DECLARATIONS_BACKEND_ID,
  type backendInterface,
} from './backend';

/**
 * Backend canister id. Resolved from:
 *  1) Vite env (VITE_CANISTER_ID_BACKEND)
 *  2) global/window (CANISTER_ID_BACKEND)
 *  3) generated declarations (./backend → declarations/backend)
 *  4) empty string (caller should handle / we throw below)
 */
function resolveBackendCanisterId(): string {
  const fromVite =
    (import.meta as any)?.env?.VITE_CANISTER_ID_BACKEND ??
    (import.meta as any)?.env?.VITE_CANISTER_ID_backend; // tolerate different casings

  const fromGlobal = (globalThis as any)?.CANISTER_ID_BACKEND;

  const id =
    fromVite ??
    fromGlobal ??
    DECLARATIONS_BACKEND_ID ??
    '';

  return typeof id === 'string' ? id : String(id ?? '');
}

export const CANISTER_ID_BACKEND: string = resolveBackendCanisterId();

/** Shape some modules expect when reading config */
export type FrontendConfig = {
  STORAGE_GATEWAY_URL: string;
  BUCKET_NAME: string;
  PROJECT_ID: string;
  CANISTER_ID_BACKEND: string;
};

/**
 * Small helper used by blob storage and other modules.
 * Centralizes how the app-level config is loaded.
 */
export function loadConfig(): FrontendConfig {
  return {
    STORAGE_GATEWAY_URL: DEFAULT_STORAGE_GATEWAY_URL,
    BUCKET_NAME: DEFAULT_BUCKET_NAME,
    PROJECT_ID: DEFAULT_PROJECT_ID,
    CANISTER_ID_BACKEND,
  };
}

/** -------- Actor factory expected by hooks/useActor.ts -------- */

export type CreateActorOptions = {
  agentOptions?: {
    host?: string;
    fetchRootKey?: boolean;
    identity?: unknown;
  };
};

/**
 * Creates a typed backend actor using the configured canister id.
 * This is what hooks/useActor.ts imports and calls.
 */
export function createActorWithConfig(
  options?: CreateActorOptions
): backendInterface {
  if (!CANISTER_ID_BACKEND) {
    throw new Error(
      'Missing backend canister id. Set VITE_CANISTER_ID_BACKEND, or rely on declarations-generated canisterId.'
    );
  }
  return createBackendActor(CANISTER_ID_BACKEND, options);
}