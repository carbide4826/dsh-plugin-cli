// 错误码层:把「可判定的失败」从 i18n 文案里剥出来,让程序(CLI / MCP / 脚本)能按 code 分支。
//
// 为什么要这一层:此前所有失败都表达成 `throw new Error(t("errors.xxx"))`——文案随 --lang 变化,
// 且 code 与文案一一对应又藏在字典里,调用方只能匹配字符串,无法当接口用。MCP 尤其致命:
// 工具返回值必须是稳定的结构化数据,不能是「本地化句子」。
//
// 约定:
// - code 是稳定契约(SCREAMING_SNAKE),**永不改名**;文案可以随时改,code 不动。
// - 每个 code 恰好对应一个 i18n key(见 LOCALE_KEY),由 locales 字典提供当前语言的文案。
// - params 是文案的插值参数;不含文案,故不随语言变化。
// - 领域层(domain/generate)只抛 DshpError;cli.ts 负责把它渲染成人话并置退出码。

/** 稳定错误码全集;新增只增不改,删除视为破坏性变更 */
export const ERROR_CODES = [
    "UNKNOWN_DEP",
    "UNKNOWN_AGGREGATE",
    "TEMPLATES_ROOT_MISSING",
    "TEMPLATE_MISSING",
    "CASE_MISSING",
    "PATCH_MISSING",
    "INSERT_MISSING",
    "PKG_POSITION_INVALID",
    "CONFIG_INVALID",
    "CONFIG_NONE_REQUIRES_SETTINGS_CARD",
    "UNRESOLVED_PLACEHOLDER",
    "UNKNOWN_TARGET",
    "SCENARIO_REQUIRES_TEMPLATE",
    "CASE_NOT_FOUND",
    "UNKNOWN_SCENARIO",
    "DIR_EXISTS",
    "CHECK_FAILED",
    "CASE_FLAG_INAPPLICABLE",
    "TOOL_NAME_IGNORED",
    "LANG_INVALID",
    "ATOM_UNKNOWN",
    "EVENT_DOMAIN_UNKNOWN",
    "UI_SURFACE_UNKNOWN",
    "SEAM_UNKNOWN",
    "SURFACE_REQUIRES_ATOM",
    "OVERRIDE_WITHOUT_TEMPLATE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * code → i18n 字典 key 的映射(每个 code 恰好一条)。
 * 守门测试断言两侧 key 集合完全一致:漏一条 = 报错时回落到 key 字符串本身。
 */
export const LOCALE_KEY: Record<ErrorCode, string> = {
    UNKNOWN_DEP: "errors.unknownDep",
    UNKNOWN_AGGREGATE: "errors.unknownAggregate",
    TEMPLATES_ROOT_MISSING: "errors.templatesRootMissing",
    TEMPLATE_MISSING: "errors.templateMissing",
    CASE_MISSING: "errors.caseMissing",
    PATCH_MISSING: "errors.patchMissing",
    INSERT_MISSING: "errors.insertMissing",
    PKG_POSITION_INVALID: "errors.pkgPosition",
    CONFIG_INVALID: "errors.config",
    CONFIG_NONE_REQUIRES_SETTINGS_CARD: "errors.configNone",
    UNRESOLVED_PLACEHOLDER: "errors.unresolvedPlaceholder",
    UNKNOWN_TARGET: "cli.errUnknownTarget",
    SCENARIO_REQUIRES_TEMPLATE: "cli.errScenarioNeedsTemplate",
    CASE_NOT_FOUND: "cli.errCaseNotFound",
    UNKNOWN_SCENARIO: "cli.errUnknownScenario",
    DIR_EXISTS: "cli.dirExists",
    CHECK_FAILED: "cli.errCheckFailed",
    CASE_FLAG_INAPPLICABLE: "cli.warnCaseInapplicable",
    TOOL_NAME_IGNORED: "cli.warnToolNameIgnored",
    LANG_INVALID: "errors.errInvalidLang",
    ATOM_UNKNOWN: "errors.errAtomUnknown",
    EVENT_DOMAIN_UNKNOWN: "errors.errEventDomainUnknown",
    UI_SURFACE_UNKNOWN: "errors.errUiSurfaceUnknown",
    SEAM_UNKNOWN: "errors.errSeamUnknown",
    SURFACE_REQUIRES_ATOM: "errors.errSurfaceRequiresAtom",
    OVERRIDE_WITHOUT_TEMPLATE: "cli.warnOverride",
};

/** 错误插值参数(值随 code 而定,只放「与语言无关的事实」) */
export type ErrorParams = Record<string, string | number>;

/**
 * 领域错误:带稳定 code 的异常。
 * message 由调用方用 t(LOCALE_KEY[code], params) 渲染(CLI 层做),此处不预渲染——
 * 预渲染会把语言选择固化在抛错瞬间,多层调用链里容易出错语言。
 */
export class DshpError extends Error {
    /** 稳定错误码(程序按它分支) */
    readonly code: ErrorCode;
    /** 文案插值参数(与语言无关的事实) */
    readonly params: ErrorParams;

    constructor(code: ErrorCode, params: ErrorParams = {}) {
        super(`${code}${Object.keys(params).length ? ` ${JSON.stringify(params)}` : ""}`);
        this.name = "DshpError";
        this.code = code;
        this.params = params;
    }
}

/** 类型守卫:判断未知值是否为 DshpError */
export function isDshpError(err: unknown): err is DshpError {
    return err instanceof DshpError;
}
