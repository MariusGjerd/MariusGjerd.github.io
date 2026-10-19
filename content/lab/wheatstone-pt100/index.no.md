---
title: "Wheatstone-bro med PT100"
description: "Varm sensoren og se broen tippe."
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

En PT100 er en platinamotstand. Den har 100 ohm ved 0 °C, og motstanden øker med 0,385 ohm per grad. Her sitter den i en Wheatstone-bro på 3,3 V sammen med tre faste motstander. Måleren i midten viser spenningsforskjellen mellom midtpunktene A og B. Flisene viser hva to ulike omformere får ut av denne spenningen. Den ene er ADC-en i en Arduino Uno (ADC betyr analog-til-digital-omformer), som har 10 bit. Den andre er en ADS1115, en liten ADC-modul med 16 bit som kan måle spenningen mellom to pinner.

Prøv dette:

- Dra temperaturen under 0 og se hva Arduinoen viser.
- Bytt last til 1 kΩ og se at utgangsspenningen faller.
- Sammenlign kurven med den stiplede, rette linjen. Avstanden øker mot 200 °C.

## Kort sagt

Ved 0 °C er broen i balanse og gir 0 V. Ellers gir den noen titalls millivolt. Det er for lite for en vanlig Arduino-inngang, men god margin for en ADS1115.
