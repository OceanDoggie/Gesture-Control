/**
 * 英文语言包 - English Language Pack
 * 所有界面文案集中管理
 */

export const en = {
  // 页面级文案
  page: {
    webcamTitle: "Gesture Recognition Demo",
    webcamDesc: "Experience our AI-powered hand gesture recognition technology. Grant camera permissions to test real-time gesture detection and sign language recognition capabilities.",
  },

  // UI 元素文案
  ui: {
    title: "AI Gesture Recognition",
    startCamera: "Start Camera",
    stopCamera: "Stop",
    startRecognition: "Start Recognition",
    stopRecognition: "Stop",
    chooseTarget: "Choose a Target Gesture",
    cameraPreview: "Camera Preview",
    clickToStart: 'Click "Start Camera" to begin',
    target: (gesture: string) => `Target: ${gesture}`,
    live: "LIVE",
    
    // 拼写指导 UI
    spellingCoach: "Spelling Coach",
    selectLetter: "Select a letter (A-Z)",
    enterWord: "Enter a word to fingerspell",
    wordPlaceholder: "e.g., MONDAY",
    mode: "Mode",
    freeMode: "Free Practice",
    autoMode: "Auto Spell",
    currentLetter: "Current",
    nextLetter: "Next",
    stability: "Stability",
    wordComplete: "Word Complete!",
    letterComplete: (letter: string) => `Letter "${letter}" completed!`,
  },

  // 状态相关文案
  status: {
    title: "Status",
    systemTitle: "System Status",
    wsConnected: "WS Connected",
    connecting: "Connecting…",
    recognizing: "Recognizing",
    idle: "Idle",
    active: "Active",
    running: "Running",
    visible: "Visible",
    hidden: "Hidden",
    
    // 系统状态描述
    recognizingGesture: (gesture: string) =>
      `Recognizing gesture "${gesture}". Follow the instructions and hold your pose.`,
    cameraOnSelectGesture: 'Camera is on. Select a gesture and click "Start Recognition".',
    turnOnCamera: "Turn on the camera to enable AI recognition.",
    
    // 状态项标签
    wsStatus: "WebSocket",
    handTracking: "Hand Tracking",
    aiStatus: "AI",
    liveFeedback: "Live Feedback",
    accuracy: "Accuracy",
  },

  // 统计信息文案
  stats: {
    title: "Recognition Stats",
    totalFrames: "Total Frames",
    correctFrames: "Correct Frames",
    accuracy: "Accuracy",
    confidence: "Confidence",
    feedback: "Feedback",
    liveScore: "Live Score",
    noHandDetected: "No hand detected",
    poorQuality: "Poor quality",
    goodQuality: "Good quality",
  },

  // 手势练习提示
  tips: {
    title: (gesture: string) => `Practice Tips — ${gesture}`,
    difficultyLabel: (level: string) => `Difficulty: ${level}`,
    
    A: {
      instruction: "Make a fist with your thumb on top of other fingers",
      practiceTip: "Try making the A gesture and keep your hand steady",
      difficulty: "Easy",
    },
    B: {
      instruction: "Open your palm with fingers together",
      practiceTip: "Keep your fingers straight and palm flat",
      difficulty: "Easy",
    },
    C: {
      instruction: "Curve your fingers like you're grabbing something",
      practiceTip: "Curve your fingers in an arc, like holding a ball",
      difficulty: "Medium",
    },
    D: {
      instruction: "Extend your index finger, other fingers in a fist",
      practiceTip: "Keep index finger straight, other fingers tight",
      difficulty: "Easy",
    },
    E: {
      instruction: "Thumbs up, other fingers in a fist",
      practiceTip: "Thumb pointing up, other fingers tight",
      difficulty: "Easy",
    },
  },

  // 难度级别
  difficulty: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  },

  // 错误提示
  error: {
    wsConnectionFailed:
      "WebSocket connection failed. Please ensure the backend is running on port 4000 with path /ws/gesture.",
    wsClosedUnexpectedly:
      "WebSocket closed unexpectedly. Please check:\n• Backend is running on port 4000\n• Path is /ws/gesture",
    cameraAccessFailed: "Unable to access camera. Please check permissions and try again.",
    selectGestureFirst: "Please select a gesture first.",
    connectingToAI: "Connecting to AI service, please wait...",
    wsWaitFailed: "WebSocket connection failed. Please make sure the backend is running.",
    enterWordFirst: "Please enter a word first (e.g., MONDAY).",
    invalidWord: "Please enter a valid word (only letters A-Z).",
  },
} as const;

// 导出类型定义，方便 TypeScript 类型推断
export type EnDict = typeof en;

