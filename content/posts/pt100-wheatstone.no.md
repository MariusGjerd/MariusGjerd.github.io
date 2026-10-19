---
title: "Hvorfor PT100-en din sitter i en Wheatstone-bro"
date: 2026-10-19
draft: true
tags: ["pt100", "sensorer", "elektronikk", "adc", "arduino", "data-lifecycle"]
categories: ["data-lifecycle"]
description: "En PT100 endrer seg 0,385 ohm per grad. Slik gjør en Wheatstone-bro det om til en spenning, slik påvirker måleinstrumentet svaret, og derfor klarer ikke en vanlig Arduino-inngang å lese den."
keywords: ["PT100", "Wheatstone-bro", "temperatursensor", "motstandstermometer", "ADS1115", "Arduino ADC", "Thevenin", "spenningsdeler", "egenoppvarming"]
images: ["/og/pt100-wheatstone.png"]
summary: "En PT100 endrer seg under en halv ohm per grad. Her er hvordan en Wheatstone-bro gjør det om til et signal, hvorfor instrumentet du kobler til endrer svaret, og hvorfor omformeren betyr mer enn du tror. Med en interaktiv krets og en Arduino-skisse."
---

En PT100 øker med 0,385 ohm for hver grad den blir varmere. Det er veldig lite. Kabelen ut til sensoren kan fort ha mer motstand enn det.

I et skap fullt av kontaktorer og frekvensomformere er det et problem. Du skal se en brøkdel av en ohm, hver gang, ved siden av utstyr som lager elektrisk støy hele dagen.

<!-- MARIUS: sjekk -->
Som elektriker trakk jeg kabel til PT100-er og koblet dem opp på rekkeklemmer. Hva som skjedde med signalet videre, var ikke min jobb. Nå vil jeg forstå den delen også.

Den klassiske løsningen er en Wheatstone-bro. Moderne måleomformere bruker ofte en presis strømkilde og en god omformer i stedet. Men broen viser selve problemet tydeligst, så det er der vi begynner.

{{< terms title="Ordene i dette innlegget, i klarspråk" >}}
- **PT100:** en temperatursensor av platina. «Pt» er det kjemiske tegnet for platina, og «100» betyr at den har 100 ohm ved 0 °C.
- **Wheatstone-bro:** fire motstander koblet i en firkant, med én spenningskilde. Du måler mellom de to midtpunktene. Oppkalt etter Charles Wheatstone, som gjorde den kjent på 1840-tallet.
- **ADC (analog-til-digital-omformer):** delen som gjør en spenning om til et tall. Den deler måleområdet sitt i trinn og forteller hvilket trinn spenningen havner i.
- **ADS1115:** en liten ADC-brikke med 16 bit fra Texas Instruments, som selges på billige moduler. Den kan måle spenningen mellom to pinner, og den kan forsterke små signaler før den måler.
- **Thevenin-ekvivalent:** en måte å erstatte en hel krets med én spenningskilde og én motstand i serie. Den forteller hva et instrument ser når du kobler det til.
{{< /terms >}}

## Fra temperatur til motstand

Metall leder strøm dårligere når det blir varmt. Platina gjør dette jevnt og likt hver gang, og derfor brukes det i sensorer. Regelen er den samme som for en kobberleder.

{{< formel "temp-resistans" >}}

For en PT100 er R₁ lik 100 Ω ved t₁ = 0 °C, og α er 0,00385 per grad. Ved 100 °C blir motstanden 100 · (1 + 0,385) = 138,5 Ω. Ved 20 °C er den 107,7 Ω.

Så til kabelen. Tenk deg at sensoren står 10 meter unna, på et par med 0,5 mm² kobber. Det blir 20 meter leder tur og retur, og det er rundt 0,7 Ω. Med vanlig totrådskobling leser instrumentet det som nesten 2 °C ekstra. Derfor kobles PT100 med tre eller fire ledere i ekte anlegg. Det viser også hvor lite signalet er.

## Broen er to spenningsdelere

En spenningsdeler er to motstander i serie over en spenning. Spenningen i midtpunktet avhenger av forholdet mellom dem.

{{< formel "spenningsdeler" >}}

En Wheatstone-bro er to slike delere ved siden av hverandre, på samme forsyning. Dette er verdiene jeg bruker:

- Forsyning: 3,3 V.
- Venstre side: R1 = 2,2 kΩ øverst og R2 = 100 Ω nederst. Midtpunktet heter A.
- Høyre side: R3 = 2,2 kΩ øverst og PT100-en nederst. Midtpunktet heter B.
- Utgangen er spenningen fra A til B: U = B − A.

Ved 0 °C har PT100-en nøyaktig 100 Ω. Da har begge sider samme forhold, og A og B ligger på samme spenning. Utgangen er null. Broen er i balanse.

