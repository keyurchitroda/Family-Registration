export type FamilyMember = {
  name: string;
  age?: number;
  relation?: string;
  gender?: string;
  /** Physical dinner token handed to this member */
  tokenGiven?: boolean;
};

export type Registration = {
  rowIndex: number;
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  /** Physical token given to family head / contact person */
  tokenGiven: boolean;
  members: FamilyMember[];
  notes: string;
  time: string;
  isCorrupt?: boolean;
};

export const HEADER = [
  'Full Name',
  'Mobile',
  'Address',
  'Total Family',
  'Present Today',
  'Token Given',
  'Members',
  'Notes',
  'Time',
] as const;

/** Excel column indexes (1-based) */
export const COL = {
  fullName: 1,
  mobile: 2,
  address: 3,
  totalFamily: 4,
  presentToday: 5,
  tokenGiven: 6,
  members: 7,
  notes: 8,
  time: 9,
} as const;
