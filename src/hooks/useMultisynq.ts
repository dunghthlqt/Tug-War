import { useContext } from 'react';
import { MultisynqContext } from '../contexts/MultisynqContext';

interface MultisynqContextType {
  session: unknown | null;
  error: string | null;
  isConnected: boolean;
}

export const useMultisynq = (): MultisynqContextType => {
  const context = useContext(MultisynqContext);
  if (!context) {
    throw new Error('useMultisynq must be used within a MultisynqProvider');
  }
  return context;
}; 