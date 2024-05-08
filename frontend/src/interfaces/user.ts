import { Contractor } from './contractor';

export interface User {
  name: string;
  username: string;
  orgId?: number;
  orgName?: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export interface EditUserModalProps {
  user: Contractor;
  onClose: () => void;
  onSave: () => void;
  show: boolean;
}

export interface NewUserModalProps {
  onClose: () => void;
  onSave: () => void;
  show: boolean;
  isAdmin: boolean;
  triggerElement: HTMLElement | null;
}

export interface SelectedItem {
  label: string;
  data: { id: number; name: string };
}
