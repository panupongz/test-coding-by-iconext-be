import { readdir } from 'node:fs/promises';

const isMissingDirectoryError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const isRunnableTypeScriptFile = (fileName: string): boolean =>
  fileName.endsWith('.ts') && !fileName.endsWith('.d.ts');

export const listDatabaseRunnerFiles = async (directory: string): Promise<readonly string[]> => {
  try {
    const files = await readdir(directory);
    return files.filter((fileName) => fileName.endsWith('.js') || isRunnableTypeScriptFile(fileName));
  } catch (error: unknown) {
    if (isMissingDirectoryError(error)) {
      return [];
    }

    throw error;
  }
};
