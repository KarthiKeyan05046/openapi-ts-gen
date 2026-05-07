import { input } from '@inquirer/prompts';
import path from 'path';

export interface UserAnswers {
  source: string;
  outputDir: string;
}

export async function askUser(): Promise<UserAnswers> {
  const source = await input({
    message: 'OpenAPI schema source (local file path or URL):',
    validate: (value) => {
      if (!value.trim()) return 'Please provide a file path or URL.';
      return true;
    },
  });

  const outputDir = await input({
    message: 'Output directory:',
    default: './',
    validate: (value) => {
      if (!value.trim()) return 'Please provide an output directory.';
      return true;
    },
    transformer: (value) => path.resolve(value),
  });

  return { source: source.trim(), outputDir: path.resolve(outputDir.trim()) };
}
