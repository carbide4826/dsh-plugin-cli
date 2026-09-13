// 【M1-07】第 1 组:名称/描述作者/包定位
import * as p from "@clack/prompts";
import { basename } from "node:path";
import type { Answers } from "../domain/types";
import { unwrap } from "../utils/prompt";

// 第 1 组问卷的收集结果(Answers 的第 1 组片段)
export interface BasicResult {
    dirName: string; // 项目目录("." 表示当前目录)
    pkgName: string; // npm 包名
    pluginId: string; // 插件 id(Cordis name 导出)
    description: string; // 描述
    author: string; // 作者
    pkgPosition: Answers["pkgPosition"]; // 包定位
}

/**
 * 第 1 组问卷入口:收集目录/包名/插件 id/描述/作者/包定位
 * @param baseName - create [name] 命令行参数,作为项目目录的默认值
 * @returns Answers 的第 1 组片段;全部带默认值直接回车可走完,零校验
 */
export async function askBasic(baseName?: string): Promise<BasicResult> {
    const dirDefault = baseName ?? "my-plugin"; // 目录默认值可被命令行参数覆盖

    // ① 项目目录:回车即用默认值
    let dirName = unwrap(
        await p.text({
            message: "项目目录 Project directory",
            placeholder: dirDefault,
            defaultValue: dirDefault,
        }),
    );

    // ①-a 输入 "." 表示用当前目录
    if (dirName === ".") {
        const cwdName = basename(process.cwd()); // 当前文件夹名
        if (/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(cwdName)) {
            p.log.info(`使用当前目录,插件 id 默认参考文件夹名 ${cwdName}`); // 目录名合法:提示后照用
        } else {
            p.log.warn(
                `当前文件夹名 ${cwdName} 不含可用英文字符,插件 id 请自行填写`,
            ); // 目录名非法:id 下一问用户自己填
        }
    }

    // ② npm 包名:静态默认,不与目录联动
    const pkgName = unwrap(
        await p.text({
            message: "npm 包名 package name",
            placeholder: "my-plugin",
            defaultValue: "my-plugin",
        }),
    );

    // ③ 插件 id:Cordis 的 name 导出,其他插件 inject 用("." 时参考文件夹名)
    const pluginId = unwrap(
        await p.text({
            message: "插件 id plugin id",
            placeholder: "my-plugin",
            defaultValue: "my-plugin",
        }),
    );

    // ④ 描述与作者:可空,空串占位
    const description = (
        unwrap(await p.text({ message: "一句话描述(可空,直接回车跳过)" })) || ""
    ).trim();
    const author = (
        unwrap(await p.text({ message: "作者(可空,直接回车跳过)" })) || ""
    ).trim();

    // ⑤ 包定位:bundle 为默认高亮项
    const pkgPosition = unwrap(
        await p.select({
            message: "这个包的定位是?",
            initialValue: "bundle",
            options: [
                {
                    value: "bundle",
                    label: "插件包",
                    hint: "会被 dsh plugin add 安装启用",
                },
                {
                    value: "library",
                    label: "库包",
                    hint: "供其他插件 import,不单独启用",
                },
            ],
        }),
    ) as Answers["pkgPosition"];
    return { dirName, pkgName, pluginId, description, author, pkgPosition };
}
