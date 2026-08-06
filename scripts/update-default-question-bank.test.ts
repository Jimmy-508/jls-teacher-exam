// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { readFileSync } from 'node:fs';
// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { resolve } from 'node:path';
declare const __dirname: string;
import { describe, expect, it } from 'vitest';

const script = readFileSync(resolve(__dirname, 'update-default-question-bank.ps1'), 'utf8').replace(/\r\n/g, '\n');

describe('update-default-question-bank.ps1', () => {
  it('leaves the default question bank version unchanged when the candidate ZIP hash is unchanged', () => {
    const unchangedHashIndex = script.indexOf('$currentHash -eq $candidateHash');
    const versionUpdateIndex = script.indexOf('Set-DefaultQuestionBankVersion $NewDefaultQuestionBankVersion');

    expect(unchangedHashIndex).toBeGreaterThanOrEqual(0);
    expect(versionUpdateIndex).toBeGreaterThan(unchangedHashIndex);
  });

  it('updates the default question bank version only after replacing the ZIP', () => {
    const replaceIndex = script.indexOf('Copy-Item -LiteralPath $candidatePath -Destination $TargetPath -Force');
    const validationIndex = script.indexOf("$finalValidation = Invoke-QuestionBankValidation -Path $TargetPath -Kind 'Zip'");
    const versionIndex = script.indexOf('Set-DefaultQuestionBankVersion $NewDefaultQuestionBankVersion');

    expect(replaceIndex).toBeGreaterThanOrEqual(0);
    expect(validationIndex).toBeGreaterThan(replaceIndex);
    expect(versionIndex).toBeGreaterThan(validationIndex);
    expect(script).toContain("Get-Date -Format 'yyyy.MM.dd.HHmmss'");
  });

  it('restores the default question bank version if the update fails before commit', () => {
    expect(script).toContain('$OriginalDefaultQuestionBankInfo');
    expect(script).toContain('function Restore-DefaultQuestionBankInfoIfNeeded');
    expect(script).toContain('Restore-DefaultQuestionBankInfoIfNeeded');
  });

  it('stages the default question bank ZIP and version file in the same commit', () => {
    expect(script).toContain("Invoke-Git @('add','--','public\\JLS_094_115_v5.0.zip','src\\config\\defaultQuestionBankInfo.ts')");
    expect(script).toContain("'public/JLS_094_115_v5.0.zip', 'src/config/defaultQuestionBankInfo.ts'");
    expect(script).toContain('$unexpectedStaged');
    expect(script).toContain('$missingStaged');
  });
});
