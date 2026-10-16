import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  
  // Estado para controlar si se muestra o se oculta la contraseña
  const [showPassword, setShowPassword] = useState(false);

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
        
        {/* Campo de Correo (mantiene tu componente AuthInput original) */}
        <AuthInput 
          icon="mail" 
          label="Correo" 
          value={email} 
          placeholder="tucorreo@ejemplo.com" 
          autoCapitalize="none" 
          keyboardType="email-address" 
          onChangeText={setEmail} 
        />

        {/* Contenedor del campo de Contraseña con íconos y texto en negro */}
        <View style={styles.passwordGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#000000" style={styles.leftIcon} />
            <TextInput
              style={styles.inputPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword} // Oculta o muestra el texto
              autoCapitalize="none"
            />
            {/* Botón del ojito en color negro y touch target de 44px */}
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
  passwordGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#000000' }, // Texto 'Contraseña' en negro
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
    width: 44, // Touch target mínimo de 44px
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
});