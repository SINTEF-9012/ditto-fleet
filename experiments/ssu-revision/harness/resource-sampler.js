// Records the CPU and memory use of every running container through the Docker Engine API, about once
// per second, until SIGTERM. It runs in a container on the Docker host, so its timestamps share the
// clock of all other measurements. Needs the Docker socket mounted at /var/run/docker.sock.
import fs from "node:fs";
import http from "node:http";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    out: { type: "string" },
    socket: { type: "string", default: "/var/run/docker.sock" },
  },
});

const isNew = !fs.existsSync(args.out) || fs.statSync(args.out).size === 0;
const out = fs.createWriteStream(args.out, { flags: "a" });
if (isNew) out.write("ts,container,cpuPercent,memBytes\n");

function getJson(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ socketPath: args.socket, path }, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

/** CPU use in percent of one core, computed as `docker stats` does, and memory use without the page cache. */
function usage(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  if (!stats.precpu_stats.system_cpu_usage || !(systemDelta > 0)) return null;
  const memory = stats.memory_stats ?? {};
  const cache = memory.stats?.inactive_file ?? memory.stats?.total_inactive_file ?? 0;
  return {
    cpuPercent: (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100,
    memBytes: Math.max(0, (memory.usage ?? 0) - cache),
  };
}

const followed = new Map();

function follow(id, name) {
  const request = http.get({ socketPath: args.socket, path: `/containers/${id}/stats?stream=true` }, (response) => {
    let buffer = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        if (!line) continue;
        let sample;
        try {
          sample = usage(JSON.parse(line));
        } catch {
          continue;
        }
        if (sample) out.write(`${Date.now()},${name},${sample.cpuPercent.toFixed(1)},${sample.memBytes}\n`);
      }
    });
    response.on("end", () => followed.delete(id));
  });
  request.on("error", () => followed.delete(id));
  followed.set(id, request);
}

async function discover() {
  for (const container of await getJson("/containers/json")) {
    if (!followed.has(container.Id)) follow(container.Id, container.Names[0].replace(/^\//, ""));
  }
}

await discover();
const timer = setInterval(() => discover().catch(() => {}), 2000);
process.on("SIGTERM", () => {
  clearInterval(timer);
  for (const request of followed.values()) request.destroy();
  out.end(() => process.exit(0));
});
console.log("resource sampler started");
