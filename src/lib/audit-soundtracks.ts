import { seedTemplates, BUILTIN_SOUNDTRACK_REVISION } from "./templates";
import { analyzeSession } from "@/format/protocol-analyzer";
import { compareToReference } from "@/format/protocol-reference";
import { signalMapText } from "@/format/channel-map";

let failures = 0;
console.log(
  `ENTRAIN built-in soundtrack audit · ${BUILTIN_SOUNDTRACK_REVISION}`,
);

for (const template of seedTemplates) {
  const analysis = analyzeSession(template.session);
  const ref = compareToReference(
    template.session,
    template.lineage?.referenceId,
  );
  const hardIssues = analysis.issues.filter((issue) => issue.level === "error");
  const refErrors = ref?.deviations.filter((d) => d.level === "error") || [];
  const status = hardIssues.length || refErrors.length ? "FAIL" : "OK";
  if (status === "FAIL") failures++;
  console.log(`\n${status} /${template.slug} · ${template.title}`);
  console.log(
    `  pattern: ${template.session.durationMin}m · ${template.session.layers.length} layers · loop ${template.session.loop?.mode || "hold-last"}`,
  );
  console.log(
    `  analyzer: ${analysis.mixStatus} · peak ${analysis.estimatedPeakDb.toFixed(1)} dBFS · issues ${analysis.issues.length}`,
  );
  if (ref)
    console.log(
      `  reference: ${ref.referenceId} · ${ref.matches ? "matches" : "differs"} · score ${ref.score}/100 · deviations ${ref.deviations.length}`,
    );
  for (const issue of hardIssues)
    console.log(`  ERROR analyzer/${issue.code}: ${issue.message}`);
  for (const dev of refErrors)
    console.log(`  ERROR reference/${dev.code}: ${dev.message}`);
  if (process.argv.includes("--signals")) {
    console.log(
      signalMapText(template.session)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
    );
  }
}

if (failures) {
  console.error(
    `\nAudit failed: ${failures} built-in soundtrack(s) have hard analyzer/reference errors.`,
  );
  process.exit(1);
}
console.log(
  "\nAudit passed: all built-in soundtracks are analyzer-clean and match declared references.",
);
