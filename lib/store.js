import fs from "fs/promises";
import path from "path";

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const BLOB_PATHNAME = "bets.json";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bets.json");

// Serialize all writes through one in-process queue so concurrent requests
// (multiple teammates betting at once) can't clobber each other's changes.
// This only guards a single serverless instance, not multiple instances
// running at once, but write volume here is low enough that's acceptable.
let writeQueue = Promise.resolve();

async function readBlobData() {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
  const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!blob) return {};
  const res = await fetch(blob.url, { cache: "no-store" });
  if (!res.ok) return {};
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function writeBlobData(data) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "{}", "utf-8");
  }
}

async function readFileData() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeFileData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function readData() {
  return USE_BLOB ? readBlobData() : readFileData();
}

async function writeData(data) {
  return USE_BLOB ? writeBlobData(data) : writeFileData(data);
}

export function getMonth(data, monthStr) {
  return data[monthStr] || { bets: [], winningDate: null };
}

// fn(data) -> [newData, result]. Runs exclusively w.r.t. other mutate() calls.
export function mutate(fn) {
  const task = writeQueue.then(async () => {
    const data = await readData();
    const [newData, result] = await fn(data);
    await writeData(newData);
    return result;
  });
  writeQueue = task.then(
    () => {},
    () => {},
  );
  return task;
}

export { readData };
