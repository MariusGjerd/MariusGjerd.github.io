---
title: "23 ting som stille ødelegger sensordataene dine"
date: 2026-07-27
draft: false
description: "En sjekkliste for deg som bygger programvare på industrielle sensordata. 23 konkrete måter tallet i databasen sluttet å stemme med den fysiske verden, og hva du bør se etter."
keywords: ["datakvalitet sensordata", "industriell datavalidering", "SCADA datakvalitet", "historian dødbånd", "IIoT datapipeline", "OPC kvalitetsflagg", "tidsseriedata", "OT dataflyt"]
summary: "Hver eneste av disse har utløst en reell hendelse et sted. De fleste er usynlige fra databasesiden."
images: ["/og/trust-your-sensor-data.png"]
---

Skriver du programvare som spiser industrielle sensordata, er denne lista for deg.

Hvert punkt her er en konkret måte tallet i databasen sluttet å stemme med den fysiske verden. Ingen av dem kaster en feilmelding. Det er nettopp problemet: dårlige industridata ser nesten aldri dårlige ut. De ser ut som et rent, troverdig tall, og de ligger i tabellen din side om side med alle de riktige.

Jeg har gruppert dem etter hvor i kjeden de oppstår, for det er sånn du feilsøker dem. Jobb bakover fra databasen mot røret.

**Seksten av punktene er noe en maskin kan fange opp**, og de ligger ferdig skrevet i [`sensorcheck.py`](/checklist/code/): én fil, kun standardbiblioteket, ingenting å installere, pluss en demo som skriver ut et døgn med anleggsdata der sammendraget ser helt fornuftig ut og dataene er fulle av hull. Gratis, ingen e-post.

{{< newsletter >}}

## Ute på giveren

**1. Toleranseklasse.** Giveren har feilmarginer før målingen har beveget seg en centimeter. En PT100 i klasse B holder ±0,3 °C ved 0 °C, og marginen vokser til ±1,3 °C ved 300 °C. Er alarmgrensen din strammere enn nøyaktigheten til giveren, er alarmen støy.

**2. Kalibreringsdrift.** Givere sklir vekk fra sannheten langsomt, over år, og nesten ingenting varsler deg om at det skjer. Spør når giveren sist ble kalibrert. Vet ingen det, har du svaret.

**3. Montasjen.** En temperaturgiver som står i en dødsone i stedet for i strømningen, eller som har en luftlomme rundt seg, måler noe helt reelt. Bare ikke det du tror den måler.

**4. Responstid.** En giver som står i en dykklomme henger etter den faktiske prosessen med titalls sekunder, fordi lommen selv har termisk masse. "Nåværende" temperatur beskriver i praksis noe som skjedde nettopp.

**5. Omgivelsene rundt måleomformeren.** Elektronikken som gjør målingen om til et signal står i en tavle som blir varm om sommeren. Derfor oppgir databladet en temperaturkoeffisient for omformeren.

## I signalveien

**6. Feil måleområde.** Måleomformeren er stilt inn for 0-200 °C. Prosessen ble skalert om til 0-150 °C for tre år siden, og ingen rørte omformeren. Alle avlesninger siden da har vært feil med en jevn, fullstendig troverdig faktor.

**7. Oppløsning i analog-til-digital-omformingen.** De 16 mA (4 til 20) deles på bitoppløsningen til inngangskortet. Den divisjonen bestemmer den minste endringen du i det hele tatt kan oppdage. Ber du om finere presisjon enn det i applikasjonen, ber du om oppdiktede tall.

**8. Elektrisk støy.** En frekvensomformer som styrer en motor i nærheten av signalkabelen kan sende inn nok støy til å flytte avlesningen flere trinn. Støyen kommer og går med motoren.

**9. Levende null.** I 4-20 mA er 4 mA bunnen av området, og 0 mA betyr at sløyfen er brutt. Behandler koden din 0 som en gyldig måling, registrerer du døde givere som ekte nullavlesninger. Denne er vanlig og den er ekkel, for null er ofte en fysisk troverdig verdi.

## I PLS-en

**10. Skannsyklus.** PLS-en leser innganger, kjører logikken og skriver utganger i en løkke, typisk hver 10-100 ms. Verdiene dine er stikkprøver fra den løkken, ikke en sammenhengende strøm. Alt som skjer raskere enn syklusen har aldri eksistert, sett fra dataene.

**11. Tidsstempelet er som regel et spørretidspunkt.** Det forteller når SCADA-systemet spurte, ikke når det fysiske skjedde. Avhengig av spørrefrekvensen skiller de seg med sekunder.

