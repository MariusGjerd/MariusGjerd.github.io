---
title: "Wheatstone bridge with PT100"
description: "Heat the sensor and watch the bridge tip."
widget: wheatstone-pt100
subjects: [elektroteknikk-dc]
formulas: [temp-resistans, ohm, serie-r, spenningsdeler, thevenin]
posts: [/posts/pt100-wheatstone/]
thumb: thumb.svg
strings:
  - lab.wheatstone-pt100.circuitLabel
  - lab.wheatstone-pt100.temperature
  - lab.wheatstone-pt100.load
  - lab.wheatstone-pt100.load.dmm
  - lab.wheatstone-pt100.load.ads1115
  - lab.wheatstone-pt100.load.r1k
  - lab.wheatstone-pt100.rpt
  - lab.wheatstone-pt100.vout
  - lab.wheatstone-pt100.openCircuit
  - lab.wheatstone-pt100.current
  - lab.wheatstone-pt100.adc10
  - lab.wheatstone-pt100.adc10Note
  - lab.wheatstone-pt100.belowZero
  - lab.wheatstone-pt100.ads1115
  - lab.wheatstone-pt100.ads1115Note
  - lab.wheatstone-pt100.plotX
  - lab.wheatstone-pt100.plotY
  - lab.wheatstone-pt100.plotRef
  - lab.wheatstone-pt100.formulasTitle
  - lab.wheatstone-pt100.summaryTitle
  - lab.wheatstone-pt100.summaryBody
---

A PT100 is a platinum resistor that measures 100 ohms at 0 °C and gains 0.385 ohms for every degree. Here it sits in a Wheatstone bridge on 3.3 V, next to three fixed resistors. The meter in the middle shows the difference between the two midpoints A and B. The tiles show what two different converters make of that voltage. One is the 10-bit ADC (analog to digital converter) in an Arduino Uno. The other is an ADS1115, a small 16-bit ADC module that can measure the voltage between two pins.

Things to try:

- Drag the temperature below 0 and watch what the Arduino shows.
- Switch the load to 1 kΩ and see the output voltage drop.
- Compare the curve with the dashed straight line. The gap grows toward 200 °C.

## In short

At 0 °C the bridge is balanced and gives 0 V. Away from 0 °C it gives a few tens of millivolts, which is too little for a plain Arduino input and plenty for an ADS1115.
