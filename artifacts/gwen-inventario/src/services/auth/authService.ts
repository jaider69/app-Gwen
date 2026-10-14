import { supabase } from '@/src/data/supabase/supabaseClient';

export interface AuthSession {
  userId: string;
  storeId: string | null;
  storeName: string | null;
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

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase no está configurado. Agrega las variables de entorno para continuar.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

function createId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function traducirError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Credenciales inválidas. Verifica tu correo y contraseña.';
  if (message.includes('User already registered')) return 'Ya existe una cuenta con este correo.';
  if (message.toLowerCase().includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  return message;
}

type PerfilUsuario = {
  id_usuario: string;
  id_tienda: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  activo: boolean;
};

type TiendaRow = {
  id_tienda: string;
  nombre: string;
};

type SupaSession = {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user: { id: string; email?: string };
};


async function buildSessionFromSupabase(
  supaSession: SupaSession
): Promise<AuthSession> {
  const { data: perfil, error: perfilError } = await supabase
    .from('usuarios')
    .select(
      'id_usuario, id_tienda, nombre_completo, correo, rol, activo'
    )
    .eq('auth_user_id', supaSession.user.id)
    .maybeSingle<PerfilUsuario>();

  if (perfilError) {
    throw new Error(`Error al consultar el perfil: ${perfilError.message}`);
  }

  if (!perfil) {
    throw new Error(
      'Tu cuenta de acceso existe, pero no tiene un perfil de Gwen vinculado. Contacta al administrador.'
    );
  }

  if (!perfil.activo) {
    throw new Error('Tu usuario está inactivo. Contacta al administrador.');
  }

  const { data: tienda, error: tiendaError } = await supabase
    .from('tiendas')
    .select('id_tienda, nombre')
    .eq('id_tienda', perfil.id_tienda)
    .maybeSingle<TiendaRow>();

  if (tiendaError) {
    throw new Error(`Error al consultar la tienda: ${tiendaError.message}`);
  }

  if (!tienda) {
    throw new Error('No se encontró la tienda asociada a tu usuario.');
  }

  return {
    // ID interno de Gwen, por ejemplo U001.
    // El UUID de Supabase se conserva en auth_user_id.
    userId: perfil.id_usuario,
    storeId: perfil.id_tienda,
    storeName: tienda.nombre,
    email: perfil.correo || supaSession.user.email || null,
    displayName: perfil.nombre_completo,
    accessToken: supaSession.access_token,
    refreshToken: supaSession.refresh_token ?? null,
    expiresAt: supaSession.expires_at
      ? supaSession.expires_at * 1000
      : null,
  };
}


export class SupabaseAuthService implements AuthService {
  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return buildSessionFromSupabase(data.session as SupaSession);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traducirError(error.message));
    if (!data.session) throw new Error('No fue posible iniciar sesión.');
    return buildSessionFromSupabase(data.session as SupaSession);
  }

  async signUp(input: SignUpInput): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });
    if (error) throw new Error(traducirError(error.message));

    const user = data.user;
    if (!user) throw new Error('No fue posible crear la cuenta.');

    const idTienda = createId();
    const { error: tiendaError } = await supabase.from('tiendas').insert({
      id_tienda: idTienda,
      nombre: input.storeName,
      activa: true,
    });
    if (tiendaError) throw new Error(`Tienda: ${tiendaError.message}`);

    const { error: usuarioError } = await supabase.from('usuarios').insert({
      id_usuario: user.id,
      id_tienda: idTienda,
      nombre_completo: input.displayName,
      correo: input.email,
      rol: 'propietario',
      activo: true,
    });
    if (usuarioError) throw new Error(`Usuario: ${usuarioError.message}`);

    if (!data.session) {
      return { session: null, needsEmailConfirmation: true };
    }
    const session = await buildSessionFromSupabase(data.session as SupaSession);
    return { session, needsEmailConfirmation: false };
  }

  async clearSession(): Promise<void> {
    await supabase.auth.signOut();
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

/**
 * Mock Auth Service para desarrollo sin base de datos real.
 * Simula autenticación con usuarios en memoria/AsyncStorage.
 * Se mantiene como respaldo si en algún momento se desactiva Supabase.
 */
import { LocalJsonStore } from '@/src/data/local/localJsonStore';

export class MockAuthService implements AuthService {
  private readonly storage = new LocalJsonStore();
  private readonly SESSION_KEY = 'mock-auth-session';
  private readonly USERS_KEY = 'mock-auth-users';

  private async getUsers(): Promise<Record<string, { password: string; displayName: string; storeName: string }>> {
    const users = await this.storage.get<Record<string, { password: string; displayName: string; storeName: string }>>(this.USERS_KEY);
    return users ?? {};
  }

  private async setUsers(users: Record<string, { password: string; displayName: string; storeName: string }>): Promise<void> {
    await this.storage.set(this.USERS_KEY, users);
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateStoreId(): string {
    return `store_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAccessToken(): string {
    return `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private buildSession(userId: string, email: string, displayName: string, storeName: string, storeId: string): AuthSession {
    return {
      userId,
      storeId,
      storeName,
      email,
      displayName,
      accessToken: this.generateAccessToken(),
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const session = await this.storage.get<AuthSession>(this.SESSION_KEY);
    if (!session) return null;
    if (session.expiresAt && session.expiresAt <= Date.now()) {
      await this.clearSession();
      return null;
    }
    return session;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const users = await this.getUsers();
    const user = users[email.toLowerCase()];

    if (!user || user.password !== password) {
      throw new Error('Credenciales inválidas. Verifica tu email y contraseña.');
    }

    const session = this.buildSession(
      `user_${email}`,
      email,
      user.displayName,
      user.storeName,
      `store_${email}`
    );

    await this.storage.set(this.SESSION_KEY, session);
    return session;
  }

  
  async signUp(
    input: SignUpInput
  ): Promise<{ session: AuthSession | null; needsEmailConfirmation: boolean }> {
    // Gwen ya tiene perfiles y tiendas existentes.
    // No crear cuentas nuevas desde este flujo hasta implementar
    // una asociación segura entre Auth, usuarios y tiendas.
    void input;

    throw new Error(
      'El registro de nuevas cuentas está temporalmente deshabilitado. ' +
      'Si ya tienes una cuenta, inicia sesión.'
    );
  }


  async clearSession(): Promise<void> {
    await this.storage.remove(this.SESSION_KEY);
  }

  async createMockUser(email: string, password: string, displayName: string, storeName: string): Promise<void> {
    const users = await this.getUsers();
    users[email.toLowerCase()] = { password, displayName, storeName };
    await this.setUsers(users);
  }

  async listMockUsers(): Promise<string[]> {
    const users = await this.getUsers();
    return Object.keys(users);
  }

  async resetMockData(): Promise<void> {
    await this.storage.remove(this.USERS_KEY);
    await this.storage.remove(this.SESSION_KEY);
  }
}