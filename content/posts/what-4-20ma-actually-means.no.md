---
title: "Hva 4-20mA faktisk betyr (og hvorfor null ligger på 4)"
date: 2026-07-26
draft: false
tags: ["4-20ma", "sensorer", "pls", "scada", "datakvalitet", "data-lifecycle"]
categories: ["data-lifecycle"]
description: "Strømsløyfen er 70 år gammel og bærer fortsatt mesteparten av verdens industrielle sensordata. Hva signalet faktisk er, hvordan det blir et tall, og hvor det lyver."
keywords: ["4-20mA", "strømsløyfe", "transmitter", "PLS analog inngang", "NAMUR NE43", "signalstøy", "industrielle sensorer", "sensorkabling"]
images: ["/og/what-4-20ma-no.png"]
summary: "Mesteparten av industriell sensordata reiser fortsatt som strøm mellom 4 og 20 milliampere. Hva signalet er, hvordan det blir et tall i databasen din, og måtene det kan være feil på uten at du merker det."
---

Temperaturen i databasen din var på et tidspunkt en strøm i en kabel. Ikke i overført betydning. Faktiske milliampere gjennom kobber. Nesten alt koden din vet om en fysisk prosess har reist som strøm gjennom en kabel før det ble et tall, og reglene for den reisen ble skrevet på 1950-tallet.

Standarden heter 4-20mA. Den er gammel, den er analog, og den bærer fortsatt mesteparten av verdens industrielle sensordata. Jeg har trukket kablene for den som elektriker og brukt tallene fra den som utvikler, og de to jobbene lærte meg helt forskjellige ting om det samme signalet. Dette innlegget er det jeg skulle ønske utviklersiden visste.

{{< terms title="Ordene i dette innlegget, i klarspråk" >}}
- **Transmitter:** måleomformeren som sitter på eller ved sensoren. Den gjør om råsignalet fra sensoren (for eksempel motstanden i en PT100) til et standardisert 4-20 mA-signal.
- **PLS (programmerbar logisk styring):** industridatamaskinen som kjører styringslogikken i et anlegg. Den leser innganger, kjører programmet sitt og setter utganger, om og om igjen, i sanntid. I dette innlegget er det analoginngangene dens vi bryr oss om.
- **Spann:** måleområdet transmitteren er konfigurert med, altså hvilke fysiske verdier 4 og 20 mA tilsvarer. For eksempel 0-200°C.
- **Frekvensomformer:** kraftelektronikk som styrer turtallet på en motor ved å variere frekvensen og spenningen motoren mates med. Står i alt fra vifter til pumper, og dukker opp igjen i støykapittelet lenger ned.
{{< /terms >}}

## Hvorfor null ligger på 4

En 4-20mA-sensor fordeler måleområdet sitt over strømmen: 4 mA er bunnen av området, 20 mA er toppen. Måler den 0-200°C, tilsvarer 4 mA 0 grader og 20 mA 200 grader. Verdien din ligger et sted mellom, lineært skalert.

Det første alle lurer på: hvorfor ligger null på 4 og ikke på 0? Svaret er det smarteste i hele standarden. 0 mA er reservert for feil. En intakt sløyfe bærer alltid minst 4 mA, så hvis strømmen faller til null, er noe galt. Kabelbrudd, død transmitter, eller en sløyfe som har mistet forsyningen. Feildeteksjonen ligger i selve fysikken, og dermed kan ikke en død sensor utgi seg for å være et kaldt rør.

Det finnes en konvensjon som gjør dette presist, NAMUR NE43. Normal måleinformasjon ligger mellom 3,8 og 20,5 mA. Alt under 3,6 mA eller over 21,0 mA er feilsignal. Transmittere konfigureres til å drive strømmen enten høyt eller lavt når selve sensoren ryker (det kalles burnout-retning), og koden din må vite hvilken vei dine er satt opp. En sensor som feiler oppover ser nemlig helt lik ut som en prosess på vei mot overoppheting, hvis du insisterer på å lese den som en måling.

Så les databladet og vit hva du skal forvente. En verdi under 3,6 mA er ikke et iskaldt rør. Det er et kabelbrudd som melder fra om seg selv, på det eneste språket det har.

{{< diagram src="scale-4-20.svg" caption="Hele skalaen i ett bilde: feilsoner utenfor 3,6 og 21 mA, NE43-marginene i svakt blått, dødbånd i grått mellom dem, og under: den lineære mappingen til fysiske verdier." >}}

## Hvorfor strøm og ikke spenning

To grunner. Den første: strømmen er lik i hele sløyfen. Et spenningssignal faller langs kabelen, og jo lengre kabel, jo større tap. Det problemet har ikke strøm. Sløyfen kan gå gjennom et halvt bygg, og milliamperene som kommer frem til tavlen er de samme som transmitteren sendte.

Den andre: en strømsløyfe tåler elektrisk støy mye bedre enn et spenningssignal. Og det er mye elektrisk støy i et industribygg. Mer om det lenger ned, der har jeg en historie.

Selve kablingen er nesten elegant. En typisk sløyfe består av bare to ledere, og de samme to lederne bærer både forsyningen (som regel 24 VDC) og signalet. Transmitteren sitter i sløyfen og regulerer hvor mye strøm den slipper gjennom. I andre enden måler analogkortet gjerne strømmen over en 250 ohm-motstand, som gjør 4-20 mA om til 1-5 V som kortet kan lese. To ledere, hundrevis av meter, forsyning og signal i samme par.

