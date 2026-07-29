---
title: "The 23 checks, as code"
url: "/checklist/code/"
date: 2026-07-27
draft: false
description: "The sensor data checklist as a runnable Python module. Standard library only, one file, drop it into your ingestion path."
keywords: ["sensor data validation", "industrial data quality python", "time series validation", "OPC quality flags", "4-20mA validation", "data quality checks"]
summary: "The checklist as code you can run against your own data. One file, standard library only."
images: ["/og/checklist-code.png"]
ShowBreadCrumbs: true
---

`sensorcheck.py` turns [the checklist](/checklist/) into something you can run against your own data. One file, standard library only, nothing to install. Copy it into your project and go.

{{< downloads "Download sensorcheck.py|/code/sensorcheck.py" "Download the demo|/code/broken_plant_day.py" >}}

## Try it first

The demo builds a day of readings from one heat exchanger with the usual things wrong, then shows you two views of the same data.

```bash
python3 broken_plant_day.py
```

First it prints what a normal pipeline reports: a count, a min, a max, a mean. All entirely reasonable. Then it runs the checks against that same data and finds five errors and six warnings, every one of which was sitting inside the reasonable-looking summary.

That gap is the whole point.

## Using it on your own data

```python
from sensorcheck import Reading, SensorSpec, run_all, report

spec = SensorSpec(
    name="HX-01 outlet temperature",
    unit="C",
    range_min=0.0,           # what 4 mA means
    range_max=200.0,         # what 20 mA means
    accuracy=0.3,            # PT100 class B near 0 C
    max_rate_per_s=2.0,      # this loop cannot physically move faster
    expected_interval_s=10.0,
    max_staleness_s=120.0,
)

readings = [Reading(ts=row.ts, value=row.value, quality=row.quality) for row in rows]

print(report(run_all(readings, spec), spec))
```

Checks that need metadata you have not filled in are skipped silently. That is deliberate. An empty `SensorSpec` produces an empty report, and if nobody at your site can fill one in, that is your first finding.

## What it catches

Sixteen checks, each tied back to a numbered item on the checklist: dead loops scaling to a plausible zero, frozen sensors held on a dead link, quality flags dropped by the pipeline, timestamps with no timezone, the October hour that happens twice, buffer floods after a reconnect, values snapping to the converter's grid rather than the process, alert thresholds tighter than the instrument's accuracy, and backfill quietly rewriting an aggregate you already computed.

The one I'd point at first is `live_zero_ambiguous`. If your engineering range starts at zero, then a broken loop and a genuine minimum reading scale to exactly the same number, and nothing you do to the scaled value will separate them. You have to go back to the raw mA, or have the transmitter configured so a fault lands outside the range at all. That one is not in the checklist article, because I only noticed it properly while writing the code.

## What it deliberately does not do

It does not fix anything. Every check reports; none of them silently repair, interpolate or drop a row. Quietly patching bad industrial data is how the data became untrustworthy in the first place.

It also cannot see the physical layer. Calibration drift, a sensor in a dead zone, a thermowell with too much thermal mass, a signal cable sharing a ladder with power. All real, all common, all invisible from the database side. [The checklist](/checklist/) covers those. Code can't.

---

If you find something wrong with it, or a check you think is missing, tell me. I read everything, and this file will get better for it.

{{< newsletter >}}
