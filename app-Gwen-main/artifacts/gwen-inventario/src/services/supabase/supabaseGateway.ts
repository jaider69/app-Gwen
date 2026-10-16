import { getRuntimeConfig, isSupabaseConfigured } from '@/src/services/config/environment';
import type { RemoteGateway } from '@/src/domain/repositories/contracts';

export class SupabaseGateway implements RemoteGateway {
  isConfigured(): boolean {
    return isSupabaseConfigured(getRuntimeConfig());
  }

  get url(): string | null {
    return getRuntimeConfig().supabaseUrl;
  }
}