
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
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    clearError();
    setSubmitting(true);

    try {
      const success = await signIn(email.trim(), password);

      if (success) {
        router.replace('/dashboard');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="BIENVENIDO DE NUEVO"
      title="Inicia sesión"
      description="Accede a la tienda que tienes vinculada a tu cuenta."
    >
      <View style={styles.form}>
        {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

        <AuthInput
          icon="mail"
          label="Correo"
          value={email}
          placeholder="tucorreo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />

        <View style={styles.passwordGroup}>
          <Text style={styles.label}>Contraseña</Text>

          <View style={styles.passwordContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#5B3EAF"
              style={styles.leftIcon}
            />

            <TextInput
              style={styles.inputPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => {
                if (email.trim() && password && !submitting) {
                  void submit();
                }
              }}
            />

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((visible) => !visible)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
              accessibilityState={{ selected: showPassword }}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#5B3EAF"
              />
            </TouchableOpacity>
          </View>
        </View>

        <AuthButton
          label={submitting ? 'Entrando…' : 'Entrar a mi tienda'}
          onPress={submit}
          disabled={submitting || !email.trim() || !password}
        />

        <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
          ¿Aún no tienes cuenta?{' '}
          <Link
            href="/auth/register"
            style={{ color: colors.primary, fontWeight: '700' }}
          >
            Regístrate
          </Link>
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  passwordGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5B3EAF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  leftIcon: {
    marginRight: 8,
  },
  inputPassword: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#222222',
  },
  eyeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});
