import { spawn } from "node:child_process";

const heapFlag = "--max-old-space-size=8192";

const child = spawn(
  process.execPath,
  [heapFlag, "./node_modules/next/dist/bin/next", "build", "--webpack"],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: heapNodeOptions(process.env.NODE_OPTIONS) },
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

function heapNodeOptions(existing) {
  const kept = (existing ?? "")
    .replace(/--max-old-space-size(?:=|\s+)\d+/g, "")
    .trim();
  return kept ? `${kept} ${heapFlag}` : heapFlag;
}