**12. Udokumentert skalering.** Råtall gjøres om til tekniske enheter av en skaleringsblokk inne i PLS-programmet. Faktorene ligger i stigelogikk skrevet av en innleid automatiker i 2014.

**13. Siste kjente verdi ved feil.** Noen systemer holder på forrige verdi når kommunikasjonen ryker, i stedet for å flagge dataene som ugyldige. En frossen giver og en genuint stabil prosess ser helt like ut i tabellen din.

## I SCADA og historikkdatabasen

**14. Dødbånd.** Historikkdatabaser lagrer gjerne en ny verdi bare når den har endret seg mer enn en innstilt terskel. En flat strek i dataene kan bety "ingenting endret seg", eller den kan bety "vi sluttet å bry oss om å lagre".

**15. Spørring på tidspunkt lyver høflig.** Spør databasen om verdien 14:32:17, og du får siste lagrede verdi før det tidspunktet, kanskje fra 14:00. Ingenting i svaret forteller at tallet er 32 minutter gammelt.

**16. Tapsgivende komprimering.** Historikkdatabaser bruker algoritmer som svingdør for å lagre en kurve som noen få punkter. Det du leser tilbake er en rekonstruksjon, og den er med vilje ikke originalen.

**17. Kvalitetsflagg som forsvinner.** OPC og de fleste historikkdatabaser bærer et kvalitets- eller statusfelt sammen med hver verdi: god, dårlig, usikker. En stor andel dataflyter henter verdikolonnen og dropper kvalitetskolonnen. Det er å kaste det ene feltet som forteller om du kan stole på det andre.

**18. Etterfylling skriver om historien.** Data som kommer for sent settes inn bak lesepunktet ditt. Alle aggregater du regnet ut før etterfyllingen er nå feil, og ingen sa fra.

## I din egen dataflyt

**19. Bufring ved gjenoppkobling.** Når sambandet ryker: bufrer enheten ute i felt og sender alt i en byge når den kommer tilbake, eller dropper den hullet? Begge deler er forsvarlig. De ødelegger dataene på helt ulike måter, og du må vite hvilken du har.

**20. Lokal tid.** Industrielle systemer kjører ofte lokal tid. Norske anlegg betyr CET og CEST, så du arver en sesongavhengig timesforskyvning mot en dataflyt som forventer UTC.

**21. Klokken stilles to ganger i året.** Om høsten gjentar en time seg, så du får doble tidsstempler. Om våren forsvinner en time, så du får et hull som ikke er et driftsavbrudd. Begge deler knekker naive tidsserie-sammenstillinger, og begge skjer på en dato du kan planlegge for.

**22. Resampling dikter opp data.** Fremoverfylling, interpolering eller sletting er tre ulike svar, og alle tre lager verdier som aldri ble målt. Fremoverfyller du en død giver, får du en nydelig stabil kurve som ikke betyr noe som helst.

**23. Enhetsomregning.** Bar mot psi, celsius mot fahrenheit, m³/h mot l/s. Som regel oppdager noen det. Når ingen gjør det, pleier det å bli dyrt.

## Kortversjonen

Tre vaner dekker det meste av dette:

**Ta vare på kvalitetsflagget.** Har ikke skjemaet ditt en kolonne for det, lag en. Det er den billigste datakvalitetsgevinsten som finnes, og nesten alle hopper over den.

**Valider endringsrate ved innlesing.** En rørtemperatur som går fra 70 °C til 500 °C på ett sekund er en feil, ikke en prosess. Fysiske systemer har fysiske grenser, så håndhev dem i døren.

**Skriv ned usikkerheten.** Givertype, nøyaktighetsklasse, dødbåndsinnstilling, spørreintervall, alt sammen som metadata ved siden av dataene. Den som trenger det er deg selv, klokken to om natten, mens du prøver å finne ut om et avvik er ekte.

Og en som ikke er teknisk: spør driftsoperatørene. De vet hvilken giver som leser litt høyt og hvilken som har vært upålitelig siden ombyggingen. Den kunnskapen står nesten aldri skrevet ned noe sted.

---

Vil du ha resonnementet bak punktene og ikke bare lista, går [Kan du stole på sensordataene dine?](/no/posts/trust-your-sensor-data/) gjennom hele veien fra en varmeveksler til en skyapplikasjon, og [Hva 4-20 mA egentlig betyr](/no/posts/what-4-20ma-actually-means/) tar signalveien i detalj.

{{< newsletter >}}
