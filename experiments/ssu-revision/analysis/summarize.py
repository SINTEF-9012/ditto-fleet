#!/usr/bin/env python3
"""Summarises the raw results of the SSU revision experiments (E0-E4).

Reads the files in results/raw/ (bulky ones gzip-compressed by analysis/pack_raw.py) and writes to
results/summary/:
  *.csv  summary tables (mean, sample standard deviation, median, p95, min, max)
  *.dat  whitespace-separated tables for pgfplots
Warm-up runs are excluded everywhere. Only the Python standard library is used,
and the output depends only on the raw files, so re-running reproduces it exactly.
"""

import bisect
import csv
import gzip
import json
import math
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "results" / "raw"
OUT = ROOT / "results" / "summary"
STAT_COLUMNS = ["n", "mean", "sd", "median", "p95", "min", "max"]


def raw_exists(name):
    return (RAW / name).exists() or (RAW / f"{name}.gz").exists()


def open_raw(name):
    """A raw result file, stored as is or gzip-compressed as name.gz."""
    if (RAW / name).exists():
        return open(RAW / name, newline="", encoding="utf-8")
    return gzip.open(RAW / f"{name}.gz", "rt", newline="", encoding="utf-8")


def read_csv(name):
    with open_raw(name) as handle:
        return list(csv.DictReader(handle))


def num(value):
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(result) else result


def describe(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return {column: None for column in STAT_COLUMNS}
    return {
        "n": len(values),
        "mean": round(statistics.fmean(values), 1),
        "sd": round(statistics.stdev(values), 1) if len(values) > 1 else 0.0,
        "median": round(statistics.median(values), 1),
        "p95": round(values[max(0, math.ceil(0.95 * len(values)) - 1)], 1),
        "min": round(values[0], 1),
        "max": round(values[-1], 1),
    }


def write_csv(name, rows, columns):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_dat(name, rows, columns):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, "w", encoding="utf-8") as handle:
        handle.write(" ".join(columns) + "\n")
        for row in rows:
            handle.write(" ".join("nan" if row.get(c) is None else str(row[c]) for c in columns) + "\n")


def not_warmup(row):
    return row.get("warmup", "false") != "true"


def epoch_ms(iso):
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000


# ---------------------------------------------------------------- E0

E0_STAGES = [
    "writeMs", "eventMs", "dispatchMs", "pubackMs", "deliveryMs", "installMs", "aptUpdateMs", "aptInstallMs",
    "installReportMs", "verifyWaitMs", "verifyMs", "verifyReportMs", "totalMs", "monitorConfirmMs",
]
# Consecutive stages from the desired-state write to convergence (defined in harness/e0-walkthrough.js).
E0_CHAIN = ["eventMs", "dispatchMs", "deliveryMs", "installMs", "verifyWaitMs", "verifyMs", "verifyReportMs"]


def summarize_e0():
    rows = [r for r in read_csv("e0-runs.csv") if not_warmup(r)]
    table = []
    for direction in ("upgrade", "downgrade"):
        subset = [r for r in rows if r["direction"] == direction and r["converged"] == "true"]
        for stage in E0_STAGES:
            table.append({"direction": direction, "metric": stage, **describe(num(r.get(stage)) for r in subset)})
    write_csv("e0-stages.csv", table, ["direction", "metric", *STAT_COLUMNS])

    upgrades = [r for r in rows if r["direction"] == "upgrade" and r["converged"] == "true"]
    mean = {stage: describe(num(r.get(stage)) for r in upgrades)["mean"] for stage in E0_STAGES}
    write_dat("e0-upgrade-chain.dat", [{"stage": s, "meanMs": mean[s]} for s in E0_CHAIN], ["stage", "meanMs"])
    on_device = sum(mean[s] or 0 for s in ("installMs", "verifyMs"))
    failed = sum(1 for r in rows if r["converged"] != "true")
    return (
        f"E0: {len(upgrades)} converged measured upgrades ({failed} measured runs without convergence); "
        f"mean total {mean['totalMs']} ms, of which {on_device:.0f} ms installation and verification on gw1"
    )


# ---------------------------------------------------------------- E1

E1_METRICS = ("targets", "queryMs", "writeMs", "totalMs", "writeMeanMs", "writeP95Ms")


