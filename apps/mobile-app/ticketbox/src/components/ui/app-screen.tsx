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
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />
        <View style={styles.panelGlow} />
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
  glowPrimary: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: colors.primaryGlow,
    opacity: 0.65,
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 140,
    left: -120,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: colors.infoSoft,
    opacity: 0.28,
  },
  panelGlow: {
    position: 'absolute',
    top: 180,
    left: 24,
    right: 24,
    height: 200,
    borderRadius: 40,
    backgroundColor: colors.surfaceOverlay,
    opacity: 0.28,
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
