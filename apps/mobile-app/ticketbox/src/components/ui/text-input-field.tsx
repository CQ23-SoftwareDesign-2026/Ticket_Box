import { useState } from 'react';
import { TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';

type TextInputFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

export function TextInputField({ label, hint, error, style, icon, ...props }: TextInputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <AppText variant="eyebrow" tone="muted">
        {label}
      </AppText>
      <View style={[styles.field, isFocused ? styles.fieldFocused : null, error ? styles.fieldError : null]}>
        {icon ? <MaterialCommunityIcons color={isFocused ? colors.primary : colors.textSoft} name={icon} size={18} /> : null}
        <TextInput
          {...props}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={colors.textSoft}
          style={[styles.input, style]}
        />
      </View>
      {error ? <AppText tone="danger">{error}</AppText> : hint ? <AppText tone="muted">{hint}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  field: {
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 5,
  },
  fieldFocused: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  fieldError: {
    backgroundColor: colors.dangerSoft,
  },
  input: {
    flex: 1,
    minHeight: 58,
    color: colors.text,
    fontSize: 15.5,
  },
});
