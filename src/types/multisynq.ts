import { Session } from '@multisynq/client';

export type MultisynqSession = InstanceType<typeof Session>;
 
export interface MultisynqContextType {
  session: MultisynqSession | null;
} 