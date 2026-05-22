// ============================================================
// StashTag Type Definitions
// ============================================================

export type UserRole = 'head' | 'editor' | 'viewer';
export type MemberStatus = 'active' | 'pending' | 'removed';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  is_pro: boolean;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  invited_email: string | null;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
}

export interface Box {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  description: string | null;
  location: string | null;
  photo_url: string | null;
  qr_code: string | null;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  household_id: string;
  label: string;
  created_by: string | null;
  created_at: string;
}

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncEntity = 'box' | 'tag';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  entity: SyncEntity;
  payload: Box | Tag | { id: string };
  created_at: string;
  retries: number;
}

export interface CreateBoxInput {
  name: string;
  description?: string;
  location?: string;
  photo_url?: string;
  tags?: string[];
  qr_code?: string;
}

export interface UpdateBoxInput extends Partial<CreateBoxInput> {
  is_archived?: boolean;
}
