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

/** Reuse connection across warm Vercel invocations (module cache is not enough). */
const globalMongo = globalThis as typeof globalThis & {
  __familyRegMongoPromise?: Promise<MongoClient>;
};

let indexesReady: Promise<void> | null = null;

function normalizeMobile(m: string): string {
  return m.replace(/\D/g, '');
}

function isTopologyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('topology is closed') ||
    msg.includes('topology was destroyed') ||
    msg.includes('client must be connected') ||
    err.name === 'MongoTopologyClosedError'
  );
}

function resetMongoCache(): void {
  globalMongo.__familyRegMongoPromise = undefined;
  indexesReady = null;
}

function mongoClientOptions() {
  return {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 120_000,
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: 45_000,
  };
}

async function connectClient(): Promise<MongoClient> {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is not configured');
  }
  const client = new MongoClient(config.mongodbUri, mongoClientOptions());
  await client.connect();
  return client;
}

async function getMongoClient(): Promise<MongoClient> {
  if (!globalMongo.__familyRegMongoPromise) {
    globalMongo.__familyRegMongoPromise = connectClient();
  }
  try {
    return await globalMongo.__familyRegMongoPromise;
  } catch (err) {
    resetMongoCache();
    globalMongo.__familyRegMongoPromise = connectClient();
    return await globalMongo.__familyRegMongoPromise;
  }
}

async function getDb() {
  const client = await getMongoClient();
  const db = client.db(config.mongodbDb);
  try {
    await db.command({ ping: 1 });
    return db;
  } catch (err) {
    if (!isTopologyError(err)) throw err;
    resetMongoCache();
    const fresh = await getMongoClient();
    const freshDb = fresh.db(config.mongodbDb);
    await freshDb.command({ ping: 1 });
    return freshDb;
  }
}

/** Retry once after reconnect when Vercel reused a closed topology. */
async function withMongo<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTopologyError(err)) throw err;
    resetMongoCache();
    return await fn();
  }
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
  try {
    await indexesReady;
  } catch (err) {
    indexesReady = null;
    if (isTopologyError(err)) {
      return getCollection();
    }
    throw err;
  }
  return col;
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
  return withMongo(async () => {
    const col = await getCollection();
    const docs = await col.find().sort({ rowIndex: 1 }).toArray();
    return docs.map(docToRegistration);
  });
}

export async function findByMobileNorm(mobileNorm: string): Promise<Registration | null> {
  if (!mobileNorm) return null;
  return withMongo(async () => {
    const col = await getCollection();
    const docs = await col.find({ mobileNorm }).sort({ rowIndex: -1 }).limit(1).toArray();
    return docs[0] ? docToRegistration(docs[0]) : null;
  });
}

export async function appendRegistration(
  data: RowData,
): Promise<{ rowIndex: number; registration: Registration }> {
  return withMongo(async () => {
    const col = await getCollection();
    const rowIndex = await nextRowIndex();
    const time = new Date().toISOString();
    const doc = rowDataToDoc(data, rowIndex, time);
    await col.insertOne(doc);
    return { rowIndex, registration: docToRegistration(doc) };
  });
}

export async function updateRegistration(
  rowIndex: number,
  data: RowData & { time?: string },
): Promise<Registration> {
  return withMongo(async () => {
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
  });
}

export async function deleteRow(rowIndex: number): Promise<void> {
  return withMongo(async () => {
    const col = await getCollection();
    const result = await col.deleteOne({ rowIndex });
    if (result.deletedCount === 0) throw new Error('Row not found');
  });
}

export async function repairRow(rowIndex: number): Promise<Registration> {
  return withMongo(async () => {
    const col = await getCollection();
    const doc = await col.findOne({ rowIndex });
    if (!doc) throw new Error('Row not found');
    return docToRegistration(doc);
  });
}

export async function repairAllCorruptRows(): Promise<{ repaired: number; deleted: number }> {
  return { repaired: 0, deleted: 0 };
}

/** Ping MongoDB (for health checks on Vercel). */
export async function pingMongo(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    resetMongoCache();
    return false;
  }
}
