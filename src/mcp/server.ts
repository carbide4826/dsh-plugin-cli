// MCP server(stdio):把 dshp 的生成能力暴露给模型。
//
// 为什么是 stdio 而不是 http:本地脚手架工具,没有多用户/鉴权/远程部署的需求,
// stdio 客户端(MCP host、编辑器)开箱即用,也不用管端口与鉴权。
//
// 为什么与 CLI 同包:素材、版本单源、守门测试、发布管线四样都在本仓,
// 拆出去等于复制一份会漂移的载荷(本仓最痛的一类事故就是双份清单过期)。
//
// 纪律:stdout 是 JSON-RPC 通道,本模块一行都不许往 stdout 写;日志只走 stderr。
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCreatePlugin } from "./tools/createPlugin";
import { registerListScenarios } from "./tools/listScenarios";
import { registerDoctor } from "./tools/doctor";
import { registerSpec } from "./tools/spec";
import pkgJson from "../../package.json" with { type: "json" };

/** MCP server 的可选配置 */
export interface McpServerOptions {
    /**
     * 生成项目的基准目录(缺省当前工作目录)。
     * 宿主通常用工作目录起 server,此时项目就建在那里;显式给 baseDir 是给测试与
     * 「统一在某个目录下生成」的场景留的口子。
     */
    baseDir?: string;
}

/** 构造 MCP server(不接传输层,便于测试) */
export function createMcpServer(options: McpServerOptions = {}): McpServer {
    const server = new McpServer(
        { name: "dshp", version: pkgJson.version },
        {
            instructions:
                "用 dshp 生成 DeepSeek Harness(dsh)插件项目。" +
                "先调 dshp_list_scenarios 看能选什么(预设/案例/原子/事件域/界面位/缝);" +
                "再调 dshp_spec 拿访谈清单与缺项判定 —— 逐项问用户(每项可跳过)," +
                "spec.ready 为 true 后调 dshp_create_plugin 生成(第一次只算计划,确认后显式传 dryRun=false 落盘)。" +
                "dshp_doctor 可随时体检本机环境是否就绪。",
        },
    );
    registerListScenarios(server);
    registerSpec(server);
    registerCreatePlugin(server, options);
    registerDoctor(server);
    return server;
}

/** 起 stdio 传输(进程随 stdin 关闭而结束) */
export async function startMcpServer(): Promise<void> {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // 提示走 stderr:stdout 是 JSON-RPC 通道,写进去会污染协议流
    console.error(
        `[dshp] MCP server 已就绪(协议 stdio · v${pkgJson.version} · 工具 4 个)`,
    );
}
