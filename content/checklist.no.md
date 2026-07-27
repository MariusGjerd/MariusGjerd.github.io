---
title: "23 ting som stille ødelegger sensordataene dine"
date: 2026-07-27
draft: false
description: "En sjekkliste for deg som bygger programvare på industrielle sensordata. 23 konkrete måter tallet i databasen sluttet å stemme med den fysiske verden, og hva du bør se etter."
keywords: ["datakvalitet sensordata", "industriell datavalidering", "SCADA datakvalitet", "historian dødbånd", "IIoT datapipeline", "OPC kvalitetsflagg", "tidsseriedata", "OT dataflyt"]
summary: "Hver eneste av disse har utløst en reell hendelse et sted. De fleste er usynlige fra databasesiden."
images: ["/og/trust-your-sensor-data.png"]
---

Skriver du programvare som bruker data fra industrielle sensorer, er denne lista for deg.

Hvert punkt er en konkret måte tallet i databasen kan slutte å stemme med virkeligheten på. Ingen av dem gir en feilmelding. Det er nettopp problemet: dårlige industridata ser ikke dårlige ut. De ser ut som helt vanlige tall, og de ligger i tabellen side om side med de riktige.

Punktene er sortert etter hvor i kjeden feilen oppstår, fra sensoren og innover mot databasen. Det er også rekkefølgen du bør feilsøke i, bare motsatt vei.

**Seksten av punktene er noe en maskin kan sjekke for deg**, og de ligger ferdig skrevet i [`sensorcheck.py`](/checklist/code/): én fil, kun standardbiblioteket, ingenting å installere. Med følger en demo som lager et døgn med anleggsdata der sammendraget ser helt normalt ut, og som så finner elleve feil i de samme dataene. Gratis, ingen e-post.

{{< newsletter >}}

## Ute på sensoren

**1. Toleranseklasse.** En sensor er unøyaktig fra første stund. En PT100 i klasse B har en toleranse på ±0,3 °C ved 0 °C, og den øker til ±1,3 °C ved 300 °C. Har du satt en alarmgrense som er strammere enn dette, går alarmen på måleusikkerhet og ikke på prosessen.

**2. Kalibreringsdrift.** Sensorer endrer seg langsomt over år, og ingenting varsler deg når det skjer. Finn ut når sensoren sist ble kalibrert. Er det ingen som vet, er det i seg selv et svar på hvor mye du kan stole på tallet.

**3. Hvor sensoren sitter.** Plasseringen avgjør hva sensoren faktisk måler. Står en temperatursensor i en krok uten gjennomstrømning, eller har den luft rundt seg i stedet for væske, måler den temperaturen akkurat der den står. Det kan være flere grader unna temperaturen i selve prosessen. Sensoren gjør ikke noe galt, den svarer bare på et annet spørsmål enn det du tror du stiller.

**4. Responstid.** Temperatursensorer står som regel i en følerlomme, altså et lukket beskyttelsesrør som stikker inn i røret eller tanken. Lommen må varmes opp eller kjøles ned før sensoren inni merker at noe har endret seg. Endrer prosessen seg raskt, ligger måleverdien etter, fra noen sekunder til rundt et halvt minutt. Verdien du leser som "nå" beskriver altså noe som skjedde litt tidligere.

**5. Temperaturen i tavlen.** Måleomformeren, elektronikken som gjør sensorsignalet om til et 4-20 mA strømsignal, står vanligvis i en tavle. Blir tavlen varm om sommeren, forskyves målingen litt. Databladet oppgir hvor mye per grad, som en temperaturkoeffisient. Utslaget er sjelden stort, men det er en systematisk feil som følger årstiden, og den er umulig å se fra databasen.

## I signalveien

**6. Måleområdet er stilt inn feil.** Måleomformeren er satt opp for 0-200 °C. For tre år siden ble prosessen endret til 0-150 °C, men ingen stilte om omformeren. Siden da har alle avlesninger vært skalert feil med samme faktor. Tallene ser fortsatt helt rimelige ut, og det er derfor ingen har oppdaget det.

**7. Oppløsningen i inngangskortet.** Strømsignalet gjøres om til et digitalt tall av et analogt inngangskort. Hvor mange trinn kortet deler måleområdet inn i, bestemmer den minste endringen du i det hele tatt kan se. Regner du med finere oppløsning enn det i koden din, regner du på desimaler som ikke finnes.

**8. Elektrisk støy.** Ligger signalkabelen nær en frekvensomformer, altså den som styrer turtallet på en motor, kan kabelen plukke opp støy fra den. Avlesningen hopper noen trinn opp og ned, og hoppene kommer og går sammen med motoren.

**9. Levende null.** I 4-20 mA er 4 mA bunnen av måleområdet. 0 mA betyr at sløyfen er brutt, altså kabelbrudd eller en død omformer. Godtar koden din 0 som en gyldig måling, lagrer du feil som om de var ekte data. Dette er en vanlig tabbe, og den er vanskelig å oppdage, fordi null som regel er en fysisk troverdig verdi.

## I PLS-en

**10. Skannsyklusen.** En PLS leser inngangene, kjører programmet og skriver utgangene, om og om igjen, typisk hver 10 til 100 millisekund. Verdiene du får ut er øyeblikksbilder fra denne runden, ikke en sammenhengende måling. Skjer noe raskere enn syklusen, finnes det ikke i dataene i det hele tatt.

