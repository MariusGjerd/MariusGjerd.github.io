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

Every item here is a specific way the number in your database can stop matching the physical world. None of them raise an error. That's the problem: bad industrial data doesn't look bad. It looks like an ordinary number, and it sits in your table next to all the good ones.

The items are ordered by where in the chain the fault happens, starting at the sensor and working inward. That's also the order to debug in, just backwards.

**Sixteen of these are things a machine can check for you**, and they're written up as [`sensorcheck.py`](/checklist/code/): one file, standard library only, nothing to install. It comes with a demo that builds a day of plant data where the summary looks completely normal, then finds eleven problems in that same data. Free, no email.

{{< newsletter >}}

## At the sensor

**1. Tolerance class.** A sensor is inaccurate from the start. A PT100 in class B has a tolerance of ±0.3°C at 0°C, widening to ±1.3°C at 300°C. If your alert threshold is tighter than that, the alert fires on measurement uncertainty rather than on the process.

**2. Calibration drift.** Sensors change slowly over years, and nothing tells you it's happening. Find out when each sensor was last calibrated. If nobody knows, that is itself an answer about how much you can trust the number.

**3. Where the sensor sits.** Placement decides what a sensor actually measures. A temperature sensor in a pocket with no flow past it, or with air around it instead of liquid, measures the temperature exactly where it sits. That can be several degrees away from the temperature in the process itself. The sensor isn't doing anything wrong. It's answering a different question from the one you think you asked.

**4. Response time.** Temperature sensors usually sit inside a thermowell, a closed protective tube that reaches into the pipe or tank. The well itself has to heat up or cool down before the sensor inside notices anything changed. When the process moves quickly, the reading lags behind, from a few seconds to around half a minute. The value you read as "now" describes something that happened slightly earlier.

**5. Cabinet temperature.** The transmitter, the electronics that turn the sensor signal into a 4-20mA current, normally sits in a cabinet. When that cabinet warms up in summer, the measurement shifts slightly. The datasheet states how much per degree, as a temperature coefficient. The effect is rarely large, but it's a systematic error that follows the seasons, and it is impossible to see from the database.

## In the signal path

**6. The range is configured wrong.** The transmitter is set up for 0-200°C. Three years ago the process changed to 0-150°C, but nobody reconfigured the transmitter. Every reading since has been scaled wrong by the same factor. The numbers still look entirely reasonable, which is why nobody has noticed.

**7. Resolution in the input card.** The current signal is converted to a digital number by an analog input card. How many steps that card divides the range into sets the smallest change you can possibly see. Ask for finer resolution than that in your code and you're calculating on decimals that don't exist.

**8. Electrical noise.** If the signal cable runs near a variable-frequency drive, the thing that controls motor speed, it can pick up interference from it. The reading jumps a few steps up and down, and the jumps come and go with the motor.

**9. Live zero.** In 4-20mA, 4mA is the bottom of the range. 0mA means the loop is broken: a cut cable or a dead transmitter. If your code accepts 0 as a valid measurement, you're storing faults as though they were real data. This is a common mistake and a hard one to spot, because zero is usually a physically plausible value.

## At the PLC

**10. The scan cycle.** A PLC reads its inputs, runs the program and writes its outputs, over and over, typically every 10 to 100 milliseconds. The values you get out are snapshots from that loop, not a continuous measurement. Anything faster than the cycle doesn't exist in your data at all.

**11. The timestamp says when the system asked.** Most timestamps are set when the SCADA system fetched the value, not when the measurement was taken. How big the difference is depends on how often the system polls. With infrequent polling it can be several seconds.

**12. Scaling nobody documented.** The raw value from the input card is converted to degrees or bar by a scaling block in the PLC program. The factors live in that logic, often written by a contractor years ago, and usually aren't written down anywhere else.

**13. Last known value on a comms failure.** Some systems keep the previous value when the link drops instead of marking the data invalid. In the database, a dead sensor then looks exactly like a process sitting perfectly stable.

## At the SCADA system and historian

**14. Deadband.** A historian often stores a new value only when it has moved more than a set threshold. That means a flat line in your data can mean two different things: the value really did sit still, or it changed too little to be recorded.

**15. Querying a timestamp gives you the last stored value.** Ask what the value was at 14:32:17 and you get the last value stored before that moment. It might be from 14:00. Nothing in the response tells you the number is half an hour old.

**16. Compression that loses detail.** Historians tend to store a curve as a handful of inflection points rather than every measurement. What you read back is an approximation of the original curve, and it's meant to be.

**17. The quality flag that gets lost on the way.** OPC and most historians send a quality field with every value: good, bad or uncertain. Many pipelines fetch only the value and leave the quality field behind. You've then thrown away the one field that tells you whether to trust the one you kept.

**18. Data that arrives late.** Values that turn up after newer data is already stored get inserted backwards into the series. If you computed an average or a total for that period beforehand, the result is now wrong, and nothing tells you the basis changed.

## In your own pipeline

**19. What happens when the link drops.** The device in the field does one of two things: it buffers everything and sends it in one go when the connection returns, or it leaves the gap empty. Both are defensible. But they produce completely different errors in your data, and you need to know which one you have.

**20. Local time against UTC.** Industrial systems often run on local time. In Norway that means timestamps sit one hour ahead of UTC in winter and two in summer, while your pipeline probably expects UTC all year.

**21. Daylight saving.** In autumn the clocks go back and the hour between 02 and 03 happens twice. You get two sets of timestamps that look identical. In spring an hour is skipped and you get a gap that isn't an outage. Both break any calculation that assumes time moves forward evenly, and both happen on dates you know well in advance.

**22. Resampling creates values nobody measured.** To turn irregular data into fixed intervals you have to choose: carry the last value forward, interpolate between two points, or leave the gap. All three produce numbers nobody measured. Carry the last value forward from a sensor that stopped responding and you get a clean, perfectly stable curve that means nothing.

**23. Units.** Bar against psi, celsius against fahrenheit, cubic metres per hour against litres per second. Usually somebody catches it immediately, because the number goes absurd. The trouble is the cases where the factor is small enough that the result still looks reasonable.

## The short version

Three habits cover most of it:

**Keep the quality flag.** If your database has no column for it, add one. It's the simplest improvement on this whole list, and the one most often skipped.

**Check how fast the value moves.** A pipe temperature going from 70 to 500°C in one second is a fault, not a process. Physical systems have physical limits, and those limits belong at the point where data comes in.

**Write down what you know about the uncertainty.** Sensor type, accuracy class, deadband, how often the system polls. Store it alongside the data. The person who needs it is you, at two in the morning, deciding whether a spike is real.

And one that isn't technical: talk to the operators. They know which sensor always reads a bit high, and which one hasn't been trustworthy since the refit. It's almost never written down anywhere.

---

If you want the reasoning behind these rather than just the list, [Can you trust your sensor data?](/posts/trust-your-sensor-data/) walks the whole path from a heat exchanger to a cloud application, and [What 4-20mA actually means](/posts/what-4-20ma-actually-means/) covers the signal path in detail.

{{< newsletter >}}
