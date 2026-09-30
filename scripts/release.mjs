#!/usr/bin/env node
// 发版脚本:本地完成版本号升级与发布前检查;不 commit、不 push,发布由 CI 在版本 tag 推送后执行
// 用法:pnpm release <版本号>   例:pnpm release 0.1.2
// 流程:前置检查 → bump → build+test → pack 核验 → registry 预检 → 确认;确认通过仅保留新版本号,提交与打 tag 由人工完成
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const [target] = process.argv.slice(2);

const fail = (msg) => {
    console.error(`\n✖ ${msg}`);
    process.exitCode = 1;
};

const ok = (msg) => console.log(`✓ ${msg}`);

if (!target || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(target)) {
    fail("用法:pnpm release <版本号>,如 pnpm release 0.1.2");
    process.exit(1);
}

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });

// ---------- ① 前置检查 ----------
console.log(`\n== release ${target}:前置检查 ==`);

const branch = sh("git rev-parse --abbrev-ref HEAD").trim();
if (!["dev", "main"].includes(branch)) {
    fail(`当前分支 ${branch} 不是 dev/main;发版只从长期分支执行`);
    process.exit(1);
}
ok(`分支 ${branch}`);

const dirty = sh("git status --porcelain").trim();
// 未跟踪文件不阻塞;已跟踪文件存在未提交改动则中止,避免无关改动混入发版提交
if (dirty.split("\n").some((l) => l && !l.startsWith("??"))) {
    fail(`工作区有未提交的已跟踪改动:\n${dirty}`);
    process.exit(1);
}
ok("工作区干净(未跟踪文件忽略)");

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!changelog.includes(`## [${target}]`)) {
    fail(`CHANGELOG.md 缺少 "## [${target}]" 段落——先写变更记录再发版`);
    process.exit(1);
}
ok(`CHANGELOG 已含 ${target} 段`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const oldVersion = pkg.version;

// ---------- ② bump ----------
console.log(`\n== bump ${oldVersion} → ${target} ==`);
const bumped = JSON.parse(sh(`npm version ${target} --no-git-tag-version`) ? readFileSync("package.json", "utf8") : "{}");
if (bumped.version !== target) {
    fail("版本号写入失败");
    process.exit(1);
}
ok(`package.json → ${target}`);

// 任一后续步骤失败:回滚版本号再退(不留半成品状态)
const rollback = (msg) => {
    const p = JSON.parse(readFileSync("package.json", "utf8"));
    p.version = oldVersion;
    writeFileSync("package.json", JSON.stringify(p, null, 4) + "\n");
    fail(`${msg}(版本号已回滚为 ${oldVersion})`);
    process.exit(1);
};

// ---------- ③ build + test ----------
console.log("\n== build + test ==");
for (const cmd of ["pnpm build", "pnpm test"]) {
    try {
        execSync(cmd, { stdio: "inherit" });
    } catch {
        rollback(`${cmd} 失败`);
    }
}
ok("build + test 通过");

// ---------- ④ pack 核验 ----------
console.log("\n== npm pack --dry-run 核验 ==");
let packOut;
try {
    packOut = sh("npm pack --dry-run 2>&1");
} catch (e) {
    rollback(`npm pack 失败: ${e.message}`);
}
const files = packOut.split("\n").filter((l) => /^npm notice [0-9]/.test(l)).map((l) => l.split(/\s+/)[3]);
const readmeEn = files.filter((f) => f?.endsWith("README.en.md"));
// 双轨模板:2 棵树 ×(5 案例 + base)+ 根目录 README = 13
if (readmeEn.length !== 13) rollback(`README.en.md 数量 ${readmeEn.length} ≠ 13(双语素材缺份)`);
const total = packOut.match(/total files: (\d+)/)?.[1] ?? "?";
const size = packOut.match(/package size: ([\d.]+ \w+)/)?.[1] ?? "?";
ok(`pack 核验过:${files.length} 项 / README.en×13`);

// ---------- ⑤ registry 预检 ----------
console.log("\n== registry 预检 ==");
let published;
try {
    published = JSON.parse(sh("npm view create-dsh-plugin-cli versions --json"));
} catch {
    published = []; // 网络失败不阻塞,提示后继续
}
if (published.includes(target)) rollback(`registry 上 ${target} 已存在,请更换版本号`);
ok(`registry 上无 ${target}`);

// ---------- ⑥ 确认 ----------
console.log("\n== 发版摘要 ==");
console.log(`  版本:${oldVersion} → ${target}`);
console.log(`  包体:${total} 文件,${size}`);
console.log(`  分支:${branch}`);
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question("\n确认发版?(y=保留版本号并给出 publish 命令 / 其他=回滚退出) ")).toLowerCase();
rl.close();
if (answer !== "y") rollback("未确认");

