// Web stub for react-native-linear-gradient
import React from 'react';

interface Props {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: React.CSSProperties | any;
  children?: React.ReactNode;
}

const LinearGradient: React.FC<Props> = ({ colors, start, end, style, children }) => {
  const x1 = `${(start?.x ?? 0) * 100}%`;
  const y1 = `${(start?.y ?? 0) * 100}%`;
  const x2 = `${(end?.x ?? 0) * 100}%`;
  const y2 = `${(end?.y ?? 1) * 100}%`;
  const gradient = `linear-gradient(to bottom, ${colors.join(', ')})`;

  const flatStyle = Array.isArray(style)
    ? Object.assign({}, ...(style as object[]))
    : style ?? {};

  return (
    <div style={{ ...flatStyle, background: gradient }}>
      {children}
    </div>
  );
};

export default LinearGradient;