def summarize_e1():
    rows = [r for r in read_csv("e1-assignment.csv") if not_warmup(r)]
    groups = defaultdict(list)
    for row in rows:
        groups[int(row["registeredTwins"])].append(row)
    table, dat = [], []
    for twins in sorted(groups):
        subset = groups[twins]
        entry = {"registeredTwins": twins, "runs": len(subset)}
        for metric in E1_METRICS:
            stats = describe(num(r[metric]) for r in subset)
            entry.update({f"{metric}_{k}": v for k, v in stats.items() if k != "n"})
        table.append(entry)
        dat.append({
            "twins": twins, "targets": entry["targets_mean"],
            "queryMean": entry["queryMs_mean"], "querySd": entry["queryMs_sd"],
            "writeMean": entry["writeMs_mean"], "writeSd": entry["writeMs_sd"],
            "totalMean": entry["totalMs_mean"], "totalSd": entry["totalMs_sd"],
        })
    columns = ["registeredTwins", "runs"] + [f"{m}_{k}" for m in E1_METRICS for k in STAT_COLUMNS if k != "n"]
    write_csv("e1-assignment.csv", table, columns)
    write_dat("e1-assignment.dat", dat, ["twins", "targets", "queryMean", "querySd", "writeMean", "writeSd", "totalMean", "totalSd"])
    return f"E1: {len(rows)} measured runs over {len(groups)} fleet sizes"


# ---------------------------------------------------------------- E2 / E4

E2_METRICS = ("fleet50Ms", "fleet95Ms", "fleet100Ms", "deviceMeanMs", "deviceP50Ms", "deviceP95Ms", "requestMs")
E2_METRIC_COLUMNS = [f"{m}_{k}" for m in E2_METRICS for k in STAT_COLUMNS if k != "n"]


def coordination_stats(subset):
    entry = {"runs": len(subset), "incompleteRuns": sum(1 for r in subset if r["complete"] != "true")}
    for metric in E2_METRICS:
        stats = describe(num(r[metric]) for r in subset if r["complete"] == "true")
        entry.update({f"{metric}_{k}": v for k, v in stats.items() if k != "n"})
    return entry


def summarize_e2():
    rows = [r for r in read_csv("e2-coordination.csv") if not_warmup(r)]
    groups = defaultdict(list)
    for row in rows:
        groups[(row["mode"], row["profile"], int(row["devices"]))].append(row)
    table = [
        {"mode": mode, "profile": profile, "devices": devices, **coordination_stats(groups[(mode, profile, devices)])}
        for (mode, profile, devices) in sorted(groups)
    ]
    write_csv("e2-coordination.csv", table, ["mode", "profile", "devices", "runs", "incompleteRuns", *E2_METRIC_COLUMNS])

    for mode, profile in sorted({(e["mode"], e["profile"]) for e in table}):
        write_dat(
            f"e2-{mode}-{profile}.dat",
            [
                {
                    "devices": e["devices"],
                    "fleetMean": e["fleet100Ms_mean"], "fleetSd": e["fleet100Ms_sd"],
                    "p50Mean": e["deviceP50Ms_mean"], "p50Sd": e["deviceP50Ms_sd"],
                    "p95Mean": e["deviceP95Ms_mean"], "p95Sd": e["deviceP95Ms_sd"],
                }
                for e in table if e["mode"] == mode and e["profile"] == profile
            ],
            ["devices", "fleetMean", "fleetSd", "p50Mean", "p50Sd", "p95Mean", "p95Sd"],
        )

    by_key = {(e["mode"], e["profile"], e["devices"]): e for e in table}
    overhead = []
    for (mode, profile, devices), dt in sorted(by_key.items()):
        direct = by_key.get(("direct", profile, devices))
        if mode != "dt" or direct is None:
            continue
        overhead.append({
            "profile": profile, "devices": devices,
            "dtDeviceP50": dt["deviceP50Ms_mean"], "directDeviceP50": direct["deviceP50Ms_mean"],
            "overheadP50": None if None in (dt["deviceP50Ms_mean"], direct["deviceP50Ms_mean"])
            else round(dt["deviceP50Ms_mean"] - direct["deviceP50Ms_mean"], 1),
            "dtFleet": dt["fleet100Ms_mean"], "directFleet": direct["fleet100Ms_mean"],
            "overheadFleet": None if None in (dt["fleet100Ms_mean"], direct["fleet100Ms_mean"])
            else round(dt["fleet100Ms_mean"] - direct["fleet100Ms_mean"], 1),
        })
    columns = ["profile", "devices", "dtDeviceP50", "directDeviceP50", "overheadP50", "dtFleet", "directFleet", "overheadFleet"]
    write_csv("e2-overhead.csv", overhead, columns)
    for profile in sorted({o["profile"] for o in overhead}):
        write_dat(f"e2-overhead-{profile}.dat", [o for o in overhead if o["profile"] == profile], columns[1:])
    incomplete = sum(e["incompleteRuns"] for e in table)
    return f"E2: {len(rows)} measured runs in {len(table)} conditions ({incomplete} incomplete)"


