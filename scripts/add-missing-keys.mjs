#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const LOCALES_DIR = resolve('src/i18n');
const BASE_LOCALE = 'en.json';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf-8'));

const collectEntries = (source, prefix = '') => {
  const entries = new Map();
  Object.entries(source).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectEntries(value, nextKey).forEach((nestedValue, nestedKey) => {
        entries.set(nestedKey, nestedValue);
      });
    } else {
      entries.set(nextKey, value);
    }
  });
  return entries;
};

const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
};

const main = async () => {
  const basePath = resolve(LOCALES_DIR, BASE_LOCALE);
  const baseLocale = await readJson(basePath);
  const baseEntries = collectEntries(baseLocale);

  const problematicLocales = ['ar.json', 'fr.json', 'it.json', 'ja.json', 'pl.json', 'pt.json', 'zh.json'];

  for (const file of problematicLocales) {
    const localePath = resolve(LOCALES_DIR, file);
    const locale = await readJson(localePath);
    const localeEntries = collectEntries(locale);

    let updated = false;
    baseEntries.forEach((baseValue, key) => {
      if (!localeEntries.has(key)) {
        setNestedValue(locale, key, baseValue);
        updated = true;
      }
    });

    if (updated) {
      await writeFile(localePath, JSON.stringify(locale, null, 2) + '\n');
      console.log(`Updated ${file}`);
    }
  }

  console.log('Missing keys added to problematic locales.');
};

main().catch((error) => {
  console.error('Failed to add missing keys:', error);
  process.exitCode = 1;
});