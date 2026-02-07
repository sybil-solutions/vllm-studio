import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");
const standaloneRoot = resolve(projectRoot, ".next", "standalone");

if (!existsSync(standaloneRoot)) {
  console.error('Missing ".next/standalone". Run "npm run build" first.');
  process.exit(1);
}

const copyDirectory = (from, to) => {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
};

copyDirectory(resolve(projectRoot, "public"), resolve(standaloneRoot, "public"));
copyDirectory(resolve(projectRoot, ".next", "static"), resolve(standaloneRoot, ".next", "static"));

const server = spawn("node", ["server.js"], {
  cwd: standaloneRoot,
  stdio: "inherit",
  env: process.env,
});

server.on("exit", (code) => process.exit(code ?? 0));

