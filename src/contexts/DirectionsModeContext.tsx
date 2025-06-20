import React, { createContext, useState, useContext, ReactNode } from 'react';

export type TransitMode = 'driving' | 'walking' | 'cycling' | 'transit';

interface DirectionsModeContextValue {
  mode: TransitMode;
  setMode: (mode: TransitMode) => void;
}

const DirectionsModeContext = createContext<DirectionsModeContextValue>({
  mode: 'driving',
  setMode: () => {}
});

export function DirectionsModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<TransitMode>('driving');
  return (
    <DirectionsModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DirectionsModeContext.Provider>
  );
}

export function useDirectionsMode() {
  return useContext(DirectionsModeContext);
} 