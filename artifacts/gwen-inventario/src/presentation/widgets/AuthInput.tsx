import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

type AuthInputProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
};

export function AuthInput({
  icon,
  label,
  value,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  onChangeText,
}: AuthInputProps) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={icon} size={18} color={colors.mutedForeground} />
        <TextInput
          accessibilityLabel={label}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          style={[styles.input, { color: colors.foreground }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700' },
  inputShell: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  input: { flex: 1, fontSize: 16, minHeight: 52 },
});