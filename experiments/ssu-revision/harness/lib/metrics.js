import fs from "node:fs";

/**
 * Reads the lines appended to a growing file since the reader was created
 * (or from the beginning of the file with fromStart).
 */
export function tailLines(file, { fromStart = false } = {}) {
  let offset = !fromStart && fs.existsSync(file) ? fs.statSync(file).size : 0;
  let remainder = "";
  return () => {
    if (!fs.existsSync(file)) return [];
    const size = fs.statSync(file).size;
    if (size <= offset) return [];
    const buffer = Buffer.alloc(size - offset);
    const fd = fs.openSync(file, "r");
    fs.readSync(fd, buffer, 0, buffer.length, offset);
    fs.closeSync(fd);
    offset = size;
    const lines = (remainder + buffer.toString("utf8")).split("\n");
    remainder = lines.pop();
    return lines.map((line) => line.replace(/\r$/, ""));
  };
}

/** Splits one CSV line, honouring double-quoted cells with doubled quotes. */
export function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        cell += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += c;
    }
  }
  cells.push(cell);
  return cells;
}

export function readCsv(file) {
  const [header, ...lines] = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const columns = parseCsvLine(header);
  return lines.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, i) => [column, cells[i]]));
  });
}

/** One row of the lifecycle service's event log (see backend/src/TimestampLogger.js). */
export function parseLifecycleEvent(line) {
  const [ts, component, event, workflowId, thingId, packageName, stage, detail] = parseCsvLine(line);
  if (!ts || ts === "ts") return null;
  let parsedDetail = null;
  if (detail) {
    try {
      parsedDetail = JSON.parse(detail);
    } catch {
      parsedDetail = detail;
    }
  }
  return {
    ts: Number(ts),
    component,
    event,
    workflowId,
    thingId,
    packageName,
    stage,
    detail: parsedDetail,
  };
}

function percentileOf(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  return sortedValues[Math.max(0, Math.ceil(p * sortedValues.length) - 1)];
}

/**
 * Fleet- and device-level convergence metrics of one run.
 * writes: [{ thingId, startedAt, finishedAt }] — when each update request was issued (epoch ms)
 * completions: Map thingId -> epoch ms at which the device's update was complete
 */
export function convergenceSummary(writes, completions, targets) {
  const firstRequest = Math.min(...writes.map((w) => w.startedAt));
  const requestDone = new Map(writes.map((w) => [w.thingId, w.finishedAt]));
  const completedAt = [...completions.values()].sort((a, b) => a - b);
  const deviceLatencies = [...completions]
    .filter(([thingId]) => requestDone.has(thingId))
    .map(([thingId, ts]) => ts - requestDone.get(thingId))
    .sort((a, b) => a - b);
  const mean = deviceLatencies.length
    ? deviceLatencies.reduce((sum, v) => sum + v, 0) / deviceLatencies.length
    : null;
  const fleetTime = (fraction) => {
    const needed = Math.ceil(fraction * targets);
    return completedAt.length >= needed ? completedAt[needed - 1] - firstRequest : null;
  };
  return {
    completed: completions.size,
    complete: completions.size === targets,
    fleet50Ms: fleetTime(0.5),
    fleet95Ms: fleetTime(0.95),
    fleet100Ms: fleetTime(1),
    deviceMeanMs: mean === null ? null : Number(mean.toFixed(1)),
    deviceP50Ms: percentileOf(deviceLatencies, 0.5),
    deviceP95Ms: percentileOf(deviceLatencies, 0.95),
    deviceMaxMs: percentileOf(deviceLatencies, 1),
  };
}
