import { createContext } from 'react';

interface MultisynqContextType {
  session: unknown | null;
  error: string | null;
  isConnected: boolean;
}

export const MultisynqContext = createContext<MultisynqContextType | null>(null); 