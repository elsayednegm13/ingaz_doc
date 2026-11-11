#!/usr/bin/env node
/**
 * W1-G4: independent TypeScript check for e2e/**.
 *
 * e2e/** is not part of any tsconfig project reference, so `tsc -b` never
 * type-checks it. This script builds a dedicated program with the same strict
 * options used elsewhere in the repo and reports diagnostics without emitting
 * or rewriting any tsconfig.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const config = {
  compilerOptions: {
    target: "ES2023",
    lib: ["ES2023", "DOM"],
    module: "ESNext",
    moduleResolution: "bundler",
    types: ["node"],
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: true,
    moduleDetection: "force",
    noEmit: true,
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    allowJs: true,
    checkJs: false,
  },
  include: ["e2e/**/*.ts", "playwright.config.ts"],
};

const parsed = ts.parseJsonConfigFileContent(
  config,
  ts.sys,
  projectRoot,
  undefined,
  path.join(projectRoot, "tsconfig.e2e-check.json"),
);

const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: undefined });
const diagnostics = ts.getPreEmitDiagnostics(program);
const host = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => projectRoot,
  getNewLine: () => "\n",
};

const files = parsed.fileNames.map((file) => path.relative(projectRoot, file)).sort();
if (!diagnostics.length) {
  console.log(JSON.stringify({ outcome: "PASS", files, diagnostics: 0 }, null, 2));
  process.exit(0);
}

console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
console.log(
  JSON.stringify(
    {
      outcome: errors.length ? "FAIL" : "PASS_WITH_WARNINGS",
      files,
      diagnostics: diagnostics.length,
      errors: errors.length,
    },
    null,
    2,
  ),
);
process.exit(errors.length ? 1 : 0);
