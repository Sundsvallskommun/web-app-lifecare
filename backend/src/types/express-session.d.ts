import { User } from '@/interfaces/users.interface';
import { Session } from 'express-session';

interface Engagement {
  organizationName: string;
  organizationNumber: string;
  organizationId: string;
}

declare module 'express-session' {
  interface Session {
    returnTo?: string;
    user?: User;
    representing?: Engagement;
    passport?: any;
    representingChoices?: Engagement[];
  }
}
