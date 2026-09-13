import { spawn } from "node:child_process";

/**
 * Runs a shell command on the managed system: either locally, or inside the
 * namespaces of the target process (the gateway) when the agent runs in its own container.
 */
export function runInTarget(
  command,
  { mode = "local", targetPid = "1", env = {}, timeoutMs = 600000 } = {},
) {
  const argv =
    mode === "nsenter"
      ? ["nsenter", "-t", String(targetPid), "-m", "-u", "-i", "-n", "-p", "--", "sh", "-c", command]
      : ["sh", "-c", command];
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), {
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}${err.message}` });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        code: code ?? -1,
        stdout,
        stderr: signal ? `${stderr}killed by ${signal}` : stderr,
      });
    });
  });
}
