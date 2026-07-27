"""
sensorcheck: the checks from "23 things that silently corrupt sensor data",
as code you can drop into an ingestion path.

Standard library only. One file. Copy it into your project and go.

The idea is simple. Bad industrial data almost never looks bad. It arrives as a
clean, plausible number and sits in your table next to all the good ones. So you
have to go looking for it on purpose, at the door, before it becomes a dashboard
someone trusts.

Companion code for https://mariusgjerd.github.io/checklist/
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable, Iterable, List, Optional, Sequence

__all__ = [
    "Reading",
    "SensorSpec",
    "Finding",
    "run_all",
    "report",
]

ERROR = "error"
WARNING = "warning"
INFO = "info"


# --------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------


@dataclass
class Reading:
    """One value as it reached you.

    ts       when the value is stamped (see check_naive_timestamps: make it aware)
    value    the engineering value, or None if the source gave you nothing
    quality  the source's own verdict: "good", "bad", "uncertain", or None if
             your pipeline dropped the column, which is item 17 on the list
    arrived  when the row landed in your store, if you record it. Without this
             you cannot detect backfill rewriting history.
    """

    ts: datetime
    value: Optional[float]
    quality: Optional[str] = None
    arrived: Optional[datetime] = None


@dataclass
class SensorSpec:
    """What you know about the instrument.

    Writing this down is itself item 23 on the checklist. Most of these checks
    are impossible without it, which is the point: if nobody can fill this in,
    that is your finding.
    """

    name: str = "sensor"
    unit: str = ""

    # Engineering range the transmitter is configured for.
    range_min: Optional[float] = None
    range_max: Optional[float] = None

    # Sensor accuracy, e.g. 1.3 for a PT100 class B up at 300 C. Used to tell
    # you when an alert threshold is tighter than the instrument itself.
    accuracy: Optional[float] = None

    # Fastest physically plausible change, in units per second. A pipe
    # temperature does not move 400 degrees in a second; a fault does.
    max_rate_per_s: Optional[float] = None

    # Expected sampling interval. Used for gap, burst and freshness checks.
    expected_interval_s: Optional[float] = None

    # Historian deadband, if one is configured. Runs flatter than this are
    # expected rather than suspicious.
    deadband: Optional[float] = None

    # How old a value may be before you should stop calling it current.
    max_staleness_s: Optional[float] = None


@dataclass
class Finding:
    check: str
    severity: str
    message: str
    count: int = 0
    samples: List[str] = field(default_factory=list)

    def __str__(self) -> str:
        head = "[{}] {}: {}".format(self.severity.upper(), self.check, self.message)
        if self.samples:
            head += "\n    e.g. " + ", ".join(self.samples[:3])
        return head


def _samples(items: Iterable, limit: int = 3) -> List[str]:
    out = []
    for item in items:
        if len(out) >= limit:
            break
        out.append(str(item))
    return out


def _values(readings: Sequence[Reading]) -> List[float]:
    return [r.value for r in readings if r.value is not None]


# --------------------------------------------------------------------------
# The checks
# --------------------------------------------------------------------------


def check_live_zero(readings, spec, fault_value=0.0, tol=1e-9) -> List[Finding]:
    """#9. In 4-20 mA, 4 mA is the bottom of the range and 0 mA means the loop is
    broken. If your code treats 0 as a measurement, you are recording dead
    sensors as real readings of zero.

    There is a trap inside the trap. If your engineering range starts at 0, then
    a broken loop and a genuine minimum reading scale to the same number, and no
    amount of cleverness on the scaled value can separate them. You have to go
    back to the raw mA. That case gets its own warning below, because a check
    that quietly passed here would be lying to you."""
    out: List[Finding] = []

    if spec.range_min is not None:
        below = [r for r in readings if r.value is not None and r.value < spec.range_min - tol]
        if below:
            out.append(
                Finding(
                    "live_zero",
                    ERROR,
                    "{} readings below the bottom of range ({} {}). The loop never "
                    "reached 4 mA, so these are faults, not measurements.".format(
                        len(below), spec.range_min, spec.unit
                    ),
                    len(below),
                    _samples(r.ts for r in below),
                )
            )

    exact = [r for r in readings if r.value is not None and abs(r.value - fault_value) <= tol]
    if not exact:
        return out

    ambiguous = spec.range_min is not None and abs(spec.range_min - fault_value) <= tol
    if ambiguous:
        out.append(
            Finding(
                "live_zero_ambiguous",
                WARNING,
                "{} readings sit exactly at {} {}, which is both the bottom of your "
                "range and the broken-wire value. From the scaled number alone these "
                "are indistinguishable. Check the raw mA, or have the transmitter "
                "configured so a fault lands outside the range (NAMUR NE43).".format(
                    len(exact), fault_value, spec.unit
                ),
                len(exact),
                _samples(r.ts for r in exact),
            )
        )
    else:
        out.append(
            Finding(
                "live_zero",
                ERROR,
                "{} readings are exactly {}, the classic dead-loop value, and that is "
                "outside your configured range.".format(len(exact), fault_value),
                len(exact),
                _samples(r.ts for r in exact),
            )
        )
    return out


def check_range(readings, spec) -> List[Finding]:
    """#6. A transmitter configured for the wrong span rescales every reading by
    a consistent, entirely plausible-looking factor. Values above the top of
    range are the visible edge of that."""
    if spec.range_max is None:
        return []
    hits = [r for r in readings if r.value is not None and r.value > spec.range_max]
    if not hits:
        return []
    return [
        Finding(
            "range",
            ERROR,
            "{} readings above the configured maximum ({} {}). Either the span is "
            "wrong or the process is.".format(len(hits), spec.range_max, spec.unit),
            len(hits),
            _samples(r.value for r in hits),
        )
    ]


def check_rate_of_change(readings, spec) -> List[Finding]:
    """A pipe temperature that goes from 70 to 500 in one second is a fault, not
    a process. Physical systems have physical limits, so enforce them."""
    if spec.max_rate_per_s is None or len(readings) < 2:
        return []
    hits = []
    for prev, cur in zip(readings, readings[1:]):
        if prev.value is None or cur.value is None:
            continue
        dt = (cur.ts - prev.ts).total_seconds()
        if dt <= 0:
            continue
        rate = abs(cur.value - prev.value) / dt
        if rate > spec.max_rate_per_s:
            hits.append((cur.ts, rate))
    if not hits:
        return []
    return [
        Finding(
            "rate_of_change",
            ERROR,
            "{} jumps faster than {} {}/s. Physically impossible, so treat them "
            "as instrument faults.".format(len(hits), spec.max_rate_per_s, spec.unit),
            len(hits),
            _samples("{} at {:.1f}/s".format(ts, rate) for ts, rate in hits),
        )
    ]


def check_stuck_value(readings, spec, min_run=10) -> List[Finding]:
    """#13. Some systems hold the previous value when comms drop instead of
    flagging the data bad. A frozen sensor and a genuinely stable process look
    identical in your table."""
    if len(readings) < min_run:
        return []
    runs, run_start, run_len = [], 0, 1
    for i in range(1, len(readings)):
        if readings[i].value is not None and readings[i].value == readings[i - 1].value:
            run_len += 1
        else:
            if run_len >= min_run:
                runs.append((readings[run_start].ts, readings[i - 1].ts, run_len))
            run_start, run_len = i, 1
    if run_len >= min_run:
        runs.append((readings[run_start].ts, readings[-1].ts, run_len))
    if not runs:
        return []
    longest = max(r[2] for r in runs)
    sev = ERROR if spec.deadband is None else WARNING
    note = ""
    if spec.deadband is not None:
        note = " A deadband of {} is configured, so some of this may be the historian, not the sensor.".format(spec.deadband)
    return [
        Finding(
            "stuck_value",
            sev,
            "{} runs of {}+ identical readings (longest {}). Frozen sensor, or a "
            "last-known-value hold on a dead link.{}".format(len(runs), min_run, longest, note),
            len(runs),
            _samples("{} -> {} ({} rows)".format(a, b, n) for a, b, n in runs),
        )
    ]


def check_quality_flags(readings, spec) -> List[Finding]:
    """#17. OPC and most historians carry a quality field beside every value.
    A large share of pipelines select the value column and drop the quality
    column, which throws away the one field that tells you whether to trust the
    other one."""
    out = []
    missing = sum(1 for r in readings if r.quality is None)
    if missing == len(readings) and readings:
        out.append(
            Finding(
                "quality_missing",
                ERROR,
                "No reading carries a quality flag. Either the source does not send "
                "one or your pipeline drops it. This is the cheapest data quality "
                "win available and almost everyone skips it.",
                missing,
            )
        )
    elif missing:
        out.append(
            Finding("quality_missing", WARNING, "{} readings have no quality flag.".format(missing), missing)
        )

    bad = [r for r in readings if r.quality and r.quality.lower() in ("bad", "uncertain")]
    if bad:
        out.append(
            Finding(
                "quality_bad_used",
                ERROR,
                "{} readings are flagged bad or uncertain by the source but are still "
                "in the data you are about to use.".format(len(bad)),
                len(bad),
                _samples("{} ({})".format(r.ts, r.quality) for r in bad),
            )
        )
    return out


def check_naive_timestamps(readings, spec) -> List[Finding]:
    """#20. Industrial systems frequently run in local time. Norwegian plants
    mean CET and CEST, so you inherit a seasonal one-hour offset against a
    pipeline that expects UTC."""
    naive = [r for r in readings if r.ts.tzinfo is None or r.ts.utcoffset() is None]
    if not naive:
        return []
    return [
        Finding(
            "naive_timestamps",
            ERROR,
            "{} timestamps carry no timezone. You cannot tell CET from UTC from "
            "plant-local, and the difference is an hour twice a year.".format(len(naive)),
            len(naive),
            _samples(r.ts for r in naive),
        )
    ]


def check_dst_duplicates(readings, spec) -> List[Finding]:
    """#21. In autumn an hour repeats, so you get duplicate wall-clock stamps.
    In spring an hour vanishes. Both break naive time-series joins, and both
    happen on a date you can plan for."""
    seen = Counter(r.ts.replace(tzinfo=None) for r in readings)
    dupes = [ts for ts, n in seen.items() if n > 1]
    if not dupes:
        return []
    return [
        Finding(
            "dst_duplicates",
            WARNING,
            "{} wall-clock timestamps appear more than once. Classic autumn DST "
            "overlap, or a replayed buffer.".format(len(dupes)),
            len(dupes),
            _samples(sorted(dupes)),
        )
    ]


def check_sampling(readings, spec, burst_factor=0.25, gap_factor=3.0) -> List[Finding]:
    """#10 and #19. Values are samples from the PLC scan cycle, not a stream.
    And when a link drops, the edge either buffers and floods on reconnect or
    drops the gap. Both are defensible; they corrupt differently, and you need
    to know which one you have."""
    if spec.expected_interval_s is None or len(readings) < 3:
        return []
    out, gaps, bursts = [], [], []
    for prev, cur in zip(readings, readings[1:]):
        dt = (cur.ts - prev.ts).total_seconds()
        if dt > spec.expected_interval_s * gap_factor:
            gaps.append((prev.ts, cur.ts, dt))
        elif 0 <= dt < spec.expected_interval_s * burst_factor:
            bursts.append((cur.ts, dt))
    if gaps:
        out.append(
            Finding(
                "sampling_gap",
                WARNING,
                "{} gaps longer than {}x the expected {}s interval. Outage, or the "
                "edge dropped the gap rather than buffering it.".format(
                    len(gaps), gap_factor, spec.expected_interval_s
                ),
                len(gaps),
                _samples("{} -> {} ({:.0f}s)".format(a, b, d) for a, b, d in gaps),
            )
        )
    if bursts:
        out.append(
            Finding(
                "sampling_burst",
                WARNING,
                "{} readings arrived far faster than the {}s interval. Looks like a "
                "buffer flushing after a reconnect.".format(len(bursts), spec.expected_interval_s),
                len(bursts),
                _samples("{} (+{:.1f}s)".format(ts, d) for ts, d in bursts),
            )
        )
    return out


def check_staleness(readings, spec, now=None) -> List[Finding]:
    """#15. Ask a historian for the value at 14:32:17 and you get the last stored
    value before that moment, which might be from 14:00. Nothing in the response
    tells you it is half an hour old."""
    if spec.max_staleness_s is None or not readings:
        return []
    last = readings[-1]
    now = now or datetime.now(last.ts.tzinfo or timezone.utc)
    age = (now - last.ts).total_seconds()
    if age <= spec.max_staleness_s:
        return []
    return [
        Finding(
            "stale",
            ERROR,
            "Newest reading is {:.0f}s old, past the {:.0f}s you said was still "
            "current. Anything reading this as 'now' is wrong.".format(age, spec.max_staleness_s),
            1,
            [str(last.ts)],
        )
    ]


def check_quantization(readings, spec, min_distinct=8) -> List[Finding]:
    """#7. The 16 mA span gets divided by the input card's bit depth, and that
    division sets the smallest change you can detect. Asking for finer precision
    than that in your application is asking for fiction."""
    vals = sorted(set(_values(readings)))
    if len(vals) < min_distinct:
        return []
    steps = [round(b - a, 9) for a, b in zip(vals, vals[1:]) if b > a]
    if not steps:
        return []
    step = min(steps)
    if step <= 0:
        return []
    # If every value sits on a multiple of the smallest gap, we are looking at
    # the converter's grid rather than the process.
    on_grid = sum(1 for v in vals if math.isclose(v / step, round(v / step), rel_tol=1e-6, abs_tol=1e-6))
    if on_grid < len(vals) * 0.98:
        return []
    span = (spec.range_max - spec.range_min) if None not in (spec.range_min, spec.range_max) else None
    msg = "Values snap to a grid of {} {}. That is your real resolution.".format(step, spec.unit)
    if span:
        msg += " Roughly {:.0f} distinct steps across the range.".format(span / step)
    if spec.accuracy is not None and step > spec.accuracy:
        msg += (
            " It is coarser than the stated accuracy of {}, so resolution, not the "
            "sensor, is your limit.".format(spec.accuracy)
        )
    return [Finding("quantization", INFO, msg, len(vals))]


def check_alert_threshold(spec, threshold) -> List[Finding]:
    """#1. Your sensor has error bars before the reading goes anywhere. If your
    alert threshold is tighter than the instrument's accuracy, the alert is
    noise dressed up as information."""
    if spec.accuracy is None or threshold is None:
        return []
    if threshold >= spec.accuracy:
        return []
    return [
        Finding(
            "alert_threshold",
            WARNING,
            "An alert threshold of {} {} is tighter than the sensor's accuracy of "
            "{}. The alarm will fire on measurement error.".format(threshold, spec.unit, spec.accuracy),
            1,
        )
    ]


def check_late_arrival(readings, spec) -> List[Finding]:
    """#18. Late data gets inserted behind your read position. Any aggregate you
    computed before the backfill is now wrong, and nothing notified you."""
    have = [r for r in readings if r.arrived is not None]
    if not have:
        return [
            Finding(
                "late_arrival",
                INFO,
                "No arrival times recorded, so backfill is undetectable. Store both "
                "when it happened and when you learned about it.",
                0,
            )
        ]
    # Walk them in the order you learned about them, not the order they happened.
    # Sorting by ts first (as run_all does) hides backfill completely, which is
    # the whole reason backfill is item 18 and not something you notice.
    out_of_order = []
    high_water = None
    for r in sorted(have, key=lambda x: x.arrived):
        if high_water is not None and r.ts < high_water:
            out_of_order.append((r.ts, r.arrived))
        high_water = r.ts if high_water is None else max(high_water, r.ts)
    if not out_of_order:
        return []
    return [
        Finding(
            "late_arrival",
            WARNING,
            "{} readings arrived after later-stamped rows were already stored. "
            "Recompute anything aggregated over that window.".format(len(out_of_order)),
            len(out_of_order),
            _samples("stamped {} arrived {}".format(a, b) for a, b in out_of_order),
        )
    ]


def check_nulls(readings, spec) -> List[Finding]:
    """Missing values are the honest failure mode. Count them so a gap does not
    quietly become a zero somewhere downstream."""
    nulls = [r for r in readings if r.value is None]
    if not nulls:
        return []
    return [
        Finding(
            "nulls",
            INFO,
            "{} readings have no value. Make sure nothing downstream turns these "
            "into zeros.".format(len(nulls)),
            len(nulls),
            _samples(r.ts for r in nulls),
        )
    ]


# --------------------------------------------------------------------------
# Running them
# --------------------------------------------------------------------------


def run_all(readings: Sequence[Reading], spec: SensorSpec, now=None, alert_threshold=None) -> List[Finding]:
    """Run every check that the spec gives us enough information to run.

    Checks that need metadata you have not filled in are skipped silently. That
    is deliberate: an empty spec produces an empty report, which should tell you
    something about how much you actually know about the instrument.
    """
    readings = sorted(readings, key=lambda r: r.ts)
    findings: List[Finding] = []
    findings += check_naive_timestamps(readings, spec)
    findings += check_live_zero(readings, spec)
    findings += check_range(readings, spec)
    findings += check_rate_of_change(readings, spec)
    findings += check_stuck_value(readings, spec)
    findings += check_quality_flags(readings, spec)
    findings += check_dst_duplicates(readings, spec)
    findings += check_sampling(readings, spec)
    findings += check_staleness(readings, spec, now=now)
    findings += check_quantization(readings, spec)
    findings += check_late_arrival(readings, spec)
    findings += check_nulls(readings, spec)
    if alert_threshold is not None:
        findings += check_alert_threshold(spec, alert_threshold)
    order = {ERROR: 0, WARNING: 1, INFO: 2}
    return sorted(findings, key=lambda f: order.get(f.severity, 9))


def report(findings: Sequence[Finding], spec: Optional[SensorSpec] = None) -> str:
    """Human-readable summary, for a log line or a CI step."""
    title = "sensorcheck"
    if spec is not None:
        title += " :: {}".format(spec.name)
    lines = [title, "=" * len(title)]
    if not findings:
        lines.append("No findings. Either the data is clean or the spec is empty.")
        return "\n".join(lines)
    counts = Counter(f.severity for f in findings)
    lines.append(
        "{} error, {} warning, {} info".format(counts.get(ERROR, 0), counts.get(WARNING, 0), counts.get(INFO, 0))
    )
    lines.append("")
    for f in findings:
        lines.append(str(f))
        lines.append("")
    return "\n".join(lines).rstrip()
