import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/src/presentation/context/AuthContext';
import { AuthButton, AuthInput, AuthLayout, AuthNotice } from '@/src/presentation/widgets/AuthLayout';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signIn, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    clearError();
    setSubmitting(true);
    const success = await signIn(email.trim(), password);
    setSubmitting(false);
    if (success) router.replace('/dashboard');
  }

  return (
    <AuthLayout eyebrow="BIENVENIDO DE NUEVO" title="Inicia sesión" description="Accede a la tienda que tienes vinculada a tu cuenta.">
      <View style={styles.form}>
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
        <AuthInput icon="mail" label="Correo" value={email} placeholder="tucorreo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} />
        <AuthInput icon="lock" label="Contraseña" value={password} placeholder="Tu contraseña" secureTextEntry autoCapitalize="none" onChangeText={setPassword} />
        <AuthButton label={submitting ? 'Entrando…' : 'Entrar a mi tienda'} onPress={submit} disabled={submitting || !email || !password} />
        <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
          ¿Aún no tienes cuenta? <Link href="/auth/register" style={{ color: colors.primary, fontWeight: '700' }}>Regístrate</Link>
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  switchText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});