{{< diagram src="current-loop.svg" caption="Én sløyfe, tre komponenter i serie. Transmitteren regulerer strømmen, og de samme milliamperene går gjennom alle punktene i sløyfen." >}}

## Fra strøm til tall

Det er spannet i transmitteren som bestemmer hvilket tall strømmen blir til. Spannet er det konfigurerte måleområdet, og transmitteren fordeler det lineært over 4-20 mA. Med et spann på 0-200°C betyr 12 mA 100 grader. Enkelt.

Og her er faren: spannet bor i transmitteren, ikke i koden din. Konfigurerer noen om området til 0-150°C uten å si fra nedstrøms, er alle verdiene i pipelinen din feilskalert fra det øyeblikket. I stillhet. Tallene ser fortsatt fornuftige ut, ingen feilmelding, ingen hull i dataene, bare en temperatur som ikke lenger er temperaturen. Endrer du et måleoppsett, må konfigurasjon og dokumentasjon følge hverandre, for den som bruker dataene tre systemer lenger ned har ingen annen måte å oppdage det på.

{{< diagram src="span-danger.svg" caption="Spann-problemet i ett bilde: strømmen er riktig, antagelsen er feil, og ingenting i dataene avslører det." >}}

(Noen sløyfer kjører også HART, et digitalt signal oppå de samme to lederne, som kan bære diagnostikk og konfigurasjon. Verdt å vite om.)

Én ærlig fotnote om det aller siste steget. Inne i PLS-en gjør analogkortet strømmen om til rå heltallsverdier, counts, og programvare skalerer dem videre til fysiske enheter. Jeg har sett de rå verdiene i systemer jeg integrerer mot, og jeg har lært meg å ikke anta at jeg vet hvilken skalering som ligger bak. Selve omformerlaget har jeg ikke jobbet hands-on med ennå. Jeg begynner på industriell automasjon i høst, og det laget står høyt på listen. Når jeg har målt det selv, får det sitt eget innlegg.

## Støy, eller dagene vi jaktet på spøkelsesdata

Denne er fra elektrikertiden min. Vi var på et prosjekt i et stort bygg og trakk kabler fra en stor mengde sensorer inn til lokale noder, og videre fra nodene til en hovedtavle der alle sensordataene i bygget samlet seg. Mye kabel, mange strekk, alt terminert og ferdig. Vår del av jobben var gjort.

Så startet automatikerne idriftsettelsen, og dataene var søppel. Ikke døde, det hadde vært enklere å feilsøke, men feil, rare og hoppende verdier. De brukte dagevis på feilsøking før noen fant årsaken: signalkablene var uskjermet, og lange strekk lå på samme kabelbro som sterkstrømskablene. Sterkstrømmen induserte støy rett inn i signallederne, og alle avlesningene som kom inn i tavlen hadde litt av byggets elektriske aktivitet blandet inn i seg.

Slik ser elektrisk støy ut fra datasiden: verdier som vibrerer noen counts rundt den reelle avlesningen, og brå hopp som ser ut som prosessendringer, men egentlig er en motor som starter et sted i bygget. Frekvensomformere er beryktet her, de støyer mye, og signalkabler som ligger for nært plukker det opp. Skjerming hjelper, riktig jording av skjermen betyr mye (jorder du den i begge ender, kan du få et nytt problem, en jordsløyfe), og fysisk avstand til sterkstrømskabler er det billigste tiltaket av alle. Ingenting av dette kan koden din se. Den ser bare en temperatur som skjelver.

{{< diagram src="noise-coupling.svg" caption="Prosjektet i én tegning: uskjermet signalkabel på samme bro som sterkstrømskabler. Transmitteren sender et rent signal, PLS-en leser et skjelvende." >}}

## Hva koden din bør anta

De praktiske rådene, i samme ånd som [sensordata-innlegget](/no/posts/trust-your-sensor-data/):

- Behandle alt under 3,6 mA og over 21 mA som feil, aldri som målinger. Ikke la feilstrømmer snike seg inn i snitt og aggregater.
- Vit hvilken burnout-retning transmitterne dine har. En sensor som feiler høyt skal ikke utløse alarm om overoppheting.
- Ikke stol på at spannet i dokumentasjonen er spannet i transmitteren. Verifiser når du kan, og sørg for at det synes godt i loggene når verdier slutter å gi fysisk mening.
- Regn med noen counts støy. Alarmgrenser som er strammere enn støygulvet varsler om elektrisitet, ikke om prosessen.
- Logg rå mA eller counts ved siden av den skalerte verdien hvis du kan. Det er den eneste måten å feilsøke en skaleringsfeil på i etterkant.

{{< diagram src="code-checks.svg" caption="Hele listen som en flyt: feilstrømmer tar alarmstien, alt annet skaleres, valideres og lagres sammen med råverdien." >}}

Og den største antagelsen, den som ligger bak alle de andre: anta at ingen sitter med hele bildet. Elektrikeren som trakk kabelen, automatikeren som idriftsatte anlegget, prosjektingeniøren med databladene, og du, utvikleren som bruker tallet i enden. Alle kan sitt eget lag. Ingen sjekker ditt opp mot deres uten at du spør.

Strømsløyfen er ærlig. Det er antagelsene dine om den som lyver.

Dette innlegget er steg to i en kjede. Steg én, det som skjer med verdien etter at den har blitt et tall, ligger her: [Kan du stole på sensordataene dine?](/no/posts/trust-your-sensor-data/)
