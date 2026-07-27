---
title: "23 things that silently corrupt sensor data"
date: 2026-07-27
draft: false
description: "A checklist for anyone building software on top of industrial sensor data. 23 specific ways the number in your database stopped matching the physical world, and what to check for each one."
keywords: ["sensor data quality", "industrial data validation", "SCADA data quality", "historian deadband", "IIoT data pipeline", "OPC quality flags", "time series data quality", "OT data engineering"]
summary: "Every one of these has produced a real incident somewhere. Most of them are invisible from the database side."
images: ["/og/trust-your-sensor-data.png"]
---

If you write software that consumes industrial sensor data, this list is for you.

Every item here is a specific way the number in your database stopped matching the physical world. None of them throw an error. That's the problem: bad industrial data almost never looks bad. It looks like a clean, plausible number, and it sits in your table next to all the good ones.

I've grouped them by where in the chain they happen, because that's how you debug them. Work backwards from your database toward the pipe.

**Sixteen of these are things a machine can catch**, and I've written them up as [`sensorcheck.py`](/checklist/code/): one file, standard library only, nothing to install, plus a demo that prints a day of plant readings where the summary looks entirely reasonable and the data is full of holes. Free, no email required.

{{< newsletter >}}

## At the sensor

**1. Tolerance class.** Your sensor has error bars before the reading goes anywhere. A PT100 in class B is accurate to ±0.3°C at 0°C, widening to ±1.3°C at 300°C. If your alert threshold is tighter than the sensor's accuracy, the alert is noise.

**2. Calibration drift.** Sensors deviate from truth slowly over years, and almost nothing tells you it's happening. Ask when each sensor was last calibrated. If nobody knows, that's your answer.

**3. Installation.** A temperature sensor sitting in a dead zone rather than the flow, or with an air pocket around it, reads something real. Just not the thing you think it's reading.

**4. Response time.** A sensor inside a thermowell can lag the actual process by tens of seconds because the well itself has thermal mass. Your "current" temperature may describe the recent past.

**5. Ambient effects on the transmitter.** The electronics converting your measurement sit in a cabinet that gets hot in summer. Transmitter specs include a temperature coefficient for exactly this reason.

## In the signal path

**6. Range and span mismatch.** The transmitter is configured for 0-200°C. The process was rescaled to 0-150°C three years ago and nobody reconfigured the transmitter. Every reading since then has been wrong by a consistent, entirely plausible-looking factor.

**7. Analog-to-digital resolution.** The 16mA span (4 to 20) gets divided by the input card's bit depth. That division sets the smallest change you can possibly detect. Asking for finer precision than that in your application is asking for fiction.

**8. Electrical noise.** A variable-frequency drive (the thing that controls motor speed) running near your signal cable can inject enough interference to move a reading by several counts. It comes and goes with the motor.

**9. Live zero.** In 4-20mA, 4mA is the bottom of the range and 0mA means the loop is broken. If your ingestion code treats 0 as a valid measurement, you are recording dead sensors as real readings of zero. This one is common and it is nasty, because zero is often a physically plausible value.

## At the PLC

**10. Scan cycle.** The PLC reads inputs, runs logic and writes outputs on a loop, typically every 10-100ms. Your values are samples from that loop, not a continuous stream. Anything faster than the cycle never existed as far as your data is concerned.

**11. The timestamp is usually a poll time.** It records when the SCADA system asked, not when the physical event happened. Depending on poll frequency, those differ by seconds.

**12. Undocumented scaling.** Raw counts get converted to engineering units by a scaling block inside the PLC program. The factors live in ladder logic that was written by a contractor in 2014.

**13. Last-known-value on failure.** Some systems hold the previous value when communication drops instead of marking the data bad. A frozen sensor and a genuinely stable process look identical in your table.

## At the SCADA system and historian

**14. Deadbanding.** Historians commonly store a new value only when it has changed by more than a configured threshold. A flat line in your data can mean "nothing changed" or it can mean "we stopped bothering to record."

**15. Querying a timestamp lies politely.** Ask a historian for the value at 14:32:17 and you get the last stored value before that moment, which might be from 14:00. Nothing in the response tells you it's 32 minutes stale.

**16. Lossy compression.** Historians use algorithms like swinging door to store a curve as a handful of points. What you read back is a reconstruction, and it is deliberately not the original.

**17. Dropped quality flags.** OPC and most historians carry a quality or status field alongside every value: good, bad, uncertain. A large share of pipelines select the value column and drop the quality column. That is throwing away the one field that tells you whether to trust the other one.

**18. Backfill rewrites history.** Late-arriving data gets inserted behind your read position. Any aggregate you computed before the backfill is now wrong, and nothing notified you.

## In your pipeline

**19. Buffering behaviour on reconnect.** When the link drops, does the edge device buffer and then burst everything on reconnect, or does it drop the gap? Both are defensible. They corrupt your data in completely different ways, and you need to know which one you have.

**20. Local time.** Industrial systems frequently run in local time. Norwegian plants mean CET and CEST, so you inherit a seasonal one-hour offset against your UTC pipeline.

**21. The clocks change twice a year.** In autumn an hour repeats, so you get duplicate timestamps. In spring an hour vanishes, so you get a gap that isn't an outage. Both break naive time-series joins, and both happen on a schedule you can plan for.

**22. Resampling invents data.** Forward-fill, interpolate or drop are three different answers, and every one of them creates values that were never measured. Forward-filling a dead sensor produces a beautifully stable line that means nothing at all.

**23. Unit conversion.** Bar against psi, celsius against fahrenheit, m³/h against l/s. Usually somebody catches it. When they don't, it tends to be expensive.

## The short version

Three habits cover most of this:

**Keep the quality flag.** If your schema has no column for it, add one. It is the cheapest data quality win available and almost everyone skips it.

**Validate rate of change at ingestion.** A pipe temperature that moves from 70°C to 500°C in one second is a fault, not a process. Physical systems have physical limits, so enforce them at the door.

**Write down the uncertainty.** Sensor type, accuracy class, deadband setting, poll interval, all of it as metadata next to the data. The person who needs it is you, at two in the morning, trying to work out whether an anomaly is real.

And one that isn't technical: ask the operators. They know which sensors read a bit high and which one has been unreliable since the refit. That knowledge is almost never written down anywhere.

---

If you want the reasoning behind these rather than just the list, [Can you trust your sensor data?](/posts/trust-your-sensor-data/) walks the whole path from a heat exchanger to a cloud application, and [What 4-20mA actually means](/posts/what-4-20ma-actually-means/) covers the signal path in detail.

{{< newsletter >}}
