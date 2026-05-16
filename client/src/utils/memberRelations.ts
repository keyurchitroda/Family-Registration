/** Common family relations for Samaj registration */
export const MEMBER_RELATIONS = [
  'Self',
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Uncle',
  'Aunt',
  'Nephew',
  'Niece',
  'Father-in-law',
  'Mother-in-law',
  'Other',
] as const;

export type MemberRelation = (typeof MEMBER_RELATIONS)[number];

export const emptyMember = {
  name: '',
  age: '',
  relation: '',
  gender: '',
} as const;
