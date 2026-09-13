#!/usr/bin/env node
import { Command } from "commander";
import * as p from "@clack/prompts";
import type { Answers } from "./domain/types";
import { askBasic } from "./prompts/basic";
import { askCapabilities } from "./prompts/capabilities";
import { askConfig } from "./prompts/config";
import { printSummary } from "./prompts/summary";

const program = new Command();

program
    .name("dshp")
    .description("Scaffold DeepSeek Harness (dsh) plugin projects interactively")
    .version("0.1.0");

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

        // ② 全景汇总:人工确认页(M2 渲染管线的输入形态)
        printSummary(answers);

        // ③ M2 里程碑:模板渲染与文件生成(当前到此为止)
        p.outro(
            "问卷完成。文件生成将在 M2 里程碑提供,当前仅收集与预览答案。",
        );
    });

program.parseAsync(process.argv);
