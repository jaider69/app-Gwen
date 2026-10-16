import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/src/presentation/context/AuthContext';
import { AuthButton, AuthInput, AuthLayout, AuthNotice } from '@/src/presentation/widgets/AuthLayout';

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signUp, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(false);

  async function submit() {
    clearError();
    setConfirmationMessage(false);
    setSubmitting(true);
    const result = await signUp({ displayName: displayName.trim(), storeName: storeName.trim(), email: email.trim(), password });
    setSubmitting(false);
    if (result === 'signed-in') router.replace('/dashboard');
    if (result === 'confirm-email') setConfirmationMessage(true);
  }

  return (
    <AuthLayout eyebrow="PRIMER PASO" title="Crea tu cuenta" description="Tu cuenta quedará asociada a una única tienda para proteger tus datos.">
      <View style={styles.form}>
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
        {confirmationMessage ? <AuthNotice>Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión desde aquí.</AuthNotice> : null}
        <AuthInput icon="user" label="Tu nombre" value={displayName} placeholder="Ej. María Rodríguez" onChangeText={setDisplayName} />
        <AuthInput icon="shopping-bag" label="Nombre de la tienda" value={storeName} placeholder="Ej. Tienda San Miguel" onChangeText={setStoreName} />
        <AuthInput icon="mail" label="Correo" value={email} placeholder="tucorreo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} />
        <AuthInput icon="lock" label="Contraseña" value={password} placeholder="Mínimo 6 caracteres" secureTextEntry autoCapitalize="none" onChangeText={setPassword} />
        <AuthButton label={submitting ? 'Creando cuenta…' : 'Crear mi cuenta'} onPress={submit} disabled={submitting || !displayName || !storeName || !email || password.length < 6} />
        <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
          ¿Ya tienes cuenta? <Link href="/auth/login" style={{ color: colors.primary, fontWeight: '700' }}>Inicia sesión</Link>
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  switchText: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 2 },
});