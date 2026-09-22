// 名称/描述作者/包定位(按配置归属拆分为独立提问函数,供交互流程组合)
import * as p from "@clack/prompts";
import { basename } from "node:path";
import type { Answers } from "../domain/types";
import { unwrap } from "../utils/prompt";
import { t } from "../locales";

/**
 * 项目目录询问(交互流程第一问,各路径共用)
 * @param dirDefault - 目录默认值(create [name] 的 name 或 "my-plugin"),回车即用
 */
export async function askDirectoryName(dirDefault: string): Promise<string> {
    const dirName = unwrap(
        await p.text({
            message: t("prompts.basic.dirTitle"),
            placeholder: dirDefault,
            defaultValue: dirDefault,
        }),
    );

    // 输入 "." 表示用当前目录
    if (dirName === ".") {
        const cwdName = basename(process.cwd()); // 当前文件夹名
        if (/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(cwdName)) {
            p.log.info(t("prompts.basic.cwdValid", { name: cwdName })); // 目录名合法:提示后照用
        } else {
            p.log.warn(t("prompts.basic.cwdInvalid", { name: cwdName })); // 目录名非法:id 下一问用户自己填
        }
    }
    return dirName;
}

/**
 * 项目元信息询问(描述/作者,可空):与起点无关的公共配置。
 */
export async function askProjectMeta(): Promise<{ description: string; author: string }> {
    const description = (
        unwrap(await p.text({ message: t("prompts.basic.description") })) || ""
    ).trim();
    const author = (
        unwrap(await p.text({ message: t("prompts.basic.author") })) || ""
    ).trim();
    return { description, author };
}

/**
 * npm 包名询问(公共配置):默认与目录名联动,回车即用
 */
export async function askPkgName(dirDefault: string): Promise<string> {
    return unwrap(
        await p.text({
            message: t("prompts.basic.pkgTitle"),
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
            message: t("prompts.basic.pluginIdTitle"),
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
            message: t("prompts.basic.positionMessage"),
            initialValue: "bundle",
            options: [
                {
                    value: "bundle",
                    label: t("prompts.basic.positionBundle"),
                    hint: t("prompts.basic.positionBundleHint"),
                },
                {
                    value: "library",
                    label: t("prompts.basic.positionLibrary"),
                    hint: t("prompts.basic.positionLibraryHint"),
                },
            ],
        }),
    ) as Answers["pkgPosition"];
}
