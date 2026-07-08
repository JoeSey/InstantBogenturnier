// Postinstall bootstrap (see README "Branding / Club Color"): src/custom.css holds the
// club's highlight-color overrides and is gitignored so local rebranding never shows up
// as a git diff. A fresh clone has no custom.css yet — copy it from the checked-in
// template on install so the build works out of the box. Never overwrites an existing
// custom.css (a trainer's local color edits must survive `npm install`).
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const srcDir = fileURLToPath(new URL('../src', import.meta.url));
const template = `${srcDir}/custom.css.example`;
const target = `${srcDir}/custom.css`;

if (!existsSync(target)) {
  copyFileSync(template, target);
  console.log('Created src/custom.css from custom.css.example (club highlight-color template).');
}
