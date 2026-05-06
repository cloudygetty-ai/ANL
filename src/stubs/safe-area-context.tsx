// Web stub for react-native-safe-area-context
import React from 'react';

export const SafeAreaView: React.FC<{ children?: React.ReactNode; style?: any }> = ({ children, style }) => (
  <div style={style}>{children}</div>
);

export const SafeAreaProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
export const SafeAreaInsetsContext = React.createContext({ top: 0, bottom: 0, left: 0, right: 0 });

export default SafeAreaView;
