import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  // Estado para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false);

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
        
        {/* Campo de Contraseña personalizado con ojito e íconos en negro */}
        <View style={styles.passwordGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#000000" style={styles.leftIcon} />
            <TextInput
              style={styles.inputPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeButton} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                size={22} 
                color="#000000" 
              />
            </TouchableOpacity>
          </View>
        </View>

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
  passwordGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#000000' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  leftIcon: { marginRight: 8 },
  inputPassword: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#222222',
  },
  eyeButton: {
    width: 44, // Garantiza el área táctil mínima recomendada de 44px
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 2 },
});