import React, { createContext, useContext, useState, useEffect } from 'react';

interface A11yContextType {
  highContrast: boolean;
  fontSize: number; // 100%, 110%, 120%
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
}

const A11yContext = createContext<A11yContextType | undefined>(undefined);

export const A11yProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => {
    document.body.style.fontSize = `${fontSize}%`;
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast, fontSize]);

  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 10, 140));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 10, 90));
  const resetFontSize = () => setFontSize(100);

  return (
    <A11yContext.Provider value={{ highContrast, fontSize, toggleHighContrast, increaseFontSize, decreaseFontSize, resetFontSize }}>
      {children}
    </A11yContext.Provider>
  );
};

export const useA11y = () => {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y debe ser usado dentro de A11yProvider');
  }
  return context;
};
