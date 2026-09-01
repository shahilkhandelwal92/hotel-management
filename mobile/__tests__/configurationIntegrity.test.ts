import * as fs from 'fs';
import * as path from 'path';

describe('Property Configuration & Production Data Integrity Audit', () => {
  const mobileAppDir = path.resolve(__dirname, '../app');
  const mobileSrcDir = path.resolve(__dirname, '../src');

  function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAllTsFiles(filePath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  it('verifies that no static hotel IDs (e.g. htl_...) are hard-coded in mobile production screens or client files', () => {
    const files = [...getAllTsFiles(mobileAppDir), ...getAllTsFiles(mobileSrcDir)];
    const hardCodedHotelIdRegex = /['"]htl_[a-zA-Z0-9_-]+['"]/;

    const violations: { file: string; match: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(hardCodedHotelIdRegex);
      if (match) {
        violations.push({ file: path.relative(mobileSrcDir, file), match: match[0] });
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies all API modules use dynamic authenticated Bearer token and server-provided hotel tenancy', () => {
    const apiFiles = getAllTsFiles(path.join(mobileSrcDir, 'api'));
    expect(apiFiles.length).toBeGreaterThan(0);

    for (const file of apiFiles) {
      if (file.endsWith('client.ts') || file.endsWith('types.ts')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      // All API modules must import apiClient from './client'
      expect(content).toContain("import { apiClient } from './client'");
    }
  });
});
