import { Redirect } from 'expo-router';

import { useAuth } from '@/src/presentation/context/AuthContext';
import SplashScreen from '@/src/presentation/screens/SplashScreen';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return <Redirect href={session ? '/dashboard' : '/auth/welcome'} />;
}