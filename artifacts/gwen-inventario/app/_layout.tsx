import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/src/presentation/context/AuthContext';
import { ProductProvider } from '@/src/presentation/context/ProductContext';
import { loadSeedIfNeeded } from '@/src/data/seed/seedLoader';
import { applyInterFontGlobally } from '@/src/utils/applyInterFont';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

applyInterFontGlobally();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="gwen" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="foundation" options={{ headerShown: false }} />
      <Stack.Screen name="products/index" options={{ headerShown: false }} />
      <Stack.Screen name="products/new" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="entries/new" options={{ headerShown: false }} />
      <Stack.Screen name="sales/new" options={{ headerShown: false }} />
      <Stack.Screen name="movements/index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [seedReady, setSeedReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadSeedIfNeeded()
      .catch((error: unknown) => {
        // No bloqueamos el arranque de la app por un fallo del seed de desarrollo.
        console.warn('No se pudo cargar el seed de desarrollo:', error);
      })
      .finally(() => {
        if (!cancelled) setSeedReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && seedReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, seedReady]);

  if ((!fontsLoaded && !fontError) || !seedReady) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProductProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </ProductProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}