import { render } from "tradjs/client";

type Report = any;
let adminToken = localStorage.getItem("entrain:admin-token") || "";
let report: Report | null = null;
let message = "Enter ADMIN_TOKEN and load the audit.";
let busy = false;
let includeSignals = false;
let expanded: Record<string, boolean> = {};

function App() {
  const totals = report?.totals;
  return (
    <div className="panel">
      <div className="toolbar">
        <div>
          <strong>Reference / safety audit</strong>
          <div className="small">{message}</div>
          {totals ? (
            <div className="tagrow" style={{ marginTop: "8px" }}>
              <span className="pill">rows {totals.rows}</span>
              <span className="pill unlocked">ok {totals.ok}</span>
              <span className="pill">warn {totals.warn}</span>
              <span className="pill gate">fail {totals.fail}</span>
              <span className="pill">gated {totals.gated}</span>
              <span className="pill">free {totals.free}</span>
            </div>
          ) : null}
        </div>
        <div className="tagrow">
          <input
            style={{ width: "220px" }}
            type="password"
            placeholder="ADMIN_TOKEN"
            value={adminToken}
            onInput={(e: any) => {
              adminToken = e.currentTarget.value;
              localStorage.setItem("entrain:admin-token", adminToken);
            }}
          />
          <label className="pill">
            <input
              type="checkbox"
              checked={includeSignals}
              onChange={(e: any) => {
                includeSignals = !!e.currentTarget.checked;
                paint();
              }}
            />{" "}
            include signal maps
          </label>
          <button className="btn primary" disabled={busy} onClick={loadAudit}>
            Load audit
          </button>
          <button className="btn" disabled={!report} onClick={copyJson}>
            Copy JSON
          </button>
        </div>
      </div>

      {report ? (
        <table className="matrix" style={{ marginTop: "14px" }}>
          <thead>
            <tr>
              <th>Verdict</th>
              <th>Soundtrack</th>
              <th>Gate</th>
              <th>Pattern</th>
              <th>Reference</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r: any) => (
              <AuditRow row={r} key={r.slug} />
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function AuditRow({ row }: { row: any }) {
  const isOpen = !!expanded[row.slug];
  const ref = row.referenceMatch;
  const gate = row.minTokens ? `${row.minTokens} $ENTRAIN` : "free";
  const issueText =
    [...(row.blockers || []), ...(row.warnings || [])].join(" · ") || "none";
  return (
    <>
      <tr>
        <td>
          <span
            className={
              row.verdict === "ok"
                ? "pill unlocked"
                : row.verdict === "fail"
                  ? "pill gate"
                  : "pill"
            }
          >
            {row.verdict}
          </span>
        </td>
        <td>
          <strong>{row.title}</strong>
          <br />
          <span className="small">
            /{row.slug} · {row.status} · {row.category}
          </span>
        </td>
        <td>
          {gate}
          <br />
          <span className="small">{row.tier}</span>
        </td>
        <td>
          <span className="mono">{row.patternHash}</span>
          {row.hashDrift ? (
            <>
              <br />
              <span className="small warn">stored hash stale</span>
            </>
          ) : null}
          <br />
          <span className="small">
            {row.signalMapSummary.durationMin}m ·{" "}
            {row.signalMapSummary.layerCount} layers ·{" "}
            {row.signalMapSummary.headphonesRequired
              ? "headphones"
              : "speaker-safe"}
          </span>
        </td>
        <td>
          {ref ? (
            <>
              {ref.matches ? "matches" : "differs"} · {ref.score}/100
              <br />
              <span className="small">{ref.referenceId}</span>
            </>
          ) : (
            <span className="small">none</span>
          )}
        </td>
        <td>
          {issueText}
          <br />
          <button
            className="btn"
            style={{ marginTop: "6px" }}
            onClick={() => {
              expanded[row.slug] = !expanded[row.slug];
              paint();
            }}
          >
            {isOpen ? "Hide details" : "Details"}
          </button>
        </td>
      </tr>
      {isOpen ? (
        <tr>
          <td colSpan={6}>
            <div className="notice">
              <strong>Analyzer</strong>
              <p className="small">
                {row.analysis.mixStatus} · peak{" "}
                {row.analysis.estimatedPeakDb.toFixed(1)} dBFS · RMS{" "}
                {row.analysis.estimatedRmsDb.toFixed(1)} dBFS · max beat{" "}
                {row.analysis.maxBeatHz} Hz
              </p>
              {row.analysis.issues?.length ? (
                <ul className="small">
                  {row.analysis.issues.map((i: any) => (
                    <li key={i.code + i.message}>
                      {i.level}: {i.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small">No analyzer issues.</p>
              )}
              {row.claimRisk?.risky ? (
                <p className="small warn">
                  Claim-risk hits: {row.claimRisk.hits.join(", ")}
                </p>
              ) : (
                <p className="small">No claim-risk hits.</p>
              )}
              {ref?.deviations?.length ? (
                <>
                  <strong>Reference deviations</strong>
                  <ul className="small">
                    {ref.deviations.map((d: any) => (
                      <li key={d.code + d.message}>
                        {d.level}: {d.message}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {row.signalMapText ? (
                <pre
                  className="mono"
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "12px",
                    overflowX: "auto",
                  }}
                >
                  {row.signalMapText}
                </pre>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

async function loadAudit() {
  busy = true;
  message = "loading audit…";
  paint();
  try {
    const qs = includeSignals ? "?signals=1" : "";
    const res = await fetch("/api/admin/audit" + qs, {
      headers: { "x-admin-token": adminToken },
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error || "audit failed");
    report = res.report;
    message = `audit generated ${new Date(report.generatedAt).toLocaleString()}`;
  } catch (e: any) {
    message = e.message || "audit failed";
  }
  busy = false;
  paint();
}
async function copyJson() {
  if (!report) return;
  await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  message = "copied audit JSON";
  paint();
}
function paint() {
  render(<App />, document.getElementById("admin-audit-root")!);
}
export default function mount() {
  paint();
  return () => render(null, document.getElementById("admin-audit-root")!);
}
