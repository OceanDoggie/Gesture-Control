/**
 * useI18n Hook
 * 在 React 组件中使用国际化文案
 */

import { useMemo } from "react";
import { t } from "../i18n";

/**
 * 获取国际化文案的 Hook
 * @returns 当前语言的翻译字典
 */
export function useI18n() {
  return useMemo(() => t(), []);
}




