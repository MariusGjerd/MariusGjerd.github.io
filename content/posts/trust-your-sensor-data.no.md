---
title: "Kan du stole på sensordataene dine? En utvikleres guide til hele stacken"
date: 2026-07-07
draft: false
tags: ["data", "sensorer", "iot", "scada", "datakvalitet", "data-lifecycle"]
categories: ["data-lifecycle"]
description: "Alle datapipelines starter med en sensor. Her er hva som skjer med dataene mellom den fysiske verden og applikasjonen din — og hvor de stille begynner å lyve for deg."
keywords: ["sensordatakvalitet", "SCADA-data", "IIoT datapipeline", "OT-data", "Modbus", "4-20mA", "historikk", "datatillit"]
summary: "Sensordataene dine har blitt transformert, komprimert, tidsstemplet og tilnærmet før de når applikasjonen din. Her er hele reisen — og hvor du bør være skeptisk."
---

Alle datapipelines i industriell IoT starter på samme måte: noe fysisk skjer, en sensor registrerer det, og et tall dukker opp i databasen din.

Gapet mellom «noe fysisk skjer» og «et tall dukker opp i databasen din» er der de fleste datakvalitetsproblemene bor. Hvis du bare har jobbet på databasesiden, er det gapet usynlig. Dette innlegget er et kart over det.

Vi skal følge en enkelt temperaturavlesning fra en varmeveksler hele veien til en skyapplikasjon, steg for steg. På hvert trinn viser jeg hva dataene ser ut som, hva som kan gå galt, og hva koden din bør ta høyde for.

## Steg 1: Den fysiske målingen

En PT100 motstandstemperaturføler er montert i et rør. Motstanden endrer seg med temperaturen — forutsigbart, men ikke perfekt. Alle PT100-er har en toleranseklasse. Klasse B (det billigere alternativet) har en nøyaktighet på ±0,3°C ved 0°C, som øker til ±1,3°C ved 300°C.

Sensoren din er allerede en tilnærming.

Det er også installasjonen å tenke på. Er sensoren montert riktig i strømmen? Er det luft rundt den som kan påvirke avlesningen? Har den vært i drift i 10 år uten rekalibrering? Sensordrift — der en sensors output gradvis avviker fra den sanne verdien over tid — er vanlig og ofte uoppdaget.

**Husk:** Den fysiske målingen har iboende usikkerhet. Dataene dine har feilmarginer allerede før de forlater sensoren. ±1°C er normalt. På en varslingsterskel på ±0,5°C betyr det noe.

## Steg 2: Signaloverføring (4-20mA)

PT100-ens motstand konverteres til et 4-20mA strømsignal av en transmitter. Denne strømmen overføres via kabel til et inngangskort i en PLS eller fjern-I/O.

4-20mA er en svært gammel standard og bevisst robust: det er en strømsløyfe, så motstand i kabelen påvirker ikke avlesningen, og en brutt ledning er detekterbar (0mA betyr feil, ikke null). Men den har begrensninger:

- 16mA-området (4 til 20) tilsvarer hele det tekniske området (for eksempel 0–200°C). Oppløsningen din begrenses av hvor fint analog-til-digital-omformeren på inngangskortet kan dele opp det området.
- Kabellengde og elektromagnetisk interferens kan introdusere støy. Et variabelfrekvensomformermotor i nærheten kan injisere nok støy til å få en avlesning til å hoppe med flere trinn.
- Konverteringen fra strøm til verdi bruker et kalibrert spenn. Hvis transmitteren er konfigurert for 0–200°C, men området er endret til 0–150°C og ingen har rekonfigurert det, er alle avlesninger feil skalert.

**Husk:** Innen den fysiske målingen har blitt et digitalt tall i PLSen, er den allerede skalert, kvantisert og potensielt påvirket av elektrisk støy.

## Steg 3: PLSens skansyklus

PLSen leser inngangene sine, utfører logikken sin og oppdaterer utgangene — i en syklus som gjentas hvert 10–100ms. Når du ber om en verdi fra PLSen, får du det som lå i minnet fra siste skan.

Dette introduserer en forsinkelse på opptil én skansyklus mellom den fysiske verden og PLSens bilde av den. For trege prosesser (temperaturer, trykk, nivåer) er dette irrelevant. For raske hendelser (en ventil som åpner i 20ms) kan du gå glipp av den helt.

Tidsstempelet på en PLS-verdi er vanligvis tidspunktet den ble lest av SCADA-systemet, ikke tidspunktet den fysiske hendelsen skjedde. Disse kan avvike med sekunder avhengig av pollingfrekvens.

