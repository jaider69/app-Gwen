import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import { AuthNotice } from '@/src/presentation/widgets/AuthLayout';

// IMPORTACIONES DE IMÁGENES
import AppIcon from '../../assets/images/icon.png';
import SinFondo from '../../assets/images/sinfondo.png';

const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <AppBackground>
      {/* IMAGEN DE FONDO (INTACTA) */}
      <View style={styles.backgroundImageContainer}>
        <Image 
          source={SinFondo} 
          style={styles.backgroundImage} 
          resizeMode="contain"
        />
      </View>

      {/* Contenido principal por encima de la imagen */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 40 : 16),
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Sección Superior: Logo, Ubicación y Títulos */}
        <View style={styles.top}>
          <View style={styles.logoContainer}>
            <Image source={AppIcon} style={styles.logoImage} resizeMode="contain" />
          </View>

          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.eyebrow}>GWEN</Text>
          </View>

          <Text style={styles.title}>La forma fácil de llevar tu tienda.</Text>
          <Text style={styles.description}>
            Gestiona tu espacio de trabajo con una cuenta segura y vinculada a una sola tienda.
          </Text>
        </View>

        {/* Sección de Botones (SUBIDOS MÁS ARRIBA) */}
        <View style={styles.actions}>
          {!isSupabaseConfigured ? (
            <AuthNotice>
              Modo desarrollo: usando almacenamiento local (MockAuthService). Los datos persisten entre recargas.
            </AuthNotice>
          ) : null}

          {/* Botón 1: Iniciar Sesión */}
          <Link href="/auth/login" asChild>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, styles.btnWrapper]}>
              <View style={styles.primaryGlassCard}>
                <View style={styles.btnContent}>
                  <Text style={styles.buttonTextPrimary}>Iniciar sesión</Text>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              </View>
            </Pressable>
          </Link>

          {/* Botón 2: Crear una cuenta */}
          <Link href="/auth/register" asChild>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, styles.btnWrapper]}>
              <View style={styles.secondaryGlassCard}>
                <Text style={styles.buttonTextSecondary}>Crear una cuenta</Text>
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Pie de página con candado */}
        <View style={styles.footnoteContainer}>
          <Feather name="lock" size={13} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 6 }} />
          <Text style={styles.footnote}>
            Tu sesión se guardará localmente después de un inicio de sesión exitoso.
          </Text>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  
  /* ESTILOS DE LA IMAGEN DE FONDO (INTACTA) */
  backgroundImageContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    width: 320,
    height: 320,
    opacity: 0.18,
  },

  /* SECCIÓN SUPERIOR */
  top: {
    alignItems: 'center',
    width: '100%',
    marginTop: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    maxWidth: 320,
  },
  
  /* SECCIÓN DE BOTONES (SUBIDOS MÁS ARRIBA) */
  actions: {
    width: '100%',
    gap: 14,
    marginTop: 'auto',
    marginBottom: 72, // <-- Subido considerablemente más arriba
  },
  btnWrapper: {
    width: '100%',
  },
  primaryGlassCard: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'solid',
  },
  secondaryGlassCard: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderStyle: 'solid',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footnoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    flexShrink: 1,
  },
});