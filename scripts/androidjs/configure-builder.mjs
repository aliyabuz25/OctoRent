import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceFile = path.join(root, 'node_modules/androidjs-builder/modules/webview.js');
const apiBase = process.argv[2];
if (!apiBase) throw new Error('API base URL is required');

const allowCleartext = new URL(apiBase).protocol === 'http:';
let source = fs.readFileSync(sourceFile, 'utf8');
const property = /('android:usesCleartextTraffic':\s*")(true|false)(")/;
if (!property.test(source)) throw new Error('AndroidJS builder manifest setting was not found; review the builder version');
source = source.replace(property, `$1${allowCleartext}$3`);
fs.writeFileSync(sourceFile, source);
console.log(`Android cleartext traffic: ${allowCleartext ? 'enabled for HTTP API build' : 'disabled for HTTPS API build'}`);
