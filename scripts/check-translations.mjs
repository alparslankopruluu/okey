import { readFile } from 'node:fs/promises';

const files = ['src/translations/en.json', 'src/translations/tr.json'];
const entries = await Promise.all(files.map(async (file) => [file, JSON.parse(await readFile(file, 'utf8'))]));
const [schemaFile, schema] = entries[0];
const schemaKeys = Object.keys(schema).sort();

for (const [file, values] of entries.slice(1)) {
  const keys = Object.keys(values).sort();
  const missing = schemaKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !schemaKeys.includes(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${file} differs from ${schemaFile}; missing=${missing.join(',')} extra=${extra.join(',')}`);
  }
}

process.stdout.write(`Translation parity OK: ${schemaKeys.length} keys across ${entries.length} locales\n`);