**11. Tidsstempelet sier når systemet spurte.** De fleste tidsstempler settes i det SCADA-systemet henter verdien, ikke i det målingen ble gjort. Hvor stor forskjellen er, avhenger av hvor ofte systemet spør. Ved sjelden spørring kan den bli flere sekunder.

**12. Skalering ingen har dokumentert.** Råverdien fra inngangskortet regnes om til grader eller bar av en skaleringsblokk i PLS-programmet. Faktorene ligger i logikken, gjerne skrevet av en innleid automatiker for mange år siden, og de står som regel ikke noe annet sted.

**13. Siste kjente verdi ved kommunikasjonsfeil.** Noen systemer beholder forrige verdi når sambandet ryker, i stedet for å markere dataene som ugyldige. I databasen ser en død sensor da nøyaktig lik ut som en prosess som ligger helt stabilt.

## I SCADA og historikkdatabasen

**14. Dødbånd.** En historikkdatabase lagrer ofte en ny verdi bare når den har endret seg mer enn en gitt terskel. Det betyr at en flat strek i dataene kan bety to forskjellige ting: at verdien virkelig lå stille, eller at den endret seg for lite til å bli lagret.

**15. Spørring på et tidspunkt gir deg siste lagrede verdi.** Spør du hva verdien var 14:32:17, får du den siste verdien som ble lagret før det tidspunktet. Den kan være fra 14:00. Svaret inneholder ingenting som forteller deg at tallet er en halvtime gammelt.

**16. Komprimering som mister detaljer.** Historikkdatabaser lagrer gjerne en kurve som noen få knekkpunkter i stedet for hver eneste måling. Det du leser tilbake er en tilnærming til den opprinnelige kurven, og det er med vilje.

**17. Kvalitetsflagget som blir borte underveis.** OPC og de fleste historikkdatabaser sender med et kvalitetsfelt for hver verdi: god, dårlig eller usikker. Mange dataflyter henter bare selve verdien og lar kvalitetsfeltet ligge igjen. Da har du kastet det ene feltet som forteller deg om du kan stole på tallet du beholdt.

**18. Data som kommer for sent.** Verdier som ankommer etter at nyere data allerede er lagret, settes inn bakover i tidsserien. Har du regnet ut et snitt eller en sum for den perioden før dette skjedde, er resultatet nå feil. Ingenting varsler deg om at grunnlaget har endret seg.

## I din egen dataflyt

**19. Hva skjer når sambandet ryker.** Enheten ute i felt gjør ett av to: den mellomlagrer alt og sender det samlet når forbindelsen er tilbake, eller den lar hullet stå tomt. Begge deler er forsvarlige løsninger. Men de gir helt forskjellige feil i dataene, og du må vite hvilken av dem du har.

**20. Lokal tid mot UTC.** Industrielle systemer kjører ofte på lokal tid. I Norge betyr det at tidsstemplene ligger én time foran UTC om vinteren og to om sommeren, mens dataflyten din sannsynligvis forventer UTC hele året.

**21. Sommertid.** Om høsten stilles klokken tilbake, og timen mellom 02 og 03 kommer to ganger. Du får to sett tidsstempler som ser helt like ut. Om våren hopper klokken over en time, og du får et hull som ikke er et driftsavbrudd. Begge deler ødelegger beregninger som antar at tiden går jevnt framover, og begge skjer på datoer du vet om lenge i forveien.

**22. Resampling lager verdier som aldri ble målt.** Skal du gjøre uregelmessige data om til faste intervaller, må du velge mellom å kopiere siste verdi framover, interpolere mellom to punkter, eller la hullet stå. Alle tre lager tall som ingen har målt. Kopierer du siste verdi framover fra en sensor som har sluttet å svare, får du en pen og helt stabil kurve som ikke betyr noen ting.

**23. Enheter.** Bar mot psi, celsius mot fahrenheit, kubikkmeter i timen mot liter i sekundet. Som regel oppdager noen det med en gang, fordi tallet blir absurd. Problemet er de gangene faktoren er liten nok til at resultatet fortsatt ser rimelig ut.

## Kortversjonen

Tre vaner dekker det meste:

**Ta vare på kvalitetsflagget.** Mangler databasen din en kolonne for det, lag en. Det er den enkleste forbedringen på hele lista, og den som oftest blir hoppet over.

**Sjekk hvor fort verdien endrer seg.** En rørtemperatur som går fra 70 til 500 °C på ett sekund er en feil, ikke en prosess. Fysiske systemer har fysiske grenser, og de grensene bør ligge inne der dataene kommer inn.

**Skriv ned det du vet om usikkerheten.** Sensortype, nøyaktighetsklasse, dødbånd, hvor ofte systemet spør. Lagre det sammen med dataene. Den som får bruk for det er deg selv, klokken to om natten, når du skal avgjøre om et utslag er ekte eller ikke.

Og én ting som ikke er teknisk: snakk med driftsoperatørene. De vet hvilken sensor som alltid leser litt høyt, og hvilken som ikke har vært til å stole på siden ombyggingen. Det står nesten aldri skrevet ned noe sted.

---

Vil du ha resonnementet bak punktene og ikke bare lista, går [Kan du stole på sensordataene dine?](/no/posts/trust-your-sensor-data/) gjennom hele veien fra en varmeveksler til en skyapplikasjon, og [Hva 4-20 mA egentlig betyr](/no/posts/what-4-20ma-actually-means/) tar for seg signalveien i detalj.

{{< newsletter >}}