Blir sensoren varmere, øker motstanden. B stiger, A står stille, og utgangen flytter seg bort fra null. Den forskjellen er hele signalet. Ved 100 °C er den 52,0 mV, og ved 200 °C er den 102 mV. Ved −50 °C blir den negativ, −26,6 mV.

Hvorfor måle forskjellen og ikke bare spenningen i B? B ligger på rundt 0,14 V ved 0 °C og stiger bare 52 mV de første 100 gradene. Broen trekker fra den store delen som aldri endrer seg. Da kan omformeren bruke alle trinnene sine på den delen som faktisk varierer.

### Hvorfor 2,2 kΩ og ikke 100 Ω overalt

I lærebøker har broen ofte like motstander i alle fire grener. Prøv det med 100 Ω og 5 V. Hver side blir da 200 Ω, og det går 25 mA gjennom sensoren.

Den strømmen blir til varme i sensoren, rundt 60 milliwatt. Det er nok til at PT100-en varmer seg selv. Den måler da sin egen varme i tillegg til prosessen. Dette heter egenoppvarming, og det er en klassisk felle.

Med 2,2 kΩ øverst og 3,3 V blir strømmen gjennom sensoren rundt 1,4 mA. Varmen i sensoren faller til rundt 0,2 milliwatt, omtrent 300 ganger mindre. Prisen er en lavere utgangsspenning. Det får vi svi for når vi kommer til omformeren.

Prøv selv. Dra i temperaturen, bytt hva som er koblet til utgangen, og følg med på kurven.

{{< lab "wheatstone-pt100" >}}

Se nøye på kurven og den stiplede linjen. Linjen er rett og har samme stigning som kurven har ved 0 °C. I den enkle modellen her er selve PT100-en lineær. En ekte PT100 krummer litt den også, rundt 3 °C ved 200 °C. Men poenget her er broen. Den er heller ikke lineær, fordi strømmen gjennom høyre side synker litt når sensoren får mer motstand. Mellom 0 og 100 °C ligger kurven tett inntil linjen. Ved 200 °C er avstanden rundt 3,4 mV. Regner koden din med at broen er en rett linje, viser den rundt 6,5 °C for lite der oppe.

## Hva instrumentet ser: Thevenin

Instrumentet ditt ser ikke to spenningsdelere. Det ser to klemmer, A og B. Thevenin sier at alt som ligger bak to klemmer kan byttes ut med én spenningskilde og én motstand i serie.

{{< formel "thevenin" >}}

Spenningen er grei. Det er utgangen når ingenting er koblet til, altså 52,0 mV ved 100 °C. Motstanden finner du ved å se inn mellom A og B med forsyningen kortsluttet. Da står R1 og R2 i parallell. Det gjør R3 og PT100-en også. Til slutt står de to parene i serie.

{{< formel "serie-r" >}}

Ved 100 °C blir det rundt 96 Ω + 130 Ω = 226 Ω. Broen oppfører seg altså som et batteri på 52 mV med 226 Ω i serie.

Kobler du til et instrument, danner inngangsmotstanden i instrumentet en ny spenningsdeler med de 226 ohmene. Ohms lov avgjør hvor mye du mister.

{{< formel "ohm" >}}

- Et multimeter har rundt 10 MΩ inngangsmotstand. Du mister rundt 1 µV, eller 0,002 % av signalet. Det merker du aldri.
- ADS1115 har rundt 710 kΩ mellom inngangene på området ±0,256 V, ifølge databladet. Tapet er rundt 16 µV, omtrent 0,03 °C.
- Med 1 kΩ last er det en annen sak. Spenningen faller fra 52,0 til 42,4 mV. Regner koden din fortsatt som om ingenting er koblet til, får du rundt 81 °C på vann som koker.

Det er poenget med Thevenin her. Broen er en svak kilde. Alt du kobler til må ha mye høyere motstand enn 226 Ω, ellers endrer det svaret.

## Problemet med omformeren

I [innlegget om 4-20 mA](/no/posts/what-4-20ma-actually-means/) skrev jeg at omformerlaget var den delen jeg ikke hadde jobbet med selv. Nå har jeg begynt på det laget. Broen gir et rent signal på noen titalls millivolt. Nå må noe gjøre det om til et tall.

En Arduino Uno har en ADC med 10 bit. Den deler 0 til 5 V i 1024 trinn, så hvert trinn er 4,9 mV. Broen endrer seg 52 mV fra 0 til 100 °C. Det blir rundt 11 trinn, eller omtrent 9 grader per trinn. Du ser forskjell på en fryser og en vannkoker. Ikke så mye mer.

Og det blir verre. En analog inngang på Arduino måler mot jord (GND). Kobler du B til A0, leser du B, som er ca. 0,2 V ved 100 °C. Du leser ikke utgangen fra broen i det hele tatt. Vil du ha U = B − A, må du lese A på én inngang, B på en annen, og trekke fra i koden.

