#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IS_WINDOWS = process.platform === "win32";
const USE_COLOR = !process.env.NO_COLOR;
const ESC = String.fromCharCode(27);

const TARGETS = [
  { key: "api", dir: "backend", color: "35" },
  { key: "web", dir: "frontend", color: "36" },
];

const MODES = {
  dev: { parallel: true, scripts: { api: "start:dev", web: "dev" } },
  build: { parallel: false, scripts: { api: "build", web: "build" } },
  start: { parallel: true, scripts: { api: "start:prod", web: "start" } },
  typecheck: { parallel: false, scripts: { api: "typecheck", web: "type-check" } },
};

const children = new Map();
let shuttingDown = false;

function isMissing(target) {
  return !existsSync(path.join(ROOT, target.dir, "package.json"));
}

function toDirName(target) {
  return `${target.dir}/`;
}

function label(target) {
  const text = `[${target.key}]`;
  return USE_COLOR ? `${ESC}[${target.color}m${text}${ESC}[0m` : text;
}

function forward(stream, target, sink) {
  let buffer = "";
  stream.setEncoding("utf8");
  function onData(chunk) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) sink.write(`${label(target)} ${line.replace(/\r$/, "")}\n`);
  }
  function onEnd() {
    if (buffer) sink.write(`${label(target)} ${buffer}\n`);
  }
  stream.on("data", onData);
  stream.on("end", onEnd);
}

function run(target, script) {
  process.stdout.write(`${label(target)} pnpm run ${script}\n`);
  const options = {
    cwd: path.join(ROOT, target.dir),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
  };
  const child = IS_WINDOWS
    ? spawn(`pnpm run ${script}`, { ...options, shell: true })
    : spawn("pnpm", ["run", script], options);
  children.set(target.key, child);
  forward(child.stdout, target, process.stdout);
  forward(child.stderr, target, process.stderr);
  return new Promise(function settle(resolve) {
    function onExit(code, signal) {
      children.delete(target.key);
      resolve({ target, code: code ?? (signal ? 1 : 0) });
    }
    function onError(error) {
      process.stderr.write(`${label(target)} failed to start: ${error.message}\n`);
      children.delete(target.key);
      resolve({ target, code: 1 });
    }
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

function killAll() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.values()) {
    if (child.pid === undefined) continue;
    if (IS_WINDOWS) spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
}

function onSignal() {
  killAll();
}

function hasFailed(result) {
  return result.code !== 0;
}

async function runSequential(config) {
  for (const target of TARGETS) {
    const result = await run(target, config.scripts[target.key]);
    if (result.code !== 0) {
      process.stderr.write(`${label(target)} exited with code ${result.code}\n`);
      return result.code;
    }
  }
  return 0;
}

async function runParallel(config) {
  function startTarget(target) {
    return run(target, config.scripts[target.key]);
  }
  const running = TARGETS.map(startTarget);
  const first = await Promise.race(running);
  if (!shuttingDown) {
    process.stderr.write(`${label(first.target)} exited with code ${first.code} — stopping the rest\n`);
    killAll();
  }
  const results = await Promise.all(running);
  return results.some(hasFailed) ? 1 : 0;
}

const mode = process.argv[2] ?? "";
if (!Object.hasOwn(MODES, mode)) {
  process.stderr.write(`run: unknown mode "${mode}". Expected one of: ${Object.keys(MODES).join(", ")}\n`);
  process.exit(1);
}

const missing = TARGETS.filter(isMissing);
if (missing.length > 0) {
  process.stderr.write(`run: missing ${missing.map(toDirName).join(" and ")} — clone them into the repo root before running "pnpm ${mode}"\n`);
  process.exit(1);
}

process.on("SIGINT", onSignal);
process.on("SIGTERM", onSignal);

const exitCode = MODES[mode].parallel ? await runParallel(MODES[mode]) : await runSequential(MODES[mode]);
process.exit(exitCode);