WORKFLOW_RUN = re.compile(r"^wf-e2-dt-(?P<profile>[a-z0-9]+)-(?P<devices>\d+)-(?P<rep>\d+)$")
E2_STEPS = ("desired_event", "dispatched", "installing", "installed", "installedApplied", "verified", "converged")
E2_STAGES = ["dispatchMs", "deliveryMs", "installWorkMs", "installReportMs", "verifyWorkMs", "verifyReportMs", "eventToConvergedMs"]


def e2_step(row, detail):
    """The step of a device update that a lifecycle event row marks, if any."""
    event, stage, status = row["event"], row["stage"], detail.get("status")
    if event in ("desired_event", "dispatched", "converged"):
        return event
    if event == "status_received" and stage == "installation" and status in ("installing", "installed"):
        return status
    if event == "status_applied" and stage == "installation" and status == "installed":
        return "installedApplied"
    if event == "status_received" and stage == "verification":
        return "verified"
    return None


def summarize_e2_stages():
    """Per-device stage breakdown of the DT-mediated E2 runs, from the lifecycle service's event log."""
    devices = defaultdict(dict)
    with open_raw("e2-lifecycle.csv") as handle:
        for row in csv.DictReader(handle):
            match = WORKFLOW_RUN.match(row["workflowId"] or "")
            if not match or match["rep"] == "0":
                continue
            detail = json.loads(row["detail"]) if row["detail"].startswith("{") else {}
            step = e2_step(row, detail)
            if step:
                devices[(row["workflowId"], row["thingId"])].setdefault(step, (float(row["ts"]), detail))

    groups = defaultdict(lambda: defaultdict(list))
    for (workflow, _thing), steps in devices.items():
        if not all(step in steps for step in E2_STEPS):
            continue
        match = WORKFLOW_RUN.match(workflow)
        stages = groups[(match["profile"], int(match["devices"]))]
        event_ts, dispatched_ts = steps["desired_event"][0], steps["dispatched"][0]
        installed, verified = steps["installed"][1], steps["verified"][1]
        stages["dispatchMs"].append(dispatched_ts - event_ts)
        stages["deliveryMs"].append(steps["installing"][1]["receivedAt"] - dispatched_ts)
        stages["installWorkMs"].append(installed["finishedAt"] - installed["startedAt"])
        stages["installReportMs"].append(steps["installedApplied"][0] - installed["finishedAt"])
        stages["verifyWorkMs"].append(verified["finishedAt"] - verified["startedAt"])
        stages["verifyReportMs"].append(steps["converged"][0] - verified["finishedAt"])
        stages["eventToConvergedMs"].append(steps["converged"][0] - event_ts)

    table = []
    for (profile, count) in sorted(groups):
        entry = {"profile": profile, "devices": count, "deviceRuns": len(groups[(profile, count)]["dispatchMs"])}
        for name in E2_STAGES:
            entry[name] = describe(groups[(profile, count)][name])["mean"]
        table.append(entry)
    write_csv("e2-stages.csv", table, ["profile", "devices", "deviceRuns", *E2_STAGES])
    for profile in sorted({t["profile"] for t in table}):
        write_dat(f"e2-stages-{profile}.dat", [t for t in table if t["profile"] == profile], ["devices", *E2_STAGES])
    return f"E2 stages: {sum(t['deviceRuns'] for t in table)} device updates broken down"


def e4_variant(row):
    return row.get("variant") or "extended"


def summarize_e4():
    rows = [r for r in read_csv("e4-coordination.csv") if not_warmup(r)]
    by_variant = defaultdict(list)
    for row in rows:
        by_variant[e4_variant(row)].append(row)
    table = [{"variant": variant, **coordination_stats(subset)} for variant, subset in sorted(by_variant.items())]
    write_csv("e4-variants.csv", table, ["variant", "runs", "incompleteRuns", *E2_METRIC_COLUMNS])

    pairs = defaultdict(dict)
    for row in rows:
        if row["complete"] == "true":
            pairs[row["rep"]][e4_variant(row)] = row
    deltas = defaultdict(list)
    for pair in pairs.values():
        if "baseline" in pair and "extended" in pair:
            for metric in ("fleet100Ms", "deviceP50Ms", "deviceP95Ms", "requestMs"):
                deltas[metric].append(num(pair["extended"][metric]) - num(pair["baseline"][metric]))
    write_csv("e4-paired-deltas.csv", [{"metric": m, **describe(v)} for m, v in deltas.items()], ["metric", *STAT_COLUMNS])

    checks = [r for r in read_csv("e4-checks.csv") if r["rep"] != "0"]
    totals = {
        key: sum(int(r[key]) for r in checks)
        for key in ("twinsFound", "desiredMetadataPresent", "annotated", "annotationsConsistentWithVersion")
    }
    totals["runs"] = len(checks)
    totals["runsWithResolvableSbom"] = sum(1 for r in checks if r.get("sbomResolvable") == "true")
    write_csv("e4-checks.csv", [totals], list(totals))
    counts = ", ".join(f"{variant} {len(subset)}" for variant, subset in sorted(by_variant.items()))
    return f"E4: {len(rows)} measured runs ({counts}), {len(deltas.get('fleet100Ms', []))} paired reps; checks {totals}"


