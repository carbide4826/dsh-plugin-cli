// 名称/描述作者/包定位(按配置归属拆分为独立提问函数,供交互流程组合)
import * as p from "@clack/prompts";
import { basename } from "node:path";
import type { Answers } from "../domain/types";
import { unwrap } from "../utils/prompt";

/**
 * 项目目录询问(交互流程第一问,各路径共用)
 * @param dirDefault - 目录默认值(create [name] 的 name 或 "my-plugin"),回车即用
 */
export async function askDirectoryName(dirDefault: string): Promise<string> {
    const dirName = unwrap(
        await p.text({
            message: "项目目录 Project directory",
            placeholder: dirDefault,
            defaultValue: dirDefault,
        }),
    );

    // 输入 "." 表示用当前目录
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
    return dirName;
}

/**
 * 项目元信息询问(描述/作者,可空):与起点无关的公共配置。
 */
export async function askProjectMeta(): Promise<{ description: string; author: string }> {
    const description = (
        unwrap(await p.text({ message: "一句话描述(可空,直接回车跳过)" })) || ""
    ).trim();
    const author = (
        unwrap(await p.text({ message: "作者(可空,直接回车跳过)" })) || ""
    ).trim();
    return { description, author };
}

/**
 * npm 包名询问(公共配置):默认与目录名联动,回车即用
 */
export async function askPkgName(dirDefault: string): Promise<string> {
    return unwrap(
        await p.text({
            message: "npm 包名 package name",
            placeholder: dirDefault,
            defaultValue: dirDefault,
        }),
    );
}

/**
 * 插件 id 询问(公共配置):Cordis 的 name 导出,其他插件 inject 用;默认与目录名联动,回车即用
 */
export async function askPluginId(dirDefault: string): Promise<string> {
    return unwrap(
        await p.text({
            message: "插件 id plugin id",
            placeholder: dirDefault,
            defaultValue: dirDefault,
        }),
    );
}

/**
 * 包定位询问(仅原子组合路径需要;精选案例的定位随案例锁定)
 */
export async function askPkgPosition(): Promise<Answers["pkgPosition"]> {
    return unwrap(
        await p.select({
            message: "这个包的定位是?",
            initialValue: "bundle",
            options: [
                {
                    value: "bundle",
                    label: "插件包",
                    hint: "随宿主分发,不单独启用",
                },
                {
                    value: "library",
                    label: "库包",
                    hint: "供其他插件 import,不单独启用",
                },
            ],
        }),
    ) as Answers["pkgPosition"];
}
