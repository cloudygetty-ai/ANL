// src/components/ui/GlowButton.tsx
import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '@config/constants';

// === Types ===

type Variant = 'solid' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  color?: string;
  disabled?: boolean;
}

// === Size maps ===

const PADDING_H: Record<Size, number> = { sm: 14, md: 22, lg: 30 };
const PADDING_V: Record<Size, number> = { sm: 8, md: 13, lg: 18 };
const FONT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 17 };
const BORDER_RADIUS: Record<Size, number> = { sm: 10, md: 14, lg: 18 };

// === Component ===

const GlowButton: React.FC<GlowButtonProps> = ({
  title,
  onPress,
  variant = 'solid',
  size = 'md',
  color = COLORS.accent,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      paddingHorizontal: PADDING_H[size],
      paddingVertical: PADDING_V[size],
      borderRadius: BORDER_RADIUS[size],
      opacity: disabled ? 0.45 : 1,
    },
    variantContainerStyle(variant, color),
  ];

  const textColor = variant === 'solid' ? '#0a0a0f' : color;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[containerStyle, { transform: [{ scale: scaleAnim }] }]}>
        <Text
          style={[
            styles.label,
            { fontSize: FONT_SIZE[size], color: textColor },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// === Style helpers ===

function variantContainerStyle(variant: Variant, color: string): ViewStyle {
  switch (variant) {
    case 'solid':
      return {
        backgroundColor: color,
        // Glow shadow — appears beneath the button as a colored bloom
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 8,
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: color,
      };
    case 'ghost':
      return {
        backgroundColor: color + '18',
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default GlowButton;
