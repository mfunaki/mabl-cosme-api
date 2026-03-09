import { mkdir, readFile, writeFile, symlink, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const basePath = path.join(repoRoot, "config", "mcp.base.json");
const copilotPath = path.join(repoRoot, ".mcp.json");
const claudePath = path.join(repoRoot, ".vscode", "mcp.json");
const vscodeSettingsPath = path.join(repoRoot, ".vscode", "settings.json");

const baseRaw = await readFile(basePath, "utf8");
const base = JSON.parse(baseRaw);

if (!base || typeof base !== "object" || !base.servers || typeof base.servers !== "object") {
    throw new Error("config/mcp.base.json must include a top-level \"servers\" object.");
}

const claudeConfig = {
    servers: base.servers,
    inputs: Array.isArray(base.inputs) ? base.inputs : [],
};

const copilotConfig = {
    mcpServers: base.servers,
};

const ensureNpxYesArgs = (server) => {
    const args = Array.isArray(server.args) ? [...server.args] : [];
    if (!args.includes("-y")) {
        args.unshift("-y");
    }

    return {
        command: server.command,
        args,
    };
};

const readJsonOrDefault = async (filePath, defaultValue) => {
    try {
        const raw = await readFile(filePath, "utf8");
        try {
            return JSON.parse(raw);
        } catch {
            // VS Code settings can be JSONC (comments/trailing commas).
            return Function(`"use strict"; return (${raw});`)();
        }
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return defaultValue;
        }
        throw error;
    }
};

const settings = await readJsonOrDefault(vscodeSettingsPath, {});
const existingGeminiServers =
    settings["google.gemini.mcpServers"] && typeof settings["google.gemini.mcpServers"] === "object"
        ? settings["google.gemini.mcpServers"]
        : {};

const mablServer = base.servers.mabl;
if (!mablServer || typeof mablServer !== "object") {
    throw new Error("config/mcp.base.json must include servers.mabl.");
}

settings["google.gemini.mcpServers"] = {
    ...existingGeminiServers,
    mabl: ensureNpxYesArgs(mablServer),
};

await mkdir(path.dirname(claudePath), { recursive: true });
await writeFile(claudePath, `${JSON.stringify(claudeConfig, null, 2)}\n`, "utf8");
await writeFile(copilotPath, `${JSON.stringify(copilotConfig, null, 2)}\n`, "utf8");
await writeFile(vscodeSettingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

const targetFile = "CLAUDE.md";
const geminiLinkPath = path.join(repoRoot, "GEMINI.md");
const copilotDir = path.join(repoRoot, ".github");
const copilotLinkPath = path.join(copilotDir, "copilot-instructions.md");

await mkdir(copilotDir, { recursive: true });

await rm(geminiLinkPath, { force: true });
await symlink(targetFile, geminiLinkPath);

await rm(copilotLinkPath, { force: true });
const copilotTarget = path.relative(path.dirname(copilotLinkPath), path.join(repoRoot, targetFile));
await symlink(copilotTarget, copilotLinkPath);

console.log("Synced MCP config:");
console.log(`- ${path.relative(repoRoot, copilotPath)}`);
console.log(`- ${path.relative(repoRoot, claudePath)}`);
console.log(`- ${path.relative(repoRoot, vscodeSettingsPath)}`);
console.log("\nSynced instruction files (symlinks):");
console.log(`- ${path.relative(repoRoot, geminiLinkPath)}`);
console.log(`- ${path.relative(repoRoot, copilotLinkPath)}`);
