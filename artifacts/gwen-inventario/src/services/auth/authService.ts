import { LocalJsonStore } from '@/src/data/local/localJsonStore';

export interface AuthSession {
  userId: string;
  storeId: string | null;
  email: string | null;
  displayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  storeName: string;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }>;
  clearSession(): Promise<void>;
}

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; store_name?: string };
  };
  session?: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    user?: SupabaseAuthResponse['user'];
  } | null;
  msg?: string;
  message?: string;
  error_description?: string;
};

type OwnProfile = {
  id: string;
  store_id: string;
  full_name: string | null;
};

const SESSION_KEY = 'auth-session';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no está configurado. Agrega las variables de entorno para continuar.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export class SupabaseAuthService implements AuthService {
  constructor(
    private readonly url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, ''),
    private readonly anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    private readonly storage = new LocalJsonStore(),
  ) {}

  private ensureConfigured(): { url: string; anonKey: string } {
    if (!this.url || !this.anonKey) {
      throw new SupabaseNotConfiguredError();
    }
    return { url: this.url, anonKey: this.anonKey };
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    accessToken?: string,
  ): Promise<T> {
    const { url, anonKey } = this.ensureConfigured();
    const response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => null)) as T & SupabaseAuthResponse | null;
    if (!response.ok) {
      const message =
        payload?.message ?? payload?.msg ?? payload?.error_description ?? 'No fue posible completar la solicitud.';
      throw new Error(message);
    }
    return payload as T;
  }

  private async profileForSession(session: AuthSession): Promise<AuthSession> {
    const profiles = await this.request<OwnProfile[]>(
      `/rest/v1/profiles?select=id,store_id,full_name&id=eq.${encodeURIComponent(session.userId)}&limit=1`,
      { method: 'GET' },
      session.accessToken,
    );
    const profile = profiles[0];
    return {
      ...session,
      storeId: profile?.store_id ?? null,
      displayName: profile?.full_name ?? session.displayName,
    };
  }

  private sessionFromResponse(payload: SupabaseAuthResponse): AuthSession {
    const session = payload.session ?? payload;
    const user = session.user ?? payload.user;
    if (!session.access_token || !user?.id) {
      throw new Error('Supabase no devolvió una sesión válida.');
    }
    return {
      userId: user.id,
      storeId: null,
      email: user.email ?? null,
      displayName: user.user_metadata?.full_name ?? null,
      accessToken: session.access_token,
      refreshToken: session.refresh_token ?? null,
      expiresAt: session.expires_at
        ? session.expires_at * 1000
        : session.expires_in
          ? Date.now() + session.expires_in * 1000
          : null,
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const session = await this.storage.get<AuthSession>(SESSION_KEY);
    if (!session) return null;
    if (session.expiresAt && session.expiresAt <= Date.now()) {
      await this.clearSession();
      return null;
    }
    return session;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const payload = await this.request<SupabaseAuthResponse>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const session = await this.profileForSession(this.sessionFromResponse(payload));
    await this.storage.set(SESSION_KEY, session);
    return session;
  }

  async signUp(
    input: SignUpInput,
  ): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
    const payload = await this.request<SupabaseAuthResponse>('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        data: { full_name: input.displayName, store_name: input.storeName },
      }),
    });
    if (!payload.session && !payload.access_token) {
      return { session: null, needsEmailConfirmation: true };
    }
    const session = await this.profileForSession(this.sessionFromResponse(payload));
    await this.storage.set(SESSION_KEY, session);
    return { session, needsEmailConfirmation: false };
  }

  async clearSession(): Promise<void> {
    const session = await this.storage.get<AuthSession>(SESSION_KEY);
    await this.storage.remove(SESSION_KEY);
    if (session?.accessToken && this.url && this.anonKey) {
      await fetch(`${this.url.replace(/\/$/, '')}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${session.accessToken}`,
        },
      }).catch(() => undefined);
    }
  }
}

/**
 * Safe fallback used before Supabase is configured manually.
 * It never creates a local account or accepts fake credentials.
 */
export class UnconfiguredAuthService implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    return null;
  }

  async signIn(): Promise<AuthSession> {
    throw new SupabaseNotConfiguredError();
  }

  async signUp(): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
    throw new SupabaseNotConfiguredError();
  }

  async clearSession(): Promise<void> {
    // No local account is created when Supabase is not configured.
  }
}