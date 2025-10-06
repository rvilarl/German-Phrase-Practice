#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const LOCALES_DIR = resolve('src/i18n');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf-8'));

const clearValues = (obj) => {
  if (typeof obj === 'string') {
    return '';
  }
  if (Array.isArray(obj)) {
    return obj.map(item => clearValues(item));
  }
  if (obj && typeof obj === 'object') {
    const cleared = {};
    for (const [key, value] of Object.entries(obj)) {
      cleared[key] = clearValues(value);
    }
    return cleared;
  }
  return obj;
};

const main = async () => {
  const localesToClear = ['ar.json', 'fr.json', 'it.json', 'ja.json', 'pl.json', 'pt.json', 'zh.json'];

  for (const file of localesToClear) {
    const localePath = resolve(LOCALES_DIR, file);
    const locale = await readJson(localePath);

    const clearedLocale = clearValues(locale);

    await writeFile(localePath, JSON.stringify(clearedLocale, null, 2) + '\n');
    console.log(`Cleared values in ${file}`);
  }

  console.log('Values cleared in specified locales.');
};

main().catch((error) => {
  console.error('Failed to clear values:', error);
  process.exitCode = 1;
});