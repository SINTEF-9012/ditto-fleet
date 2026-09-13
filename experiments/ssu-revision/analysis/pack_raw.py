#!/usr/bin/env python3
"""Compresses bulky raw results before they are committed.

Each campaign's emulator ground-truth files (<run>-truth.csv, no header; every row carries its run id)
are appended to <id>-truth.csv.gz, and other raw files larger than 1 MiB become <name>.gz. The
originals are removed afterwards. analysis/summarize.py reads plain and compressed files alike.
"""

import gzip
import shutil
from collections import defaultdict
from pathlib import Path

RAW = Path(__file__).resolve().parent.parent / "results" / "raw"
LIMIT = 1 << 20


def main():
    truth = defaultdict(list)
    for path in sorted(RAW.glob("e[0-9]-*-truth.csv")):
        truth[path.name[:2]].append(path)
    for campaign, paths in sorted(truth.items()):
        target = RAW / f"{campaign}-truth.csv.gz"
        with gzip.open(target, "ab") as bundle:
            for path in paths:
                bundle.write(path.read_bytes())
        for path in paths:
            path.unlink()
        print(f"{target.name}: appended {len(paths)} truth files")

    for path in sorted(RAW.glob("e[0-9]-*.csv")):
        if path.stat().st_size <= LIMIT:
            continue
        target = path.with_name(path.name + ".gz")
        with open(path, "rb") as source, gzip.open(target, "wb") as compressed:
            shutil.copyfileobj(source, compressed)
        path.unlink()
        print(f"{target.name}: {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
