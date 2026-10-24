#!/usr/bin/env node
// drive-questionnaire.mjs — non-interactive entry for free atom combinations (a shell):
// parameters → native CLI flags → generate
//
// Evolution (don't regress): this script originally *drove the interactive questionnaire* —
// the CLI had no free-combination flags back then, so the only way in was to reverse-engineer
// clack's key semantics (select's down alias / Space toggles / clearing a prefilled text with
// Backspace). Dozens of trial-and-error rounds hardened that into 400 lines. Since
// 2026-10-21 the CLI has had a native entry:
//   --atoms / --event-domains / --ui-surfaces / --service-seams / --new-service / --dry-run
// So this script became a thin shell: it keeps the convenience of "parameter validation +
// post-generation self-check + JSON summary" and drops the key-driving entirely — taking with
// it the brittleness of "the prompt text is the sync anchor, so a CLI wording change breaks
// it".
//
// Usage (compatible with the old parameter surface; existing callers need no changes):
//   node drive-questionnaire.mjs --dir my-orders --target next \
//     --atoms tool,ui --surfaces settings-card --tool-name query_orders \
//     [--events tools,agent] [--seams llm] [--create-service] \
//     [--description "..."] [--author "..."] [--pkg-name x] [--plugin-id y] \
//     [--pkg-position bundle|library] [--config none|static|dynamic] [--lang zh|en]
//
// --lang is not passed when it isn't given: the CLI probes the environment (DSHP_LANG →
// LANG, non-Chinese → en), which is what "skip = probed from the environment" means in the
// checklist. The script doesn't pin the language for the user.
//
// Exit codes: 0 success (plus a JSON summary on stdout) · 1 illegal parameter or the CLI
// refused · 2 the post-generation self-check found missing files
//
// Dependencies: Node.js built-in modules only (no third-party packages).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// The script ships with the npm package: skills/dshp/scripts → up three levels is the
// package root, and dist/cli.mjs is the artifact of the same version
const PKG_ROOT = resolve(HERE, "../../..");
const BUNDLED_CLI = join(PKG_ROOT, "dist", "cli.mjs");

// The capability catalog (atoms / event domains / UI surfaces / capability seams) and their
// hard constraints are **not duplicated in this script** — the authority is on the CLI side
// (src/core/capabilities.ts, shared with MCP). A copied catalog always drifts: the CLI gains
// an atom, the script still rejects it on the old list, and the user gets "the CLI clearly
// supports it, the script says it's illegal". For the same reason, the hard constraints the
// CLI already validates (every surface needs the ui atom; settings-card cannot be
// config=none) are not re-implemented here.
//
// The script keeps three things of its own:
//   ① Parameter policies (a few rules stricter than the CLI's; see validate)
//   ② A post-generation self-check (derive the files that should exist from what was picked;
//      missing files exit non-zero)
//   ③ A JSON summary (for agents / CI to consume)

/** Parse long options in --key value / --flag form */
function parseArgs(argv) {
    const o = {
        dir: undefined,
        target: "latest",
        atoms: [],
        events: [],
        uiSurfaces: [],
        seams: [],
        createService: false,
        toolName: undefined,
        description: undefined,
        author: undefined,
        pkgName: undefined,
        pluginId: undefined,
        pkgPosition: "bundle",
        config: "none",
        lang: undefined,
        cli: undefined,
        dryRun: false,
    };
    const list = (raw) =>
        raw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => {
            const v = argv[++i];
            if (v === undefined) throw new Error(`${a} is missing a value`);
            return v;
        };
        switch (a) {
            case "--dir": o.dir = next(); break;
            case "--target": o.target = next(); break;
            case "--atoms": o.atoms = list(next()); break;
            case "--events": o.events = list(next()); break;
            case "--surfaces": o.uiSurfaces = list(next()); break;
            case "--seams": o.seams = list(next()); break;
            case "--create-service": o.createService = true; break;
            case "--tool-name": o.toolName = next(); break;
            case "--description": o.description = next(); break;
            case "--author": o.author = next(); break;
            case "--pkg-name": o.pkgName = next(); break;
            case "--plugin-id": o.pluginId = next(); break;
            case "--pkg-position": o.pkgPosition = next(); break;
            case "--config": o.config = next(); break;
            case "--lang": o.lang = next(); break;
            case "--cli": o.cli = next(); break;
            case "--dry-run": o.dryRun = true; break;
            default: throw new Error(`unknown parameter: ${a}`);
        }
    }
    return o;
}

function validate(o) {
    const bad = (m) => {
        throw new Error(m);
    };
    if (!o.dir) bad("--dir is required");
    if (!["latest", "next"].includes(o.target)) bad(`illegal --target value: ${o.target}`);
    if (!["bundle", "library"].includes(o.pkgPosition)) bad(`illegal --pkg-position value: ${o.pkgPosition}`);
    if (!["none", "static", "dynamic"].includes(o.config)) bad(`illegal --config value: ${o.config}`);
    // The rules below are **script policies** (absent or looser on the CLI side), not copies
    // of the CLI's rules: picking an atom means giving its matching catalog entry — otherwise
    // the JSON summary and the post-generation self-check can't tell which files that atom
    // should have produced.
    if (o.atoms.includes("events") && o.events.length === 0) bad("the events atom requires --events with its event domains");
    if (o.atoms.includes("ui") && o.uiSurfaces.length === 0) bad("the ui atom requires --surfaces with its UI surfaces");
    if (o.atoms.includes("service") && o.seams.length === 0 && !o.createService) {
        bad("the service atom requires --seams with its capability seams, or --create-service");
    }
    // The CLI falls back for toolName (default example_tool); this script doesn't: a
    // placeholder name like example_tool still has to be hand-edited afterwards, so it's
    // better to settle it before starting.
    if (o.atoms.includes("tool") && !o.toolName) bad("the tool atom requires --tool-name with the tool name");
}

