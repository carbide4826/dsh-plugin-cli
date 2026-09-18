// 渲染引擎单元测试
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderPath, renderString, renderDir, writeFile } from "./render";

describe("renderPath / renderString(纯函数)", () => {
    it("替换已知占位符", () => {
        const vars = { PKG_NAME: "dsh-weather", TOOL_NAME: "weather_query" };
        expect(renderString("name: {{PKG_NAME}}", vars)).toBe("name: dsh-weather");
        expect(renderPath("src/{{TOOL_NAME}}.ts", vars)).toBe("src/weather_query.ts");
    });

    it("未知占位符原样保留(不静默吞)", () => {
        expect(renderString("{{UNKNOWN_KEY}}", {})).toBe("{{UNKNOWN_KEY}}");
        expect(renderPath("src/{{UNKNOWN}}.ts", {})).toBe("src/{{UNKNOWN}}.ts");
    });

    it("已是合法内容的输入原样返回(幂等)", () => {
        const s = "const name = 'my-plugin'";
        expect(renderString(s, {})).toBe(s);
    });

    it("多个占位符同行全部替换", () => {
        expect(renderString("{{A}}-{{B}}", { A: "x", B: "y" })).toBe("x-y");
    });
});

describe("renderDir / writeFile(目录与文件落盘,IO)", () => {
    let tplDir: string; // 模板目录
    let outRoot: string; // 输出根目录(与模板分离)

    beforeEach(() => {
        tplDir = join(tmpdir(), `dshp-tpl-${Math.random().toString(36).slice(2, 8)}`);
        outRoot = join(tmpdir(), `dshp-out-${Math.random().toString(36).slice(2, 8)}`);
        mkdirSync(tplDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(tplDir, { recursive: true, force: true });
        rmSync(outRoot, { recursive: true, force: true });
    });

    it("静态文件渲染:内容与路径占位符都替换,报告相对路径", () => {
        writeFileSync(join(tplDir, "package.json"), '{ "name": "{{PKG_NAME}}" }');
        const vars = { PKG_NAME: "dsh-weather" };

        const written = renderDir(tplDir, outRoot, vars);

        expect(written).toEqual(["package.json"]);
        expect(readFileSync(join(outRoot, "package.json"), "utf8")).toBe(
            '{ "name": "dsh-weather" }',
        );
    });

    it("子目录递归渲染 + 目录名占位符替换", () => {
        mkdirSync(join(tplDir, "src", "{{TOOL_NAME}}"), { recursive: true });
        writeFileSync(join(tplDir, "src", "{{TOOL_NAME}}", "impl.ts"), "// {{PKG_NAME}}");
        const vars = { PKG_NAME: "dsh-w", TOOL_NAME: "weather" };

        renderDir(tplDir, outRoot, vars);

        const out = join(outRoot, "src", "weather", "impl.ts");
        expect(existsSync(out)).toBe(true);
        expect(readFileSync(out, "utf8")).toBe("// dsh-w");
    });

    it("二进制扩展名跳过内容替换(原样复制)", () => {
        const raw = "binary {{PLACEHOLDER}} payload";
        writeFileSync(join(tplDir, "logo.png"), raw);
        const vars = { PLACEHOLDER: "已替换?" };

        renderDir(tplDir, outRoot, vars);

        expect(readFileSync(join(outRoot, "logo.png"), "utf8")).toBe(raw); // 原样,未被替换
    });

    it("未知占位符在落盘文件中原样保留", () => {
        writeFileSync(join(tplDir, "a.txt"), "value: {{MISSING}}");
        renderDir(tplDir, outRoot, { A: "x" });
        expect(readFileSync(join(outRoot, "a.txt"), "utf8")).toBe("value: {{MISSING}}");
    });

    it("writeFile 自动创建深层目录", () => {
        writeFile(outRoot, "src/deep/nested/file.ts", "// hi");
        expect(readFileSync(join(outRoot, "src/deep/nested/file.ts"), "utf8")).toBe("// hi");
    });
});
