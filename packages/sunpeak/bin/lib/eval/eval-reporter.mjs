/**
 * Custom vitest reporter for eval results.
 *
 * Parses __SUNPEAK_EVAL__ log lines from test console output and prints
 * a statistical summary with pass/fail counts per model per case.
 */

const EVAL_PREFIX = '__SUNPEAK_EVAL__';

export default class EvalReporter {
  /** @type {import('./eval-types.d.mts').EvalCaseResult[]} */
  results = [];
  /** @type {boolean} */
  printed = false;

  /**
   * Called for each console.log from test code.
   * @param {{ content: string, type: 'stdout' | 'stderr' }} log
   */
  onUserConsoleLog(log) {
    if (log.type !== 'stdout') return;
    const idx = log.content.indexOf(EVAL_PREFIX);
    if (idx === -1) return;

    try {
      const json = log.content.slice(idx + EVAL_PREFIX.length);
      const data = JSON.parse(json);
      if (data.type === 'eval-result') {
        this.results.push(data);
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Called when the test run ends (vitest v4+).
   */
  onTestRunEnd() {
    this.printSummary();
  }

  /**
   * Fallback for older vitest versions.
   */
  onFinished() {
    this.printSummary();
  }

  printSummary() {
    if (this.results.length === 0 || this.printed) return;
    this.printed = true;

    console.log('\n' + '='.repeat(60));
    console.log('Eval Results');
    console.log('='.repeat(60));

    // Group by case name
    const byCase = new Map();
    for (const r of this.results) {
      if (!byCase.has(r.caseName)) byCase.set(r.caseName, []);
      byCase.get(r.caseName).push(r);
    }

    let totalPassed = 0;
    let totalRuns = 0;

    for (const [caseName, caseResults] of byCase) {
      console.log(`\n  ${caseName}`);

      const maxLen = Math.max(...caseResults.map((r) => r.modelId.length));

      for (const r of caseResults) {
        totalPassed += r.passed;
        totalRuns += r.runs;

        const pct = (r.passRate * 100).toFixed(0);
        const avgMs = r.avgDurationMs.toFixed(0);
        const status =
          r.passRate === 1
            ? '\x1b[32m\u2713\x1b[0m'
            : r.passRate >= 0.8
              ? '\x1b[33m~\x1b[0m'
              : '\x1b[31m\u2717\x1b[0m';

        console.log(
          `    ${status} ${r.modelId.padEnd(maxLen)}  ${r.passed}/${r.runs} passed (${pct}%)  avg ${avgMs}ms`
        );

        if (r.failures.length > 0) {
          for (const f of r.failures) {
            console.log(`      \x1b[2m\u2514 ${f.error} (${f.count}x)\x1b[0m`);
          }
        }
      }
    }

    const totalPct = totalRuns > 0 ? ((totalPassed / totalRuns) * 100).toFixed(0) : 0;
    const modelCount = new Set(this.results.map((r) => r.modelId)).size;
    console.log(
      `\n  Summary: ${totalPassed}/${totalRuns} passed (${totalPct}%) across ${modelCount} model(s)`
    );
    console.log('='.repeat(60) + '\n');
  }
}
