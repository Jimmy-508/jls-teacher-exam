declare const process: { cwd(): string };
declare function require(moduleName: string): {
  readFileSync?: (filePath: string, encoding: string) => string;
  join?: (...parts: string[]) => string;
};

import { describe, expect, it } from 'vitest';

const fs = require('fs') as { readFileSync(filePath: string, encoding: string): string };
const path = require('path') as { join(...parts: string[]): string };
const projectRoot = process.cwd();

describe('Windows icon updater launcher', () => {
  it('uses the shared environment initializer and requires icon-source.png', () => {
    const launcher = fs.readFileSync(path.join(projectRoot, 'update-icons.bat'), 'utf8');

    expect(launcher).toContain('call "scripts\\init-env.bat"');
    expect(launcher).toContain('icon-source.png');
    expect(launcher).toContain('scripts\\generate-icons.mjs');
    expect(launcher).toContain('.temp-icon-backup');
    expect(launcher).not.toContain('git commit');
    expect(launcher).not.toContain('git push');
    expect(launcher).not.toContain('publish-github-pages');
  });

  it('generates every manifest and legacy icon target without external services', () => {
    const generator = fs.readFileSync(path.join(projectRoot, 'scripts', 'generate-icons.mjs'), 'utf8');
    const expectedIcons = [
      'favicon.png',
      'apple-touch-icon.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'pwa-maskable-192x192.png',
      'pwa-maskable-512x512.png',
      'jls-icon-192.png',
      'jls-icon-512.png',
      'jls-maskable-512.png',
    ];

    for (const iconName of expectedIcons) {
      expect(generator).toContain(iconName);
    }

    expect(generator).toContain('System.Drawing');
    expect(generator).not.toContain('fetch(');
    expect(generator).not.toContain('https://');
  });
});
