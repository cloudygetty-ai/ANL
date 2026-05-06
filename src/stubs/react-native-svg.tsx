// Web stub for react-native-svg
import React from 'react';

interface SvgXmlProps {
  xml: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties | any;
}

export const SvgXml: React.FC<SvgXmlProps> = ({ xml, width, height, style }) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...(style as object[])) : style ?? {};
  return (
    <div
      style={{ width, height, ...flatStyle }}
      dangerouslySetInnerHTML={{ __html: xml }}
    />
  );
};

export const Svg = ({ children, ...props }: any) => <svg {...props}>{children}</svg>;
export const Path = (props: any) => <path {...props} />;
export const Circle = (props: any) => <circle {...props} />;
export const Rect = (props: any) => <rect {...props} />;
export const G = (props: any) => <g {...props} />;
export const Text = (props: any) => <text {...props} />;
export const Defs = (props: any) => <defs {...props} />;
export const LinearGradient = (props: any) => <linearGradient {...props} />;
export const Stop = (props: any) => <stop {...props} />;

export default Svg;