# ---------------------------------------------------------------- E3

def summarize_e3():
    queries = read_csv("e3-queries.csv")
    groups = defaultdict(list)
    for row in queries:
        groups[row["query"]].append(row)
    table = []
    for query in sorted(groups):
        subset = groups[query]
        sums = {k: sum(int(r[k]) for r in subset) for k in ("expected", "returned", "truePositives", "falsePositives", "falseNegatives")}
        precision = sums["truePositives"] / sums["returned"] if sums["returned"] else 1.0
        recall = sums["truePositives"] / sums["expected"] if sums["expected"] else 1.0
        table.append({
            "query": query, "question": subset[0]["question"], "runs": len(subset), **sums,
            "precision": round(precision, 4), "recall": round(recall, 4),
            **{f"latency_{k}": v for k, v in describe(num(r["latencyMs"]) for r in subset).items() if k != "n"},
        })
    write_csv(
        "e3-queries.csv", table,
        ["query", "question", "runs", "expected", "returned", "truePositives", "falsePositives", "falseNegatives",
         "precision", "recall", *[f"latency_{k}" for k in STAT_COLUMNS if k != "n"]],
    )

    runs = read_csv("e3-runs.csv")
    metrics = ("completed", "failedInstallation", "failedVerification", "offline", "offlineCompleted",
               "terminalMs", "indexSettleMs", "meanLatencyOnlineMs", "meanLatencyOfflineMs")
    summary = [{"metric": m, **describe(num(r.get(m)) for r in runs)} for m in metrics]
    summary.append({"metric": "runsAllTerminal", "n": len(runs), "mean": sum(1 for r in runs if r["allTerminal"] == "true")})
    summary.append({"metric": "runsIndexSettled", "n": len(runs), "mean": sum(1 for r in runs if r.get("indexSettled") == "true")})
    write_csv("e3-runs.csv", summary, ["metric", *STAT_COLUMNS])
    wrong = sum(t["falsePositives"] + t["falseNegatives"] for t in table)
    return f"E3: {len(runs)} runs, {len(queries)} query executions, {wrong} misclassified devices in total"


# ---------------------------------------------------------------- container resources

RESOURCE_GROUPS = (
    ("things", re.compile(r"^ditto-fleet-things-\d+$")),
    ("search", re.compile(r"^ditto-fleet-things-search-\d+$")),
    ("policies", re.compile(r"^ditto-fleet-policies-\d+$")),
    ("gateway", re.compile(r"^ditto-fleet-(gateway|nginx)-\d+$")),
    ("mongodb", re.compile(r"^ditto-fleet-mongodb-\d+$")),
    ("mosquitto", re.compile(r"^ditto-fleet-mosquitto-\d+$")),
    ("backend", re.compile(r"^ssu-lab-backend-\d+$")),
    ("emulator", re.compile(r"^ssu-lab-emulator-\d+$")),
    ("gw1", re.compile(r"^ssu-lab-gw1(-[a-z]+)?-\d+$")),
    ("harness", re.compile(r"^ssu-lab-harness-run-[0-9a-f]+$")),
    ("annotator", re.compile(r"^ssu-e4-annotator$")),
)
RESOURCE_COLUMNS = [f"{group}{kind}" for group, _ in RESOURCE_GROUPS for kind in ("Cpu", "MemMiB", "PeakMemMiB")]


def load_resource_samples(name):
    samples = []
    with open_raw(name) as handle:
        for row in csv.DictReader(handle):
            group = next((g for g, pattern in RESOURCE_GROUPS if pattern.match(row["container"])), None)
            if group:
                samples.append((float(row["ts"]), group, row["container"], float(row["cpuPercent"]), float(row["memBytes"])))
    samples.sort()
    return samples


