// 原子定义与推荐默认(label/desc 为惰性函数:语言在 --lang 解析后才定格,加载期不能求值)

import type { AtomId } from "./types";
import { t } from "../locales";

export const ATOMS = [
    {
        id: "tool",
        label: () => t("domain.atoms.tool.label"),
        desc: () => t("domain.atoms.tool.desc"),
        default: true,
    },
    {
        id: "events",
        label: () => t("domain.atoms.events.label"),
        desc: () => t("domain.atoms.events.desc"),
    },
    {
        id: "service",
        label: () => t("domain.atoms.service.label"),
        desc: () => t("domain.atoms.service.desc"),
    },
    {
        id: "ui",
        label: () => t("domain.atoms.ui.label"),
        desc: () => t("domain.atoms.ui.desc"),
    },
    {
        id: "protocol",
        label: () => t("domain.atoms.protocol.label"),
        desc: () => t("domain.atoms.protocol.desc"),
    },
] as const satisfies readonly {
    id: AtomId;
    label: () => string;
    desc: () => string;
    default?: true;
}[];
