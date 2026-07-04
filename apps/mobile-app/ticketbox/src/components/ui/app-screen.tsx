import { type PropsWithChildren } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

type AppScreenProps = PropsWithChildren<{
  contentBottomPadding?: number;
  scroll?: boolean;
}>;

export function AppScreen({ children, contentBottomPadding = spacing.xxl + 92, scroll = true }: AppScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: contentBottomPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { paddingBottom: contentBottomPadding }]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.atmosphere}>
        <View style={styles.topWash} />
        <View style={styles.bottomWash} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#12335e',
    opacity: 0.42,
  },
  bottomWash: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: '#0a1629',
    opacity: 0.88,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  staticContent: {
    flex: 1,
    padding: spacing.xl,
  },
});
