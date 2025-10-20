/**
 * useSpellingCoach Hook
 * 管理 26 字母拼写指导功能
 * 
 * 功能:
 * - 支持两种模式：Free（自由练习）和 Auto（自动拼写）
 * - 自动拼写模式：按单词顺序依次练习字母
 * - 稳定性门槛：score >= 阈值 且连续 N 帧，自动进入下一字母
 * - 提供当前字母、下一字母、稳定帧计数、进度等信息
 */

import { useState, useEffect, useCallback } from "react";
import { LETTERS } from "../constants/letters"; // 导入字母常量

// 模式类型
export type SpellingMode = "free" | "auto";

interface UseSpellingCoachOptions {
  scoreThreshold?: number;  // 分数阈值（默认 75）
  stableFrames?: number;    // 稳定帧数（默认 10）
}

interface UseSpellingCoachReturn {
  // 状态
  mode: SpellingMode;
  currentLetter: string;
  nextLetter: string | null;
  word: string;
  stableCount: number;
  progress: number;  // 当前字母在单词中的进度（0-100）
  isComplete: boolean;

  // 操作
  setMode: (mode: SpellingMode) => void;
  setWord: (word: string) => void;
  setCurrentLetter: (letter: string) => void;
  updateStability: (score: number, predicted: string | null) => void;  // 每帧调用，更新稳定性
  reset: () => void;
}

export function useSpellingCoach(
  options: UseSpellingCoachOptions = {}
): UseSpellingCoachReturn {
  const {
    scoreThreshold = 75,
    stableFrames = 10,
  } = options;

  const [mode, setMode] = useState<SpellingMode>("free");
  const [currentLetter, setCurrentLetter] = useState<string>("A");
  const [word, setWord] = useState<string>("");
  const [wordIndex, setWordIndex] = useState<number>(0);  // 当前在单词中的位置
  const [stableCount, setStableCount] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // 从单词中提取字母序列（仅保留 A-Z）
  const wordLetters = word
    .toUpperCase()
    .split("")
    .filter((c) => /[A-Z]/.test(c));

  // 计算下一个字母
  const nextLetter = mode === "auto" && wordIndex < wordLetters.length - 1
    ? wordLetters[wordIndex + 1]
    : null;

  // 计算进度（0-100）
  const progress = mode === "auto" && wordLetters.length > 0
    ? Math.round((stableCount / stableFrames) * 100)
    : 0;

  /**
   * 更新稳定性（每帧调用）
   * @param score 当前帧分数
   * @param predicted 预测的手势
   */
  const updateStability = useCallback(
    (score: number, predicted: string | null) => {
      // 检查是否匹配当前目标字母且分数达标
      if (predicted === currentLetter && score >= scoreThreshold) {
        setStableCount((prev) => Math.min(prev + 1, stableFrames));
      } else {
        setStableCount(0);  // 不匹配或分数不达标，重置计数
      }
    },
    [currentLetter, scoreThreshold, stableFrames]
  );

  /**
   * 监听稳定计数，达到阈值时自动进入下一字母（仅在 Auto 模式）
   */
  useEffect(() => {
    if (mode !== "auto" || stableCount < stableFrames) return;

    // 达到稳定帧数
    if (wordIndex < wordLetters.length - 1) {
      // 进入下一个字母
      setWordIndex((prev) => prev + 1);
      setCurrentLetter(wordLetters[wordIndex + 1]);
      setStableCount(0);  // 重置稳定计数
      console.log(`✅ Letter "${currentLetter}" completed! Next: ${wordLetters[wordIndex + 1]}`);
    } else {
      // 单词拼写完成
      setIsComplete(true);
      console.log(`🎉 Word "${word}" complete!`);
    }
  }, [stableCount, stableFrames, mode, wordIndex, wordLetters, currentLetter, word]);

  /**
   * 切换模式时重置状态
   */
  useEffect(() => {
    if (mode === "auto") {
      // 切换到 Auto 模式：从第一个字母开始
      if (wordLetters.length > 0) {
        setWordIndex(0);
        setCurrentLetter(wordLetters[0]);
        setStableCount(0);
        setIsComplete(false);
      }
    } else {
      // 切换到 Free 模式：重置状态
      setWordIndex(0);
      setStableCount(0);
      setIsComplete(false);
    }
  }, [mode, word]);  // 依赖 mode 和 word

  /**
   * 重置所有状态
   */
  const reset = useCallback(() => {
    setMode("free");
    setCurrentLetter("A");
    setWord("");
    setWordIndex(0);
    setStableCount(0);
    setIsComplete(false);
  }, []);

  return {
    // 状态
    mode,
    currentLetter,
    nextLetter,
    word,
    stableCount,
    progress,
    isComplete,

    // 操作
    setMode,
    setWord,
    setCurrentLetter,
    updateStability,
    reset,
  };
}