Hver av de to målingene har fortsatt trinn på 4,9 mV. Hver av dem har også sin egen støy og sin egen avrunding. Forskjellen blir fortsatt rundt 11 trinn over 100 grader, men nå med to feilkilder i stedet for én.

Arduino-feltet i illustrasjonen over later som om omformeren kan lese U direkte. Over 0 °C viser feltet det beste tilfellet. I praksis får du to avrundinger og to støykilder, så det blir litt dårligere. Under 0 °C er det motsatt. Feltet viser 0, fordi en vanlig inngang ikke kan lese negativ spenning. Men A og B er begge fortsatt positive, så subtraksjonen i skissen gir negative verdier.

ADS1115 løser begge problemene:

- Den har en differensiell inngang. Den måler spenningen mellom AIN0 og AIN1 direkte, så B − A blir én måling, også når den er negativ.
- Den har forsterkning. Med forsterkning 16 er området ±0,256 V, delt i 65 536 trinn. Hvert trinn er 7,8 µV.

Fra 0 til 100 °C blir det rundt 6650 trinn, eller omtrent 66 trinn per grad. Arduinoen får 0,1 trinn per grad. Samme bro, samme signal. Det er omformeren som utgjør forskjellen.

## Bygg den selv

Du trenger:

- En Arduino Uno og en ADS1115-modul.
- En PT100, eller et 100 Ω trimmepotensiometer som falsk sensor.
- Motstander med 1 % toleranse: to på 2,2 kΩ og én på 100 Ω.
- Et koblingsbrett, noen ledninger og et multimeter.

Broen får strøm fra 3,3 V-pinnen på Unoen. ADS1115 snakker med Unoen over I²C, en buss med to ledere for brikker som sitter nær hverandre. Skissen leser broen på begge måter hvert sekund. Den leser A og B på Unoens egne innganger og trekker fra. Den leser også B − A på ADS1115 med forsterkning 16. Begge resultatene skrives ut som rå trinn og som temperatur. Koblingen står i kommentarene øverst i fila.

{{< downloads "Last ned pt100_bridge.ino|/code/pt100_bridge.ino" >}}

Målepunktene er isvann (0 °C), romtemperatur og kokende vann (100 °C). Med trimmepotensiometer stiller du det til riktig motstand med multimeteret: 100,0, 107,7 og 138,5 Ω.

Her er tallene. Beregnet er regnestykket fra dette innlegget. Simulert er samme krets tegnet i Multisim, et program for kretssimulering. Målt er koblingsbrettet. De to siste kolonnene står som TBD til jeg har gjort jobben.

| Punkt | PT100 | Beregnet | Simulert | Målt |
|---|---|---|---|---|
| 0 °C | 100,0 Ω | 0,0 mV | TBD | TBD |
| 20 °C | 107,7 Ω | 10,5 mV | TBD | TBD |
| 100 °C | 138,5 Ω | 52,0 mV | TBD | TBD |

Simuleringen bruker perfekte komponenter. Den bør treffe regnestykket nesten helt.

Koblingsbrettet kommer ikke til å gjøre det, og to av grunnene vet jeg allerede.

Den første er toleransen på motstandene. Er R1 1 % for høy, synker A med rundt 1,4 mV. Da er ikke broen i balanse ved 0 °C lenger, og alt blir 2 til 3 grader feil. Derfor kalibrerer du i isvann.

Den andre er forsyningen. Utgangen følger den direkte. Gir 3,3 V-pinnen på Unoen egentlig 3,25 V, blir alle målingene 1,5 % for lave. Mål spenningen og legg inn det riktige tallet i skissen. Det samme gjelder 5 V-pinnen, som er referansen for Unoens egne innganger. På USB gir den ofte 4,7 til 5,0 V, så mål den også og juster konstanten. Havner målingene mer enn noen prosent unna, forklarer jeg hvorfor her.

## Kort sagt

- En PT100 endrer seg 0,385 Ω per grad. Det er mindre enn feilen fra en kort kabel.
- Broen er to spenningsdelere. Ved 0 °C er den i balanse, og ubalansen er signalet.
- 2,2 kΩ øverst holder strømmen gjennom sensoren rundt 1,4 mA, så sensoren ikke varmer seg selv.
- Sett fra instrumentet er broen 52 mV bak 226 Ω ved 100 °C. Med 1 kΩ last mister du nesten en femdel av signalet.
- En vanlig Arduino-inngang ser rundt 11 trinn over 100 grader, og den kan ikke måle mellom A og B. ADS1115 måler forskjellen direkte og ser rundt 6650.

Sensoren er den enkle delen. Det spennende skjer mellom sensoren og tallet.
