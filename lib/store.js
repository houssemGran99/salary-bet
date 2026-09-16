import fs from "fs/promises";
import path from "path";

const REDIS_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const USE_REDIS = Boolean(REDIS_URL && REDIS_TOKEN);
const REDIS_KEY = "payday-predictor:bets";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bets.json");

// Serialize all writes through one in-process queue so concurrent requests
// (multiple teammates betting at once) can't clobber each other's changes.
// This only guards a single serverless instance, not multiple instances
// running at once, but write volume here is low enough that's acceptable.
let writeQueue = Promise.resolve();

let redisClient;
async function getRedis() {
  if (!redisClient) {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  }
  return redisClient;
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "{}", "utf-8");
  }
}

async function readData() {
  if (USE_REDIS) {
    const redis = await getRedis();
    return (await redis.get(REDIS_KEY)) || {};
  }
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeData(data) {
  if (USE_REDIS) {
    const redis = await getRedis();
    await redis.set(REDIS_KEY, data);
    return;
  }
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
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