def window_usage(samples, timestamps, start, end):
    """Per group over [start, end]: mean CPU (percent of one core), mean memory and peak memory (MiB),
    each summed over the group's containers."""
    per_container = defaultdict(list)
    for _, group, container, cpu, memory in samples[bisect.bisect_left(timestamps, start):bisect.bisect_right(timestamps, end)]:
        per_container[(group, container)].append((cpu, memory))
    usage = defaultdict(lambda: [0.0, 0.0, 0.0])
    for (group, _), values in per_container.items():
        usage[group][0] += statistics.fmean(v[0] for v in values)
        usage[group][1] += statistics.fmean(v[1] for v in values) / 2**20
        usage[group][2] += max(v[1] for v in values) / 2**20
    return usage


def summarize_resources(campaign, runs, key_columns, window):
    """Container resource use per condition over the time window of every measured run: the mean of the
    runs' mean CPU and memory, and the highest peak memory."""
    samples = load_resource_samples(f"{campaign}-resources.csv")
    timestamps = [sample[0] for sample in samples]
    values = defaultdict(lambda: defaultdict(list))
    run_counts = Counter()
    for run in runs:
        start, end = window(run)
        if start is None or end is None:
            continue
        condition = tuple(int(run[c]) if run[c].isdigit() else run[c] for c in key_columns)
        run_counts[condition] += 1
        for group, (cpu, memory, peak) in window_usage(samples, timestamps, start, end).items():
            values[condition][f"{group}Cpu"].append(cpu)
            values[condition][f"{group}MemMiB"].append(memory)
            values[condition][f"{group}PeakMemMiB"].append(peak)
    table = []
    for condition in sorted(run_counts):
        entry = {**dict(zip(key_columns, condition)), "runs": run_counts[condition]}
        for column in RESOURCE_COLUMNS:
            observed = values[condition][column]
            if not observed:
                entry[column] = None
            elif column.endswith("PeakMemMiB"):
                entry[column] = round(max(observed), 1)
            else:
                entry[column] = round(statistics.fmean(observed), 1)
        table.append(entry)
    write_csv(f"{campaign}-resources-by-condition.csv", table, [*key_columns, "runs", *RESOURCE_COLUMNS])
    return f"{campaign.upper()} resources: {len(table)} conditions"


def duration_window(column):
    """A run's window: from its startedAt for the duration in the given column."""
    def window(run):
        duration = num(run.get(column))
        if duration is None or not run.get("startedAt"):
            return None, None
        start = epoch_ms(run["startedAt"])
        return start, start + duration
    return window


def coordination_window(run):
    """From the start of an E2/E4 run (before its assignment query) until its last device completed."""
    fleet = num(run["fleet100Ms"])
    if fleet is None or not run.get("startedAt"):
        return None, None
    start = epoch_ms(run["startedAt"])
    return start, start + (num(run["queryMs"]) or 0) + fleet


def measured_coordination_runs(name):
    return [r for r in read_csv(name) if not_warmup(r) and r["complete"] == "true"]


def summarize_e0_resources():
    runs = [r for r in read_csv("e0-runs.csv") if not_warmup(r) and r["converged"] == "true"]
    return summarize_resources("e0", runs, ["direction"], duration_window("totalMs"))


def summarize_e1_resources():
    runs = [r for r in read_csv("e1-assignment.csv") if not_warmup(r)]
    return summarize_resources("e1", runs, ["registeredTwins"], duration_window("totalMs"))


def summarize_e2_resources():
    runs = measured_coordination_runs("e2-coordination.csv")
    return summarize_resources("e2", runs, ["mode", "profile", "devices"], coordination_window)


def summarize_e3_resources():
    return summarize_resources("e3", read_csv("e3-runs.csv"), ["devices"], duration_window("terminalMs"))


def summarize_e4_resources():
    runs = measured_coordination_runs("e4-coordination.csv")
    for run in runs:
        run["variant"] = e4_variant(run)
    return summarize_resources("e4", runs, ["variant", "profile", "devices"], coordination_window)


def main():
    steps = [
        ("e0-runs.csv", summarize_e0),
        ("e0-resources.csv", summarize_e0_resources),
        ("e1-assignment.csv", summarize_e1),
        ("e1-resources.csv", summarize_e1_resources),
        ("e2-coordination.csv", summarize_e2),
        ("e2-lifecycle.csv", summarize_e2_stages),
        ("e2-resources.csv", summarize_e2_resources),
        ("e3-queries.csv", summarize_e3),
        ("e3-resources.csv", summarize_e3_resources),
        ("e4-coordination.csv", summarize_e4),
        ("e4-resources.csv", summarize_e4_resources),
    ]
    for required, step in steps:
        if raw_exists(required):
            print(step())
        else:
            print(f"skipped {step.__name__}: {required} not found")


if __name__ == "__main__":
    main()
