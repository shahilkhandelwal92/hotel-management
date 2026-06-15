import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function readEnvValue(filePath, key) {
    if (!fs.existsSync(filePath)) return undefined;

    const line = fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .find((entry) => entry.trim().startsWith(`${key}=`));

    if (!line) return undefined;
    const value = line.slice(line.indexOf("=") + 1).trim();
    return value.replace(/^(['"])(.*)\1$/, "$2");
}

const databaseUrl =
    process.env.DATABASE_URL ||
    readEnvValue(path.join(projectRoot, ".env.local"), "DATABASE_URL") ||
    readEnvValue(path.join(projectRoot, ".env"), "DATABASE_URL");

if (!databaseUrl) {
    console.error("DATABASE_URL is required. Configure it in the environment or .env.local.");
    process.exit(1);
}

const prismaCli = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
});

process.exit(result.status ?? 1);
