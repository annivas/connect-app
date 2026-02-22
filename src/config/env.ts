import Constants from 'expo-constants';

interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string;
  useMocks: boolean;
}

const extra = Constants.expoConfig?.extra ?? {};

export const config: AppConfig = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
  sentryDsn: extra.sentryDsn ?? '',
  useMocks: extra.useMocks ?? true,
};
