export type TaskCategory = "geodata" | "database" | "experiences" | "quality";

export interface EvalVerificationResult {
  pass: boolean;
  score: number; // 0 to 100
  message: string;
  details?: Record<string, any>;
}

export interface EvalTask {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  instructions: string;
  expectedOutcome: string;
  verify: () => Promise<EvalVerificationResult>;
}

export interface TaskRunSummary {
  taskId: string;
  title: string;
  category: TaskCategory;
  pass: boolean;
  score: number;
  durationMs: number;
  message: string;
  details?: Record<string, any>;
}

export interface EvalSuiteReport {
  timestamp: string;
  totalTasks: number;
  passedTasks: number;
  failedTasks: number;
  averageScore: number;
  totalDurationMs: number;
  results: TaskRunSummary[];
}
