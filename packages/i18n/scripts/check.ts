import { fileURLToPath } from 'node:url';
import { checkTranslations } from '../src/checker';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const { issues, keyCount } = checkTranslations({
  messagesDir: fileURLToPath(new URL('../messages', import.meta.url)),
  qualityFile: fileURLToPath(new URL('../quality.json', import.meta.url)),
  sourceDirs: [`${root}apps/web/src`, `${root}packages/domain/src`],
});

if (issues.length === 0) {
  console.log(`i18n:check OK — ${keyCount} keys × 5 locales, no issue.`);
} else {
  for (const i of issues) {
    console.error(
      `[${i.kind}]${i.locale ? ` ${i.locale}` : ''}${i.key ? ` ${i.key}` : ''}${i.file ? ` (${i.file})` : ''}${i.detail ? ` — ${i.detail}` : ''}`,
    );
  }
  console.error(`i18n:check FAILED — ${issues.length} issue(s).`);
  process.exit(1);
}
