import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bets.json");

// Serialize all writes through one in-process queue so concurrent requests
// (multiple teammates betting at once) can't clobber each other's changes.
let writeQueue = Promise.resolve();

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "{}", "utf-8");
  }
}

async function readData() {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeData(data) {
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
