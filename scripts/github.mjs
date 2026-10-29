// Repository-scoped Pages administration. Git credentials stay in memory.
import { spawnSync } from "node:child_process";
const repo = "oyueo-mm/TicTacToeAI";
const command = process.argv[2] ?? "status";
if (!["status", "pages", "enable-pages"].includes(command))
  throw new Error("Unsupported command");
const credential = spawnSync("git", ["credential", "fill"], {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
  windowsHide: true,
});
if (credential.status !== 0)
  throw new Error("GitHub authentication is unavailable");
const token = credential.stdout
  .split(/\r?\n/)
  .find((s) => s.startsWith("password="))
  ?.slice(9);
if (!token) throw new Error("GitHub authentication is unavailable");
async function api(path, method = "GET", body) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && method === "GET") return null;
    throw new Error(`GitHub ${response.status}: ${data.message}`);
  }
  return data;
}
if (command === "enable-pages") {
  const existing = await api("/pages");
  if (!existing) await api("/pages", "POST", { build_type: "workflow" });
  else if (existing.build_type !== "workflow")
    await api("/pages", "PUT", { build_type: "workflow" });
  console.log(JSON.stringify({ pages: await api("/pages") }, null, 2));
} else if (command === "pages")
  console.log(JSON.stringify(await api("/pages"), null, 2));
else {
  const runs = await api("/actions/runs?per_page=3");
  console.log(
    JSON.stringify(
      {
        runs: runs?.workflow_runs?.map((r) => ({
          id: r.id,
          sha: r.head_sha,
          status: r.status,
          conclusion: r.conclusion,
          url: r.html_url,
        })),
        pages: await api("/pages"),
      },
      null,
      2,
    ),
  );
}
