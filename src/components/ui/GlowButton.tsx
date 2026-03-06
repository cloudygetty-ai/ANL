// src/components/ui/GlowButton.tsx
import React, { useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';

interface Props {
  label:     string;
  onPress:   () => void;
  color?:    string;
  size?:     'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?:     string;
  variant?:  'solid' | 'outline' | 'ghost';
}

const GlowButton: React.FC<Props> = ({
  label, onPress, color = '#a855f7',
  size = 'md', disabled = false, icon, variant = 'solid',
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  const heights = { sm: 40, md: 52, lg: 62 };
  const fontSizes = { sm: 12, md: 14, lg: 16 };
  const radii    = { sm: 12, md: 16, lg: 18 };

  const bg = variant === 'solid'   ? color
           : variant === 'outline' ? 'transparent'
           : 'rgba(255,255,255,0.04)';

  const borderColor = variant === 'ghost' ? 'transparent' : color;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.4 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[
          styles.btn,
          {
            height:       heights[size],
            borderRadius: radii[size],
            backgroundColor: bg,
            borderWidth:  variant === 'solid' ? 0 : 1.5,
            borderColor,
            shadowColor:  color,
            shadowOpacity: variant === 'solid' ? 0.5 : 0.25,
            shadowRadius: variant === 'solid' ? 16 : 8,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        {icon && <Text style={{ fontSize: fontSizes[size] + 4, marginRight: 8 }}>{icon}</Text>}
        <Text style={[
          styles.label,
          {
            fontSize: fontSizes[size],
            color: variant === 'solid' ? '#fff' : color,
          },
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, elevation: 6 },
  label: { fontWeight: '800', letterSpacing: 0.5 },
});

export default GlowButton;
