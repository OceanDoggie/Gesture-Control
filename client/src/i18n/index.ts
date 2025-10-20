/**
 * i18n 入口文件
 * 目前只支持英文，未来可扩展多语言
 */

import { en } from "./en";

export type TDict = typeof en;

// 当前语言字典（目前固定为英文）
let dict: TDict = en;

/**
 * 获取当前语言字典
 * @returns 当前语言的翻译字典
 */
export function t(): TDict {
  return dict;
}

// 导出英文字典，供直接使用
export { en };