**Husk:** PLS-verdier er prøver, ikke en kontinuerlig strøm. Hendelser raskere enn skansyklusen er usynlige. Tidsstempelet er ofte «da vi spurte», ikke «da det skjedde».

## Steg 4: SCADA / historikk

SCADA-systemet poller PLSen og lagrer verdier i en historikk (historian) — en tidsserie-database optimalisert for industrielle data. Historian-systemer bruker en teknikk kalt *unntaksrapportering* eller *deadbanding*: de lagrer bare en ny verdi hvis avlesningen har endret seg med mer enn en konfigurert terskel.

Hvis temperaturen din er stabil på 73,2°C, kan historikken lagre den verdien én gang og deretter ikke igjen på en time. Dette er effektivt for lagring, men det betyr:

- Spørring i historikken etter «verdien kl. 14:32:17» returnerer den siste registrerte verdien før det tidspunktet — som kan være fra kl. 14:00. Hvis du ikke er klar over dette, ser trenden din flat ut fordi den er flat i databasen, ikke nødvendigvis flat i virkeligheten.
- Terskelen for «endret nok til å lagre» er en konfigurasjonsparameter. Hvis noen satte den til 5°C for å spare lagringsplass, vil du aldri se små svingninger.

**Husk:** Historikkdata er ikke et komplett register over hva som skjedde. Det er en komprimert tilnærming. Flate linjer i dataene kan bety «ingenting endret seg» eller «vi sluttet å registrere små endringer».

## Steg 5: Skypipelinen

Historikken eksporterer data til skypipelinen din via en MQTT-broker, OPC-UA-server eller et spesialtilpasset API. Hvert av disse legger til egne hensyn:

- **Buffering:** Hvis tilkoblingen faller, bufrer det lokale systemet usendte data? Hvor lenge? Hva skjer ved gjenkobling — sender det en burst eller slipper det gapet?
- **Resampling:** Hvis skypipelinen forventer data i 1-minuttsintervaller, men historikken sender ved endring, må du resample. Forward-fill? Interpolering? Valget endrer dataene.
- **Tidssoner:** Industrielle systemer bruker ofte lokal tid. Skypipelinen din forventer sannsynligvis UTC. Hvis historikken er i Norge (CET/CEST), har du en sesongbasert 1-times forskyvning å håndtere.

**Husk:** Skypipelinen introduserer sin egen forsinkelse, bufferingsatferd og resampling-beslutninger. Hver av dem er en transformasjon som bør være eksplisitt i skjemaet ditt og dokumentert.

## Steg 6: Applikasjonen din

Innen en temperaturavlesning når applikasjonen din, har den blitt:

1. Målt med iboende usikkerhet (±1°C eller mer)
2. Overført som et analogsignal og konvertert til digitalt
3. Prøvetatt ved PLSens skansyklus
4. Komprimert av deadbanding i historikken
5. Overført over et nettverk som kan bufre eller miste verdier
6. Resampled for å passe pipelinens kadense

Tallet i databasen din er ikke «temperaturen på det tidspunktet». Det er den beste tilgjengelige tilnærmingen, gitt alt det ovenstående.

## Hva du kan gjøre med det

**Dokumenter usikkerheten.** Legg til metadata i skjemaet ditt: sensortype, nøyaktighetsklasse, historian-deadband, pollingintervall. Fremtidens deg — eller utvikleren som feilsøker en anomali kl. 02:00 — trenger dette.

**Vær konservativ med varslingsterskler.** Hvis varselet ditt utløses når temperaturen overskrider 95°C og sensornøyaktigheten din er ±1,5°C i det området, lyver kanskje varselet.

**Ikke interpoler stille.** Hvis du resampler sparsomme historikkdata, gjør det synlig. En verdi fylt fra en avlesning som er 30 minutter gammel, er annerledes enn en verdi prøvetatt for 10 sekunder siden.

**Valider område og endringstakt.** En PT100 som måler en rørtemperatur som hopper fra 70°C til 500°C på ett sekund, er sannsynligvis en sensorfeil, ikke virkelighet. Industrielle prosesser har fysiske grenser. Håndhev dem ved inntak.

**Spør operatørene.** Menneskene som drifter anlegget, vet hvilke sensorer som er pålitelige og hvilke som «alltid leser litt høyt». Den kunnskapen er sjelden i dokumentasjonen.

---

Sensordataene du jobber med er ærlige om hva de er, hvis du vet hvordan du skal lese dem. Hele stacken er konteksten. Uten den optimaliserer du kode på toppen av usikkerhet du ikke har tatt høyde for.
