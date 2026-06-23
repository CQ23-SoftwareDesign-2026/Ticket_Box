import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthShell } from '@/components/ui/auth-shell';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/app-text';
import { TextInputField } from '@/components/ui/text-input-field';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getErrorMessage } from '@/lib/errors';

export function LoginScreen() {
  const router = useRouter();
  const { login, isSubmitting } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);

    try {
      const nextRoute = await login(email.trim(), password);
      router.replace(nextRoute);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  return (
    <AuthShell
      eyebrow="Staff portal"
      title="TicketBox Staff"
      description="Đăng nhập bằng tài khoản Checker hoặc Admin đã được cấp để vận hành cổng vào, quét vé và đồng bộ phiên check-in."
    >
      <View style={styles.form}>
        <TextInputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          icon="badge-account-horizontal-outline"
          placeholder="staff@ticketbox.vn"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          icon="lock-outline"
          placeholder="Enter your password"
          secureTextEntry
          autoComplete="password"
        />
        {error ? <AppText tone="danger">{error}</AppText> : null}
        <Button icon="arrow-right" label="Sign in to staff portal" onPress={onSubmit} loading={isSubmitting} />
        <View style={styles.supportBlock}>
          <AppText variant="eyebrow" tone="muted">
            Support
          </AppText>
          <AppText tone="muted">
            Need access help? Contact the TicketBox administrator who issued your staff account.
          </AppText>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  supportBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
