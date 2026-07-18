const ansiPattern =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/gu;

export function stripAnsi(value) {
  return value.replace(ansiPattern, "");
}

export function parseVitestSummary(output) {
  const plain = stripAnsi(output);
  const files = plain.match(/Test Files\s+(\d+)\s+passed/u);
  const tests = plain.match(/Tests\s+(\d+)\s+passed/u);
  if (files?.[1] === undefined || tests?.[1] === undefined) {
    throw new Error("Could not parse the Vitest pass summary.");
  }
  return {
    testFiles: Number.parseInt(files[1], 10),
    tests: Number.parseInt(tests[1], 10),
  };
}
