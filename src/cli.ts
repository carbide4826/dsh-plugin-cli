#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import type { Answers } from "./domain/types";
import { askBasic } from "./prompts/basic";
import { askCapabilities } from "./prompts/capabilities";
import { askConfig } from "./prompts/config";
import { printSummary } from "./prompts/summary";
import { writeProject } from "./generate/project";
import pkgJson from "../package.json" with { type: "json" };

const program = new Command();

program
    .name("dshp")
    .description(
        "Scaffold DeepSeek Harness (dsh) plugin projects interactively",
    )
    .version(pkgJson.version);

program
    .command("create [name]")
    .description("Create a DSH plugin project skeleton")
    .option(
        "--template <source>",
        "use a custom template (local path / git URL / npm package)",
    )
    .action(async (name: string | undefined) => {
        p.intro("dshp · DSH 插件骨架生成"); // 问卷横幅

        // ① 三组问卷依次收集(汇总 Answers 在此组装)
        const basic = await askBasic(name); // 第 1 组:目录/包名/插件 id/描述作者/定位
        const cap = await askCapabilities(); // 第 2 组:能力勾选(默认 tool 黄金路径)
        const config = await askConfig(cap.uiSurfaces); // 第 3 组:配置方式(设置卡片硬约束在此生效)

        const answers: Answers = {
            dirName: basic.dirName,
            pkgName: basic.pkgName,
            pluginId: basic.pluginId,
            toolName: cap.toolName,
            description: basic.description,
            author: basic.author,
            pkgPosition: basic.pkgPosition,
            atoms: cap.atoms,
            eventDomains: cap.eventDomains,
            uiSurfaces: cap.uiSurfaces,
            serviceCreate: cap.serviceCreate,
            serviceSeams: cap.serviceSeams,
            config,
        };

        // ② 全景汇总:人工确认页
        printSummary(answers);

        // ③ 确认后落盘(M2:渲染模板 + 动态文件生成)
        const ok = await p.confirm({ message: "按以上答案生成项目?", initialValue: true });
        if (p.isCancel(ok) || !ok) {
            p.cancel("已取消,未生成任何文件。");
            return;
        }

        const targetDir = resolve(process.cwd(), answers.dirName);
        if (answers.dirName !== "." && existsSync(targetDir)) {
            p.cancel(`目录已存在:${targetDir}(换一个目录名,或删除后重试)`);
            return;
        }

        const files = writeProject(answers, targetDir);
        p.log.info(`已生成 ${files.length} 个文件 → ${targetDir}`);
        p.note(files.map((f) => `  ${f}`).join("\n"), "文件清单");
        p.outro(
            "下一步:pnpm install → pnpm build | 本地调试:dsh web --patch ./dev.patch.yml | 建议:git init && git add -A",
        );
    });

program.parseAsync(process.argv);
