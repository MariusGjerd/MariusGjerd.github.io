---
title: "What 4-20mA actually means (and why your zero is at 4)"
date: 2026-07-26
draft: false
tags: ["4-20ma", "sensors", "plc", "scada", "data-quality", "data-lifecycle"]
categories: ["data-lifecycle"]
description: "The current loop is 70 years old and still carries most industrial sensor data. What the signal actually is, how it becomes a number, and where it lies."
keywords: ["4-20mA", "current loop", "transmitter", "PLC analog input", "NAMUR NE43", "signal noise", "industrial sensors", "sensor wiring"]
summary: "Most industrial sensor data still travels as a current between 4 and 20 milliamps. What the signal is, how it becomes a number in your database, and the ways it can quietly be wrong."
---

The temperature in your database was, at some point, a current in a wire. Not as a metaphor. Actual milliamps through copper. Almost everything your code knows about a physical process traveled as an electrical current through a cable before it became a number, and the rules for that journey were written in the 1950s.

The standard is called 4-20mA. It is old, it is analog, and it still carries most of the world's industrial sensor data. I have pulled the cables for it as an electrician and consumed the numbers from it as a developer, and the two jobs taught me very different things about the same signal. This post is what I wish the developer side knew.

{{< terms >}}
- **Transmitter:** the measurement converter mounted on or near the sensor. It turns the sensor's raw signal (the resistance of a PT100, for example) into a standardized 4-20 mA current.
- **PLC (programmable logic controller):** the industrial computer that runs the control logic of a plant. It reads inputs, executes its program and sets outputs, over and over, in real time. In this post we care about its analog inputs.
- **Span:** the measuring range the transmitter is configured with, meaning which physical values 4 and 20 mA correspond to. For example 0-200°C.
- **Frequency drive:** power electronics that control the speed of a motor by varying the frequency and voltage it is fed. Found on everything from fans to pumps, and it returns in the noise section below.
{{< /terms >}}

## Why your zero is at 4

A 4-20mA sensor maps its measuring range onto a current. 4 mA means the bottom of the range, 20 mA means the top. If the sensor measures 0-200°C, then 4 mA is 0 degrees and 20 mA is 200 degrees. Whatever sits between is your value, scaled linearly.

The first question everyone asks: why does zero sit at 4 and not at 0? The answer is the smartest part of the whole standard. 0 mA is reserved for failure. A healthy loop always carries at least 4 mA, so if the current drops to zero, something is wrong. Broken wire, dead transmitter, loop lost its power. The fault detection is built into the physics itself, which means a dead sensor cannot pretend to be a cold pipe.

There is a convention that makes this precise, NAMUR NE43. Normal measurement information lives between 3.8 and 20.5 mA. Anything below 3.6 mA or above 21.0 mA is a failure signal. Transmitters are configured to drive the current high or low when the sensor itself fails (this is called burnout direction), and your code needs to know which way your transmitters are set. A sensor failing upwards looks exactly like a process that is overheating, if you insist on treating it as a measurement.

So read the sensor documentation and know what to expect. A value below 3.6 mA is not a very cold pipe. It is a broken wire telling you about itself, in the only language it has.

{{< diagram src="scale-4-20.svg" caption="The whole scale in one picture: fault zones outside 3.6 and 21 mA, the NE43 margins in faint blue, dead bands in gray between them, and the linear mapping to engineering units underneath." >}}

## Why current and not voltage

Two reasons. First, current is the same everywhere in the loop. A voltage signal drops along the cable, and the longer the cable, the more you lose. Current does not have that problem. The loop can run through half a building and the milliamps arriving at the panel are the milliamps the transmitter set.

Second, a current loop shrugs off electrical noise far better than a voltage signal does. Industrial buildings are electrically loud places. More on that below, because I have a story.

The wiring itself is almost elegant. A typical loop is just two wires, and those same two wires carry both the power supply (usually 24 VDC) and the signal. The transmitter sits in the loop and regulates how much current it lets through. On the receiving end, the analog input card often just measures the current across a 250 ohm resistor, which turns 4-20 mA into 1-5 V that the card can read. Two wires, hundreds of meters, powered and talking at the same time.

