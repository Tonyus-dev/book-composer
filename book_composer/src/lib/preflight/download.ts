import type { PreflightReport } from "./types";
import { reportToHtml, reportToJson } from "./report";

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadPreflightJson(report: PreflightReport) {
  download("preflight-report.json", reportToJson(report), "application/json");
}

export function downloadPreflightHtml(report: PreflightReport) {
  download("preflight-report.html", reportToHtml(report), "text/html");
}
