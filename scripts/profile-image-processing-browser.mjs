import { chromium } from "playwright";

const APP_URL = process.env.PINDOU_APP_URL ?? "http://127.0.0.1:4173";
const IMAGE_PATH = process.argv[2];
const CHROME_PATH =
  process.env.PINDOU_CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!IMAGE_PATH) {
  console.error("Usage: node scripts/profile-image-processing-browser.mjs <image-path>");
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 1100 },
});

async function waitForProfileCount(count) {
  await page.waitForFunction(
    (expected) =>
      Array.isArray(window.__PINDOU_PROCESS_PROFILES__) &&
      window.__PINDOU_PROCESS_PROFILES__.length >= expected,
    count,
    { timeout: 90_000 },
  );
}

async function readProfiles() {
  return await page.evaluate(() => window.__PINDOU_PROCESS_PROFILES__ ?? []);
}

async function readFooterNote() {
  const note = page.locator("div.absolute.bottom-2.left-2");
  if ((await note.count()) === 0) {
    return null;
  }
  const text = (await note.first().textContent())?.trim();
  return text || null;
}

async function setSliderToMax(id) {
  const thumb = page.locator(`#${id} [role='slider']`);
  await thumb.waitFor({ state: "visible", timeout: 30_000 });
  await thumb.focus();
  await page.keyboard.press("End");
}

async function profileInteraction(name, action) {
  const beforeCount = (await readProfiles()).length;
  const startedAt = Date.now();
  await action();
  await waitForProfileCount(beforeCount + 1);
  const wallMs = Date.now() - startedAt;
  const { profiles, convertProfile } = await page.evaluate(() => ({
    profiles: window.__PINDOU_PROCESS_PROFILES__ ?? [],
    convertProfile: window.__PINDOU_LAST_CONVERT_PROFILE__ ?? null,
  }));
  const profile = profiles[profiles.length - 1] ?? null;
  const footerNote = await readFooterNote();
  return {
    name,
    wallMs,
    footerNote,
    profile,
    convertProfile,
  };
}

await page.goto(APP_URL, { waitUntil: "networkidle" });
await page.evaluate(() => {
  window.__PINDOU_PROCESS_PROFILES__ = [];
  window.__PINDOU_LAST_PROCESS_PROFILE__ = undefined;
});

const fileInput = page.locator("input[type='file']").first();
const initialStartedAt = Date.now();
await fileInput.setInputFiles(IMAGE_PATH);

const runs = [];
await waitForProfileCount(1);
const initialDebug = await page.evaluate(() => ({
  profiles: window.__PINDOU_PROCESS_PROFILES__ ?? [],
  convertProfile: window.__PINDOU_LAST_CONVERT_PROFILE__ ?? null,
}));
runs.push({
  name: "initial-load",
  wallMs: Date.now() - initialStartedAt,
  footerNote: await readFooterNote(),
  profile: initialDebug.profiles.at(-1) ?? null,
  convertProfile: initialDebug.convertProfile,
});

runs.push(
  await profileInteraction("render-style-bias-100", async () => {
    await setSliderToMax("render-style-bias");
  }),
);

runs.push(
  await profileInteraction("reduce-tolerance-max", async () => {
    await setSliderToMax("reduce-tolerance");
  }),
);

runs.push(
  await profileInteraction("fft-edge-enhance-100", async () => {
    await setSliderToMax("fft-edge-enhance-strength");
  }),
);

console.log(JSON.stringify({ imagePath: IMAGE_PATH, appUrl: APP_URL, runs }, null, 2));

await browser.close();
