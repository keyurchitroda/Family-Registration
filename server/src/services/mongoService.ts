import { MongoClient, type Collection } from 'mongodb';
import { config } from '../config.js';
import type { FamilyMember, Registration } from '../types.js';

type RegistrationDoc = {
  rowIndex: number;
  fullName: string;
  mobile: string;
  mobileNorm: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven: boolean;
  members: FamilyMember[];
  notes: string;
  time: string;
};

export type RowData = {
  fullName: string;
  mobile: string;
  address: string;
  totalFamily: number;
  presentToday: number;
  tokenGiven: boolean;
  members: FamilyMember[];
  notes: string;
};

let client: MongoClient | null = null;
let indexesReady: Promise<void> | null = null;

function normalizeMobile(m: string): string {
  return m.replace(/\D/g, '');
}

function docToRegistration(doc: RegistrationDoc): Registration {
  return {
    rowIndex: doc.rowIndex,
    fullName: doc.fullName,
    mobile: doc.mobile,
    address: doc.address,
    totalFamily: doc.totalFamily,
    presentToday: doc.presentToday,
    tokenGiven: doc.tokenGiven,
    members: doc.members ?? [],
    notes: doc.notes ?? '',
    time: doc.time ?? '',
  };
}

function rowDataToDoc(data: RowData, rowIndex: number, time: string): RegistrationDoc {
  return {
    rowIndex,
    fullName: data.fullName,
    mobile: data.mobile,
    mobileNorm: normalizeMobile(data.mobile),
    address: data.address,
    totalFamily: data.totalFamily,
    presentToday: data.presentToday,
    tokenGiven: data.tokenGiven,
    members: data.members,
    notes: data.notes,
    time,
  };
}

async function getDb() {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is not configured');
  }
  if (!client) {
    client = new MongoClient(config.mongodbUri);
    await client.connect();
  }
  return client.db(config.mongodbDb);
}

async function getCollection(): Promise<Collection<RegistrationDoc>> {
  const col = (await getDb()).collection<RegistrationDoc>('registrations');
  if (!indexesReady) {
    indexesReady = (async () => {
      await col.createIndex({ rowIndex: 1 }, { unique: true });
      await col.createIndex({ mobileNorm: 1 });
      await col.createIndex({ time: -1 });
      await col.createIndex({ fullName: 'text', mobile: 'text', address: 'text' });
    })();
  }
  await indexesReady;
  return col;
}

async function nextRowIndex(): Promise<number> {
  const db = await getDb();
  const counters = db.collection<{ _id: string; seq: number }>('counters');
  const updated = await counters.findOneAndUpdate(
    { _id: 'rowIndex' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  const seq = updated?.seq ?? 1;
  return seq + 1;
}

export async function fetchAllRows(): Promise<Registration[]> {
  const col = await getCollection();
  const docs = await col.find().sort({ rowIndex: 1 }).toArray();
  return docs.map(docToRegistration);
}

export async function findByMobileNorm(mobileNorm: string): Promise<Registration | null> {
  if (!mobileNorm) return null;
  const col = await getCollection();
  const docs = await col.find({ mobileNorm }).sort({ rowIndex: -1 }).limit(1).toArray();
  return docs[0] ? docToRegistration(docs[0]) : null;
}

export async function appendRegistration(
  data: RowData,
): Promise<{ rowIndex: number; registration: Registration }> {
  const col = await getCollection();
  const rowIndex = await nextRowIndex();
  const time = new Date().toISOString();
  const doc = rowDataToDoc(data, rowIndex, time);
  await col.insertOne(doc);
  return { rowIndex, registration: docToRegistration(doc) };
}

export async function updateRegistration(
  rowIndex: number,
  data: RowData & { time?: string },
): Promise<Registration> {
  const col = await getCollection();
  const time = data.time ?? new Date().toISOString();
  const doc = rowDataToDoc(data, rowIndex, time);
  const result = await col.findOneAndUpdate(
    { rowIndex },
    { $set: doc },
    { returnDocument: 'after' },
  );
  if (!result) throw new Error('Row not found');
  return docToRegistration(result);
}

export async function deleteRow(rowIndex: number): Promise<void> {
  const col = await getCollection();
  const result = await col.deleteOne({ rowIndex });
  if (result.deletedCount === 0) throw new Error('Row not found');
}

export async function repairRow(rowIndex: number): Promise<Registration> {
  const col = await getCollection();
  const doc = await col.findOne({ rowIndex });
  if (!doc) throw new Error('Row not found');
  return docToRegistration(doc);
}

export async function repairAllCorruptRows(): Promise<{ repaired: number; deleted: number }> {
  return { repaired: 0, deleted: 0 };
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    indexesReady = null;
  }
}