/** Assemble the CLI parameters (native flags; capability selection goes through --atoms etc.,
 * no questionnaire driving any more) */
function cliArgs(o) {
    const args = ["create", o.dir, "--target", o.target];
    // --lang is only passed when the caller asked for it; otherwise the CLI probes the
    // environment (DSHP_LANG → LANG, non-Chinese → en), which is what "skip = probed from
    // the environment" means in the checklist. Forcing a language here would silently
    // generate a project in the wrong language on someone else's machine.
    if (o.lang) args.push("--lang", o.lang);
    // --atoms is always passed (an empty value counts): without it the CLI falls into the
    // interactive questionnaire, and nobody is there to answer it
    args.push("--atoms", o.atoms.join(","));
    if (o.events.length) args.push("--event-domains", o.events.join(","));
    if (o.uiSurfaces.length) args.push("--ui-surfaces", o.uiSurfaces.join(","));
    if (o.seams.length) args.push("--service-seams", o.seams.join(","));
    if (o.createService) args.push("--new-service");
    if (o.toolName) args.push("--tool-name", o.toolName);
    if (o.description) args.push("--description", o.description);
    if (o.author) args.push("--author", o.author);
    if (o.pkgName) args.push("--pkg-name", o.pkgName);
    if (o.pluginId) args.push("--plugin-id", o.pluginId);
    args.push("--pkg-position", o.pkgPosition);
    args.push("--config", o.config);
    if (o.dryRun) args.push("--dry-run");
    return args;
}

function resolveCli(o) {
    if (o.cli) return { cmd: "node", args: [resolve(o.cli)] };
    if (existsSync(BUNDLED_CLI)) return { cmd: "node", args: [BUNDLED_CLI] };
    return { cmd: "npx", args: ["-y", "create-dsh-plugin-cli"] };
}

/** Run the CLI; pass stdout/stderr through; return the exit code */
function runCli(o) {
    return new Promise((resolvePromise) => {
        const cli = resolveCli(o);
        const args = [...cli.args, ...cliArgs(o)];
        const child = spawn(cli.cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
        child.on("error", (err) => {
            process.stderr.write(`failed to start the CLI (${cli.cmd} ${cli.args.join(" ")}): ${err.message}\n`);
            resolvePromise(1);
        });
        child.on("exit", (code) => resolvePromise(code ?? 1));
    });
}

/** Post-generation self-check: derive the files that should exist from what was picked */
function selfCheck(dir, o) {
    const root = resolve(process.cwd(), dir);
    const expect = ["package.json", "tsconfig.json", "src/index.ts"];
    if (o.pkgPosition === "bundle") expect.push("cordis.patch.yml", "dev.patch.yml");
    if (o.atoms.includes("tool")) expect.push("src/tool.ts");
    if (o.atoms.includes("events")) expect.push("src/events.ts");
    if (o.atoms.includes("ui")) expect.push("src/client/index.ts");
    if (o.atoms.includes("service") && o.createService) expect.push("src/service.ts");
    const missing = expect.filter((f) => !existsSync(join(root, f)));
    return { root, checked: expect, missing };
}

async function main() {
    let o;
    try {
        o = parseArgs(process.argv.slice(2));
        validate(o);
    } catch (err) {
        process.stderr.write(`bad parameters: ${err.message}\n`);
        process.exit(1);
    }

    // dry-run: print the command that would run (without running the CLI) — handy for
    // seeing exactly what is about to happen
    if (o.dryRun) {
        const cli = resolveCli(o);
        process.stdout.write(
            JSON.stringify(
                {
                    dryRun: true,
                    dir: o.dir,
                    target: o.target,
                    command: [cli.cmd, ...cli.args, ...cliArgs(o)],
                },
                null,
                2,
            ) + "\n",
        );
        return;
    }

    const code = await runCli(o);
    if (code !== 0) {
        process.stderr.write(`the CLI exited with code ${code}\n`);
        process.exit(1);
    }

    const check = selfCheck(o.dir, o);
    process.stdout.write(
        JSON.stringify(
            {
                ok: check.missing.length === 0,
                dir: check.root,
                atoms: o.atoms,
                eventDomains: o.events,
                uiSurfaces: o.uiSurfaces,
                serviceSeams: o.seams,
                createService: o.createService,
                toolName: o.toolName,
                target: o.target,
                config: o.config,
                lang: o.lang ?? "auto",
                missingFiles: check.missing,
            },
            null,
            2,
        ) + "\n",
    );
    if (check.missing.length > 0) process.exit(2);
}

await main();
