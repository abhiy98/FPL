const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");
const headerBlock = html.match(/<thead>[\s\S]*?<\/thead>/);
const headers = headerBlock ? (headerBlock[0].match(/<th\b/g) || []).length : 0;
const headerHtml = headerBlock ? headerBlock[0] : "";

function fail(message) {
  console.error(`Build verification failed: ${message}`);
  process.exit(1);
}

if (headers !== 10) fail(`expected 10 table headers, found ${headers}`);
if (!/data-key="points"/.test(headerHtml) || !/>Total Points<\/button>/.test(headerHtml)) fail("Total Points header missing");
if (!/p\.points/.test(html)) fail("Total Points data binding missing");
if (!/data-key="priceStatusRank"/.test(headerHtml)) fail("Status column missing");
if (!/data-key="priceProgress"/.test(headerHtml) || !/>Progress %<\/button>/.test(headerHtml)) fail("Progress % header missing");
if (!/data-key="pricePrediction"/.test(headerHtml) || !/>Prediction %<\/button>/.test(headerHtml)) fail("Prediction % header missing");
if (!/pricePercentMarkup/.test(html)) fail("Price predictor data binding is missing");
if ((headerHtml.match(/data-key="event"/g) || []).length !== 1) fail("This GW header must be the only event-sorted column");
if ((headerHtml.match(/data-key="points"/g) || []).length !== 1) fail("Total Points header must be unique");
if ((html.match(/id="pwDeadline"/g) || []).length !== 1) fail("Price Change card target must be unique");
if (/class="pw-price-timer"/.test(html)) fail("header price-change timer still exists");
if (!/tabindex="0" role="button"/.test(html)) fail("keyboard-accessible player rows are missing");
if (!/version:2/.test(html)) fail("snapshot versioning is missing");
if (!/\/team\?id=/.test(html)) fail("Cloudflare team endpoint is not used");

console.log("Price Watch build verification passed");
