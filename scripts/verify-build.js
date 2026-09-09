const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const headerBlock = html.match(/<thead>[\s\S]*?<\/thead>/);
const headers = headerBlock ? (headerBlock[0].match(/<th\b/g) || []).length : 0;

function fail(message) {
  console.error(`Build verification failed: ${message}`);
  process.exit(1);
}

if (headers !== 8) fail(`expected 8 table headers, found ${headers}`);
if (!/data-key="points"/.test(html) || !/>Total Points<\/button>/.test(html)) fail("Total Points header missing");
if (!/p\.points/.test(html)) fail("Total Points data binding missing");
if (!/data-key="priceStatusRank"/.test(html)) fail("Status column missing");
if ((html.match(/id="pwDeadline"/g) || []).length !== 1) fail("Price Change card target must be unique");
if (/class="pw-price-timer"/.test(html)) fail("header price-change timer still exists");
if (!/tabindex="0" role="button"/.test(html)) fail("keyboard-accessible player rows are missing");
if (!/version:2/.test(html)) fail("snapshot versioning is missing");
if (!/\/team\?id=/.test(html)) fail("Cloudflare team endpoint is not used");

console.log("Price Watch build verification passed");
