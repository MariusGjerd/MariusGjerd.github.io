---
title: "Can you trust your sensor data? A developer's guide to the full stack"
date: 2026-06-30
draft: false
tags: ["data", "sensors", "iot", "scada", "data-quality", "data-lifecycle"]
categories: ["data-lifecycle"]
description: "Every data pipeline starts with a sensor. Here's what happens to the data between the physical world and your application — and where it quietly starts lying to you."
keywords: ["sensor data quality", "SCADA data", "IIoT data pipeline", "OT data", "Modbus", "4-20mA", "historian", "data trust"]
summary: "Your sensor data has been transformed, compressed, timestamped, and approximated before it reaches your application. Here's the full journey — and where to be suspicious."
---

Every data pipeline in industrial IoT starts the same way: something physical happens, a sensor detects it, and a number appears in your database.

The gap between "something physical happens" and "a number appears in your database" is where most data quality problems live. If you've only ever worked on the database side, that gap is invisible. This post is a map of it.

We'll trace a single temperature reading from a heat exchanger through to a cloud application, step by step. At each stage I'll show what the data looks like, what can go wrong, and what your code should account for.

## Stage 1: The physical measurement

A PT100 resistance temperature detector is embedded in a pipe. Its resistance changes with temperature — predictably, but not perfectly. Every PT100 has a tolerance class. Class B (the cheaper option) has an accuracy of ±0.3°C at 0°C, widening to ±1.3°C at 300°C.

Your sensor is already an approximation.

There's also the installation to consider. Is the sensor mounted correctly in the flow? Is there air around it that might affect the reading? Has it been in service for 10 years without recalibration? Sensor drift — where a sensor's output gradually deviates from the true value over time — is common and often undetected.

**What to remember:** The physical measurement has inherent uncertainty. Your data has error bars even before it leaves the sensor. ±1°C is normal. On an alert threshold of ±0.5°C, that matters.

## Stage 2: Signal transmission (4-20mA)

The PT100's resistance is converted to a 4-20mA current signal by a transmitter. This current travels over a cable to an input card in a PLC or remote I/O.

4-20mA is a very old standard and deliberately robust: it's a current loop, so resistance in the cable doesn't affect the reading, and a broken wire is detectable (0mA means fault, not zero). But it has limitations:

- The 16mA range (4 to 20) maps to your full engineering range (say, 0–200°C). Your resolution is limited by how finely the analog-to-digital converter on the input card can divide that range.
- Cable length and electromagnetic interference can introduce noise. A variable-frequency motor drive nearby can inject enough noise to make a reading jump by several counts.
- The current-to-value conversion uses a calibrated span. If the transmitter is configured for 0–200°C but the range has changed to 0–150°C and nobody reconfigured it, every reading is scaled wrong.

**What to remember:** By the time the physical measurement has become a digital number in the PLC, it has already been scaled, quantised, and potentially affected by electrical noise.

## Stage 3: The PLC scan cycle

The PLC reads its inputs, executes its logic, and updates its outputs — in a cycle that repeats every 10–100ms. When you request a value from the PLC, you get whatever was in memory from the last scan.

This introduces a latency of up to one scan cycle between the physical world and the PLC's view of it. For slow processes (temperatures, pressures, levels) this is irrelevant. For fast events (a valve that opens for 20ms), you might miss it entirely.

The timestamp on a PLC value is usually the time it was read by the SCADA system, not the time the physical event occurred. These can differ by seconds depending on polling frequency.

**What to remember:** PLC values are samples, not a continuous stream. Events faster than the scan cycle are invisible. The timestamp is often "when we asked", not "when it happened."

## Stage 4: SCADA / historian

The SCADA system polls the PLC and stores values in a historian — a time-series database optimised for industrial data. Historians use a technique called *exception reporting* or *deadbanding*: they only store a new value if the reading has changed by more than a configured threshold.

If your temperature is stable at 73.2°C, the historian might store that value once and then not again for an hour. This is efficient for storage, but it means:

- Querying the historian for "the value at 14:32:17" returns the last recorded value before that time — which might be from 14:00. If you're not aware of this, your trend looks flat because it is flat in the database, not necessarily flat in reality.
- The threshold for "changed enough to store" is a configuration parameter. If someone set it to 5°C to save storage, you'll never see small fluctuations.

**What to remember:** Historian data is not a complete record of what happened. It's a compressed approximation. Flat lines in your data might mean "nothing changed" or "we stopped recording small changes."

## Stage 5: The cloud pipeline

The historian exports data to your cloud pipeline via an MQTT broker, OPC-UA server, or a bespoke API. Each of these adds its own considerations:

- **Buffering:** If the connection drops, does the local system buffer unsent data? For how long? What happens at reconnect — does it send a burst or drop the gap?
- **Resampling:** If your cloud pipeline expects data at 1-minute intervals but the historian sends on-change, you'll need to resample. Forward-fill? Interpolate? The choice changes the data.
- **Time zones:** Industrial systems often use local time. Your cloud pipeline probably expects UTC. If the historian is in Norway (CET/CEST), you have a seasonal 1-hour offset to handle.

**What to remember:** The cloud pipeline introduces its own latency, buffering behaviour, and resampling decisions. Each one is a transformation that should be explicit in your schema and documented.

## Stage 6: Your application

By the time a temperature reading reaches your application, it has been:

1. Measured with inherent uncertainty (±1°C or more)
2. Transmitted as an analog signal and converted to digital
3. Sampled at the PLC scan cycle
4. Compressed by deadbanding in the historian
5. Transmitted over a network that may buffer or drop values
6. Resampled to fit your pipeline's cadence

The number in your database is not "the temperature at that time." It's the best available approximation, given all of the above.

## What to do about it

**Document the uncertainty.** Add metadata to your schema: sensor type, accuracy class, historian deadband, poll interval. Future you — or the developer debugging an anomaly at 2am — needs this.

**Be conservative with alert thresholds.** If your alert fires when temperature exceeds 95°C and your sensor accuracy is ±1.5°C at that range, your alert might be lying.

**Don't interpolate silently.** If you resample sparse historian data, make it visible. A value filled from a reading that's 30 minutes old is different from a value sampled 10 seconds ago.

**Validate range and rate-of-change.** A PT100 measuring a pipe temperature that jumps from 70°C to 500°C in one second is probably a sensor fault, not reality. Industrial processes have physical limits. Enforce them at ingestion.

**Ask the operators.** The people who run the plant know which sensors are reliable and which "always read a bit high." That knowledge is rarely in the documentation.

---

The sensor data you're working with is honest about what it is, if you know how to read it. The full stack is the context. Without it, you're optimising code on top of uncertainty you haven't accounted for.
