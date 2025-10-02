import { openDB, type IDBPDatabase } from 'idb';
import type { TranslationRecord } from './languageService.ts';

interface LocaleCacheEntry {
  lang: string;
  version: number;
  updatedAt: number;
  data: TranslationRecord;
}

interface LocaleCacheSchema {
  locales: LocaleCacheEntry;
}

const DB_NAME = 'locale-cache';
const STORE_NAME = 'locales';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LocaleCacheSchema>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<LocaleCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'lang' });
        }
      },
    });
  }
  return dbPromise;
};

export const readLocaleCache = async (lang: string, version: number): Promise<TranslationRecord | null> => {
  const db = await getDb();
  const entry = await db.get(STORE_NAME, lang) as LocaleCacheEntry | undefined;
  if (!entry || entry.version !== version) {
    return null;
  }
  return entry.data;
};

export const writeLocaleCache = async (lang: string, version: number, data: TranslationRecord) => {
  const db = await getDb();
  const record: LocaleCacheEntry = {
    lang,
    version,
    updatedAt: Date.now(),
    data,
  };
  await db.put(STORE_NAME, record);
};

export const clearLocaleCache = async (lang?: string) => {
  const db = await getDb();
  if (lang) {
    await db.delete(STORE_NAME, lang);
    return;
  }
  await db.clear(STORE_NAME);
};
