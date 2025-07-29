import React, { useState, useEffect, type ReactNode } from 'react';
import { App } from '@multisynq/client';
import { MultisynqContext } from '../contexts/MultisynqContext';

interface MultisynqContextType {
  session: unknown | null;
  error: string | null;
  isConnected: boolean;
}

interface MultisynqProviderProps {
  children: ReactNode;
  apiKey: string;
  appId: string;
  roomId: string;
}

export const MultisynqProvider: React.FC<MultisynqProviderProps> = ({ 
  children, 
  apiKey, 
  appId, 
  roomId 
}) => {
  const [session, setSession] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('=== Initializing Multisynq Session ===');
        console.log('API Key:', apiKey);
        console.log('App ID:', appId);
        console.log('Room ID:', roomId);

        // Register GameModel
        try {
          console.log('GameModel registration not needed - will be handled by Multisynq');
        } catch (error) {
          console.log('GameModel registration error:', error);
        }

        // Create session using App.autoSession
        try {
          console.log('Creating session...');
          const gameSession = await App.autoSession({
            key: apiKey,
            force: true,
            default: roomId,
            keyless: false,
          });

          console.log('Session created successfully:', gameSession);
          setSession(gameSession);
          setIsConnected(true);
          console.log('=== Multisynq initialization completed ===');
        } catch (error) {
          console.error('=== Failed to create session ===');
          console.error('Error details:', error);
          console.error('Error type:', typeof error);
          console.error('Error message:', (error as Error).message);
          setError('Failed to connect to game session. Please try again.');
        }
      } catch (error) {
        console.error('Failed to initialize Multisynq session:', error);
        setError('Failed to initialize game session');
      }
    };

    if (apiKey && appId && roomId) {
      initializeSession();
    }

    return () => {
      if (session && typeof session === 'object' && 'leave' in session) {
        (session as { leave: () => void }).leave();
      }
    };
  }, [apiKey, appId, roomId, session]);

  const contextValue: MultisynqContextType = {
    session,
    error,
    isConnected,
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <MultisynqContext.Provider value={contextValue}>
      {children}
    </MultisynqContext.Provider>
  );
}; 