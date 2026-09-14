import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve('node_modules/vinext/dist/server/static-file-cache.js');
const source = await readFile(file, 'utf8');

if (!source.includes('nativeRelativePath')) {
  const before = 'for await (const { relativePath, fullPath, stat } of walkFilesWithStats(clientDir)) allFiles.set(relativePath, {\n\t\t\tfullPath,\n\t\t\tsize: stat.size,\n\t\t\tmtimeMs: stat.mtimeMs\n\t\t});';
  const after = 'for await (const { relativePath: nativeRelativePath, fullPath, stat } of walkFilesWithStats(clientDir)) {\n\t\t\tconst relativePath = nativeRelativePath.split(path.sep).join("/");\n\t\t\tallFiles.set(relativePath, {\n\t\t\t\tfullPath,\n\t\t\t\tsize: stat.size,\n\t\t\t\tmtimeMs: stat.mtimeMs\n\t\t\t});\n\t\t}';
  if (!source.includes(before)) throw new Error('Unsupported vinext static cache version');
  await writeFile(file, source.replace(before, after));
  console.log('Applied vinext Windows static-asset compatibility fix.');
}
