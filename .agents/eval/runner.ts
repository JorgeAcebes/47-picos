import fs from "fs";
import path from "path";
import { evalTasks } from "./tasks";
import { EvalSuiteReport, TaskRunSummary } from "./types";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  dim: "\x1b[2m",
};

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
${colors.bright}47 Picos — Agent Evaluation & Benchmark Runner${colors.reset}

Usage:
  npx tsx harness/eval/runner.ts [options]

Options:
  --list               List all available evaluation tasks
  --task=<id>          Run a specific evaluation task by id
  --category=<cat>     Run all evaluation tasks in a specific category (geodata, database, experiences, quality)
  --report             Generate Markdown benchmark report in harness/eval/reports/
  --help, -h           Show this help message
`);
    process.exit(0);
  }

  if (args.includes("--list")) {
    console.log(`\n${colors.bright}Available Evaluation Tasks:${colors.reset}\n`);
    for (const t of evalTasks) {
      console.log(`  ${colors.cyan}${t.id.padEnd(30)}${colors.reset} [${t.category.toUpperCase().padEnd(11)}] ${t.title}`);
      console.log(`  ${colors.dim}${t.description}${colors.reset}\n`);
    }
    process.exit(0);
  }

  // Filter tasks if requested
  let tasksToRun = evalTasks;
  const taskArg = args.find((a) => a.startsWith("--task="));
  if (taskArg) {
    const taskId = taskArg.split("=")[1];
    tasksToRun = evalTasks.filter((t) => t.id === taskId);
    if (tasksToRun.length === 0) {
      console.error(`${colors.red}Error: Task '${taskId}' not found. Use --list to see tasks.${colors.reset}`);
      process.exit(1);
    }
  }

  const categoryArg = args.find((a) => a.startsWith("--category="));
  if (categoryArg) {
    const category = categoryArg.split("=")[1];
    tasksToRun = evalTasks.filter((t) => t.category === category);
    if (tasksToRun.length === 0) {
      console.error(`${colors.red}Error: No tasks found for category '${category}'.${colors.reset}`);
      process.exit(1);
    }
  }

  console.log(`\n${colors.bright}================================================================${colors.reset}`);
  console.log(`${colors.bright}  47 PICOS — AGENT EVALUATION & BENCHMARK HARNESS               ${colors.reset}`);
  console.log(`${colors.bright}================================================================${colors.reset}\n`);
  console.log(`Executing ${tasksToRun.length} evaluation tasks...\n`);

  const runSummaries: TaskRunSummary[] = [];
  const startSuite = Date.now();

  for (const task of tasksToRun) {
    process.stdout.write(`  ▶ [${task.category.toUpperCase().padEnd(11)}] ${colors.bright}${task.title}${colors.reset}... `);
    const startTask = Date.now();
    try {
      const res = await task.verify();
      const durationMs = Date.now() - startTask;

      runSummaries.push({
        taskId: task.id,
        title: task.title,
        category: task.category,
        pass: res.pass,
        score: res.score,
        durationMs,
        message: res.message,
        details: res.details,
      });

      if (res.pass) {
        console.log(`${colors.green}✓ PASS${colors.reset} (Score: ${res.score}/100) ${colors.dim}${durationMs}ms${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset} (Score: ${res.score}/100) ${colors.dim}${durationMs}ms${colors.reset}`);
        console.log(`    ${colors.yellow}Issue: ${res.message}${colors.reset}`);
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTask;
      runSummaries.push({
        taskId: task.id,
        title: task.title,
        category: task.category,
        pass: false,
        score: 0,
        durationMs,
        message: err.message || String(err),
      });
      console.log(`${colors.red}✗ ERROR${colors.reset} ${colors.dim}${durationMs}ms${colors.reset}`);
      console.error(`    ${colors.red}${err.message || String(err)}${colors.reset}`);
    }
  }

  const totalDurationMs = Date.now() - startSuite;
  const passedCount = runSummaries.filter((r) => r.pass).length;
  const failedCount = runSummaries.length - passedCount;
  const totalScore = runSummaries.reduce((sum, r) => sum + r.score, 0);
  const avgScore = Math.round(totalScore / runSummaries.length);

  console.log(`\n${colors.bright}----------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}  BENCHMARK SUMMARY                                             ${colors.reset}`);
  console.log(`${colors.bright}----------------------------------------------------------------${colors.reset}`);
  console.log(`  Total Tasks : ${runSummaries.length}`);
  console.log(`  Passed      : ${colors.green}${passedCount}${colors.reset}`);
  console.log(`  Failed      : ${failedCount > 0 ? colors.red : colors.green}${failedCount}${colors.reset}`);
  console.log(`  Avg Score   : ${avgScore >= 80 ? colors.green : colors.yellow}${avgScore}/100${colors.reset}`);
  console.log(`  Total Time  : ${totalDurationMs}ms`);
  console.log(`${colors.bright}----------------------------------------------------------------${colors.reset}\n`);

  // Generate Markdown report if requested or default
  if (args.includes("--report") || true) {
    const reportDir = path.resolve(__dirname, "./reports");
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const reportPath = path.join(reportDir, "benchmark-report.md");
    const reportJsonPath = path.join(reportDir, "benchmark-report.json");

    const suiteReport: EvalSuiteReport = {
      timestamp: new Date().toISOString(),
      totalTasks: runSummaries.length,
      passedTasks: passedCount,
      failedTasks: failedCount,
      averageScore: avgScore,
      totalDurationMs,
      results: runSummaries,
    };

    fs.writeFileSync(reportJsonPath, JSON.stringify(suiteReport, null, 2), "utf-8");

    const mdContent = `# 47 Picos — Agent Evaluation Benchmark Report

**Generated at**: ${suiteReport.timestamp}  
**Overall Status**: ${failedCount === 0 ? "✅ PASSED" : "❌ FAILED"}  
**Average Score**: ${avgScore}/100  
**Execution Duration**: ${(totalDurationMs / 1000).toFixed(2)}s  

## Task Performance Table

| Task ID | Title | Category | Status | Score | Time | Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
${runSummaries
  .map(
    (r) =>
      `| \`${r.taskId}\` | ${r.title} | \`${r.category}\` | ${r.pass ? "✅ PASS" : "❌ FAIL"} | ${r.score}/100 | ${r.durationMs}ms | ${r.message.replace(/\|/g, "/")} |`
  )
  .join("\n")}

## Diagnostic Details

${runSummaries
  .filter((r) => !r.pass || r.score < 100)
  .map(
    (r) => `### ⚠️ ${r.title} (\`${r.taskId}\`)
- **Category**: ${r.category}
- **Score**: ${r.score}/100
- **Message**: ${r.message}
${r.details ? `\`\`\`json\n${JSON.stringify(r.details, null, 2)}\n\`\`\`` : ""}
`
  )
  .join("\n") || "_All evaluation checks scored 100%._"}
`;

    fs.writeFileSync(reportPath, mdContent, "utf-8");
    console.log(`  📄 Report generated: ${colors.cyan}${reportPath}${colors.reset}\n`);
  }

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Evaluation failed fatally:", err);
  process.exit(1);
});