{{< diagram src="current-loop.svg" caption="One loop, three components in series. The transmitter regulates the current, and the same milliamps flow through every point in the loop." >}}

## From current to a number

The current becomes a number through the transmitter's span. The span is the configured measuring range, and the transmitter maps it onto 4-20 mA linearly. With a span of 0-200°C, 12 mA means 100 degrees. Simple.

Here is the danger: the span lives in the transmitter, not in your code. If someone reconfigures the range to 0-150°C and does not tell anyone downstream, every value in your pipeline is scaled wrong from that moment on. Silently. The numbers still look plausible, no error, no gap, just a temperature that is no longer the temperature. If a measurement setup changes, the configuration and the documentation have to move together, because the person consuming the data three systems away has no other way to know.

{{< diagram src="span-danger.svg" caption="The span problem in one picture. The current is correct, the assumption is not, and nothing in the data tells you." >}}

(Some loops also run HART, a digital signal on top of the same 4-20 mA wires, which can carry diagnostics and configuration. Worth knowing it exists.)

One honest note about the last step. Inside the PLC, the analog card converts the current into raw integer counts, and software scales those counts into engineering units. I have seen those raw counts in systems I integrate against, and I have learned not to assume I know which scaling sits behind a value. The converter layer itself is a part of the chain I have not worked hands-on with yet. I start my industrial automation degree this fall and that layer is high on my list. When I have measured it myself, it gets its own post.

## Noise, or the days we spent chasing ghost data

From my electrician years. We were on a project in a large building, pulling cables from a huge number of sensors to local nodes, and from the nodes into a main panel where all the building's sensor data came together. Lots of cable, lots of runs, everything landed and terminated. Our part was done.

Then the automation guys started commissioning, and the data was garbage. Not dead, which would have been easier, but wrong and weird and jumpy. They spent days troubleshooting before someone found it: the sensor cables were unshielded, and long stretches of them were lying on the same cable ladder as high voltage power cables. The power lines were inducing noise straight into the signal wires, and every reading arriving in that panel had a little bit of the building's electrical activity mixed into it.

This is what electrical noise looks like from the data side: values that vibrate a few counts around the real reading, and sudden jumps that look like process changes but are actually a motor starting somewhere. Frequency drives are notorious for this. Shielding helps, grounding the shield correctly matters (grounding it at both ends can create its own problem, a ground loop), and physical distance from power cables is the cheapest fix of all. None of which your code can see. It just sees a temperature that trembles.

{{< diagram src="noise-coupling.svg" caption="The project in one drawing: unshielded signal cable on the same ladder as power cables. The transmitter sends a clean signal, the PLC reads a trembling one." >}}

## What your code should assume

The practical takeaways, same spirit as [the sensor data post](/posts/trust-your-sensor-data/):

- Treat anything below 3.6 mA or above 21 mA as a fault, never as a measurement. Do not let fault currents sneak into averages and aggregates.
- Know the burnout direction of your transmitters. A sensor that fails high should not page anyone about an overheating process.
- Do not trust that the span in the documentation is the span in the transmitter. Verify when you can, and log loudly when values stop making physical sense.
- Expect a few counts of noise. Alert thresholds tighter than the noise floor produce alerts about electricity, not about the process.
- If you can, log the raw mA or counts alongside the scaled value. It is the only way to debug a scaling problem after the fact.

{{< diagram src="code-checks.svg" caption="The whole list as an ingestion flow: fault currents take the alarm path, everything else gets scaled, validated and stored with the raw value." >}}

And the biggest one, the assumption behind all the others: assume that nobody has the full picture. The electrician who pulled the cable, the automation tech who commissioned the system, the project engineer sitting on the datasheets, and you, the developer consuming the number at the end. Every one of them knows their own layer. Nobody is checking yours against theirs unless you ask.

The current loop is honest. It is your assumptions about it that lie.

This post is step two in a chain. Step one, what happens to the value after it becomes a number, is here: [Can you trust your sensor data?](/posts/trust-your-sensor-data/)
