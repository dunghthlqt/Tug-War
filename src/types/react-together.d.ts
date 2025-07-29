declare module '@multisynq/react-together' {
  import { ReactNode } from 'react';

  interface SessionParams {
    apiKey: string;
    appId: string;
    name: string;
    password?: string;
    keyless?: boolean;
    force?: boolean;
  }

  interface ReactTogetherProps {
    children: ReactNode;
    sessionParams: SessionParams;
    sessionIgnoresUrl?: boolean;
    rememberUsers?: boolean;
    userId?: string;
    deriveNickname?: (id: string) => string;
  }

  export function ReactTogether(props: ReactTogetherProps): JSX.Element;
  export function useStateTogether<T>(key: string, initialState: T): [T, (value: T | ((prev: T) => T)) => void];
} 