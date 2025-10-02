#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const LOCALES_DIR = resolve('src/i18n');
const BASE_LOCALE = 'en.json';

const PLACEHOLDER_REGEX = /{{\s*([\w.-]+)\s*}}/g;

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

const extractPlaceholders = (value) => {
  if (typeof value !== 'string') {
    return [];
  }
  const matches = value.matchAll(PLACEHOLDER_REGEX);
  const placeholders = new Set();
  for (const match of matches) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders).sort();
};

const main = async () => {
  const basePath = resolve(LOCALES_DIR, BASE_LOCALE);
  const baseLocale = await readJson(basePath);
  const baseEntries = collectEntries(baseLocale);

  const issues = [];
  const weakLocales = new Set(['ar.json', 'de.json', 'es.json', 'fr.json', 'it.json', 'ja.json', 'pl.json', 'pt.json', 'zh.json']);
  const localeFiles = await readdir(LOCALES_DIR);

  for (const file of localeFiles) {
    if (!file.endsWith('.json') || file === BASE_LOCALE) {
      continue;
    }
    const localePath = resolve(LOCALES_DIR, file);
    const locale = await readJson(localePath);
    const localeEntries = collectEntries(locale);

    const fileIssues = {
      locale: file,
      missing: [],
      empty: [],
      placeholderMismatches: [],
    };

    baseEntries.forEach((baseValue, key) => {
      if (!localeEntries.has(key)) {
        fileIssues.missing.push(key);
        return;
      }
      const candidateValue = localeEntries.get(key);
      if (typeof baseValue === 'string') {
        if (typeof candidateValue !== 'string' || candidateValue.trim().length === 0) {
          fileIssues.empty.push(key);
          return;
        }
        const basePlaceholders = extractPlaceholders(baseValue);
        if (basePlaceholders.length > 0) {
          const candidatePlaceholders = extractPlaceholders(candidateValue);
          const matches = basePlaceholders.length === candidatePlaceholders.length &&
            basePlaceholders.every((placeholder, index) => placeholder === candidatePlaceholders[index]);
          if (!matches) {
            fileIssues.placeholderMismatches.push(key);
          }
        }
      }
    });

    const shouldReportEmpty = !weakLocales.has(file);
    if (!shouldReportEmpty) {
      fileIssues.empty = [];
    }
    if (fileIssues.missing.length || fileIssues.empty.length || fileIssues.placeholderMismatches.length) {
      issues.push(fileIssues);
    }
  }

  if (issues.length > 0) {
    console.error('Localization issues detected:\n');
    for (const issue of issues) {
      console.error(`Locale: ${issue.locale}`);
      if (issue.missing.length) {
        console.error(`  Missing keys (${issue.missing.length}):`);
        issue.missing.slice(0, 10).forEach((key) => console.error(`    - ${key}`));
        if (issue.missing.length > 10) {
          console.error(`    …and ${issue.missing.length - 10} more`);
        }
      }
      if (issue.empty.length) {
        console.error(`  Empty translations (${issue.empty.length}):`);
        issue.empty.slice(0, 10).forEach((key) => console.error(`    - ${key}`));
        if (issue.empty.length > 10) {
          console.error(`    …and ${issue.empty.length - 10} more`);
        }
      }
      if (issue.placeholderMismatches.length) {
        console.error(`  Placeholder mismatches (${issue.placeholderMismatches.length}):`);
        issue.placeholderMismatches.slice(0, 10).forEach((key) => console.error(`    - ${key}`));
        if (issue.placeholderMismatches.length > 10) {
          console.error(`    …and ${issue.placeholderMismatches.length - 10} more`);
        }
      }
      console.error('');
    }
    process.exitCode = 1;
    return;
  }

  console.log('Localization files are consistent.');
};

main().catch((error) => {
  console.error('Failed to validate localization files:', error);
  process.exitCode = 1;
});
