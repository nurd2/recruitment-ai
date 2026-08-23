import { createInterface } from "node:readline";
import { spawn } from "node:child_process";

const mode = process.argv[2] ?? "dev";
const colors = {
  APP: "\u001b[36m",
  WORKER: "\u001b[35m",
  ERROR: "\u001b[31m",
};
const resetColor = "\u001b[0m";
const useColor =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.TERM !== "dumb";

if (!process.versions.bun) {
  console.error("This launcher must be run with Bun.");
  process.exit(1);
}

if (!["dev", "start"].includes(mode)) {
  console.error(`Usage: ${process.argv[1]} [dev|start]`);
  process.exit(2);
}

function startProcess(label, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
  });

  const prefix = (isError) => {
    if (!useColor) return `[${label}]`;
    const color = isError ? colors.ERROR : colors[label];
    return `${color}[${label}]${resetColor}`;
  };

  const output = (stream, isError) => {
    const lines = createInterface({ input: stream });
    lines.on("line", (line) => {
      const message = `${prefix(isError)} ${line}`;
      (isError ? console.error : console.log)(message);
    });
  };

  output(child.stdout, false);
  output(child.stderr, true);

  child.on("error", (error) => {
    console.error(`[${label}] ${error.message}`);
  });

  return child;
}

const app = startProcess("APP", ["run", mode]);
const worker = startProcess("WORKER", ["run", "worker"]);
const children = [app, worker];

function waitForClose(child) {
  return new Promise((resolve) => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

const closePromises = children.map(waitForClose);
let stopping = false;

async function stopAll(exitCode) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed && child.exitCode === null) child.kill();
  }

  await Promise.all(closePromises);
  process.exitCode = exitCode;
}

process.once("SIGINT", () => void stopAll(130));
process.once("SIGTERM", () => void stopAll(143));

const firstExit = await Promise.race(closePromises);
if (!stopping) {
  const exitCode = firstExit.code ?? 1;
  await stopAll(exitCode);
}
