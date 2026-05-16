export type FamilyMember = {
  name: string;
  age?: number;
  relation?: string;
  gender?: string;
  tokenGiven?: boolean;
};

export type Registration = {
  rowIndex: number;
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven: boolean;
  members: FamilyMember[];
  notes: string;
  time: string;
  isCorrupt?: boolean;
};

export type DashboardStats = {
  totalRegisteredFamilies: number;
  totalMembers: number;
  totalPresentToday: number;
  registrationsToday: number;
};
