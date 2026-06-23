import { Pressable, type PressableProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';

type InlineLinkProps = PressableProps & {
  label: string;
};

export function InlineLink({ label, ...props }: InlineLinkProps) {
  return (
    <Pressable {...props}>
      <AppText variant="label" tone="primary">
        {label}
      </AppText>
    </Pressable>
  );
}
