import { useAuth } from '@/src/presentation/context/AuthContext';
import GwenScreen from '@/src/presentation/screens/GwenScreen';

export default function GwenRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return null;
  }

  return <GwenScreen />;
}