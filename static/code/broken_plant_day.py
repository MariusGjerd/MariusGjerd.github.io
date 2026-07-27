"""
A day of readings from one heat exchanger, with the usual things wrong.

Run it:  python3 demos/broken_plant_day.py

The point is the contrast. First we look at the data the way most pipelines do,
with a count and a min/max/mean. It looks entirely reasonable: a few hundred
readings, temperatures in a believable band, nothing that would trip an alert.

Then we run the checks. Every problem below was already in the data during the
first summary, and none of it raised an error anywhere.
"""

import os
import statistics
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sensorcheck import Reading, SensorSpec, report, run_all  # noqa: E402

CEST = timezone(timedelta(hours=2))  # Norway, summer
CET = timezone(timedelta(hours=1))   # Norway, winter


def build_day():
    """One reading every 10 seconds, with faults injected the way they actually
    show up: as ordinary looking numbers."""
    start = datetime(2026, 10, 25, 0, 0, 0, tzinfo=CEST)
    readings = []
    value = 73.0

    for i in range(360):
        ts = start + timedelta(seconds=10 * i)
        # A slow, believable process drift.
        value += 0.02 if (i // 60) % 2 == 0 else -0.02
        # The input card only resolves about 0.05 C, so everything lands on a grid.
        v = round(round(value / 0.05) * 0.05, 4)
        readings.append(Reading(ts=ts, value=v, quality="good", arrived=ts))

    # The transmitter loses its loop for a while. The system holds the last
    # value instead of saying so, which is item 13.
    for i in range(120, 145):
        readings[i] = Reading(
            ts=readings[i].ts, value=readings[120].value, quality="good", arrived=readings[i].arrived
        )

    # Broken wire. 0 mA, which scales to 0.0 C. A perfectly plausible number in
    # a Norwegian October, and item 9 on the list.
    for i in (200, 201, 202):
        readings[i] = Reading(ts=readings[i].ts, value=0.0, quality="good", arrived=readings[i].arrived)

    # A spike the process cannot physically do.
    readings[240] = Reading(ts=readings[240].ts, value=511.4, quality="good", arrived=readings[240].arrived)

    # The source told us it did not trust these. Most pipelines drop the column.
    for i in (300, 301):
        readings[i] = Reading(ts=readings[i].ts, value=readings[i].value, quality="bad", arrived=readings[i].arrived)

    # Nothing came back at all for two samples.
    readings[310] = Reading(ts=readings[310].ts, value=None, quality="good", arrived=readings[310].arrived)

    # The link dropped for six minutes, then flushed its buffer in one burst.
    gap_start = readings[-1].ts + timedelta(minutes=6)
    for k in range(5):
        ts = gap_start + timedelta(seconds=k)  # 1 s apart, not 10
        readings.append(Reading(ts=ts, value=73.4, quality="good", arrived=gap_start + timedelta(seconds=5)))

    # The clocks go back at 03:00, so the wall-clock hour 02:00-03:00 happens
    # twice: once at +02:00 and again at +01:00. Same numbers on the clock, two
    # different real instants. Item 21.
    for offset in (CEST, CET):
        for k in range(3):
            wall = datetime(2026, 10, 25, 2, 30, 10 * k, tzinfo=offset)
            readings.append(Reading(ts=wall, value=72.9, quality="good", arrived=wall))

    # A reading from the start of the day that only reached us half an hour after
    # everything else was already stored. Backfill, item 18. Note the timestamp
    # is deliberately off the 10 s grid so it is not mistaken for a DST twin.
    latest_arrival = max(r.arrived for r in readings if r.arrived is not None)
    readings.append(
        Reading(
            ts=start + timedelta(minutes=7, seconds=3),
            value=73.1,
            quality="good",
            arrived=latest_arrival + timedelta(minutes=30),
        )
    )
    return readings


def naive_summary(readings):
    vals = [r.value for r in readings if r.value is not None]
    print("What a normal pipeline reports")
    print("-" * 30)
    print("readings   {}".format(len(readings)))
    print("min        {:.2f} C".format(min(vals)))
    print("max        {:.2f} C".format(max(vals)))
    print("mean       {:.2f} C".format(statistics.mean(vals)))
    print("")
    print("Nothing threw. Nothing was null-checked into oblivion. If this fed a")
    print("dashboard this morning, nobody would look twice.")
    print("")


def main():
    readings = build_day()

    naive_summary(readings)

    spec = SensorSpec(
        name="HX-01 outlet temperature",
        unit="C",
        range_min=0.0,          # 4 mA
        range_max=200.0,        # 20 mA
        accuracy=0.3,           # PT100 class B, near 0 C
        max_rate_per_s=2.0,     # this loop cannot move faster than that
        expected_interval_s=10.0,
        max_staleness_s=120.0,
    )

    # "now" is pinned so the demo prints the same thing every run. It has to be
    # measured from the newest reading by timestamp, not the last row in the
    # list, which is exactly the mistake the staleness check exists to catch.
    now = max(r.ts for r in readings) + timedelta(minutes=45)

    findings = run_all(readings, spec, now=now, alert_threshold=0.1)
    print(report(findings, spec))
    print("")
    print("-" * 30)
    print("Every one of those was in the data during the summary above.")
    print("Full list and the reasoning: https://mariusgjerd.github.io/checklist/")


if __name__ == "__main__":
    main()
