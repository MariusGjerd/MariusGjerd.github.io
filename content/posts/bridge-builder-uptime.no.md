---
title: "Din uptime-SLA betyr ingenting når den fysiske prosessen ikke kan vente på din tilbakestilling"
date: 2026-06-02
draft: false
tags: ["ot", "it", "driftssikkerhet", "bridge-builder"]
categories: ["bridge-builder"]
description: "Webutviklere tenker på oppetid i form av responstider og feilrater. I industrielle systemer måles kostnadene ved nedetid i noe helt annet."
keywords: ["OT driftssikkerhet", "SCADA oppetid", "industrielle systemer", "IT/OT"]
summary: "Webutviklere og industriingeniører tenker forskjellig om oppetid. Her er hvorfor, og hva det koster når du ikke forstår forskjellen."
---

Det finnes en samtale som oppstår når IT-utviklere møter operasjonell teknologi for første gang. Den pleier å gå omtrent slik:

«Hva er deres oppetidskrav?»

«99,9 prosent.»

«Det er omtrent 8 timer nedetid i året. Det kan vi jobbe med.»

«Nei, 99,9 prosent *per skift*. Vi kjører 24/7. Og hvis systemet går ned midt i et batchkjør, mister vi hele batchen.»

IT-utvikleren nikker, noterer noe, og regner stille om.

## Hva oppetid betyr i IT

I webtjenester er oppetid et statistisk mål. Load balanceren fordeler trafikk. En rullende utrulling tar ned én instans om gangen. Hvis en deploy går galt, ruller du tilbake. Brukeren prøver forespørselen på nytt. Kanskje de ser en feilside i noen sekunder.

99,9 prosent oppetid betyr omtrent 8,7 timer nedetid per år. For de fleste webapplikasjoner er det akseptabelt. Modellen forutsetter at systemets tilstand er gjenopprettbar.

## Hva oppetid betyr i OT

I industrielle styringssystemer er ikke «systemet» programvaren. Det er den fysiske prosessen programvaren styrer.

Et vannbehandlingsanlegg pauser ikke mens du ruller tilbake en SCADA-oppdatering. En sementkjerne som kjører på 1400°C venter ikke på din deployment-pipeline. En papirmaskin som kjører på 1000 meter per minutt prøver ikke på nytt når din historikk går offline.

Den fysiske prosessen fortsetter uansett om programvaren er frisk eller ikke. Og hvis programvaren mister kontrollen over prosessen, selv kortvarig, måles konsekvensene i:

- Tapte batcher
- Skadet utstyr fra drift utenfor trygge parametere
- Produkt utenfor spesifikasjon som må kastes
- I verste fall: branner, personskader, miljøhendelser

## Tilbakestillingsproblemet

Webutviklere behandler tilbakestilling som et sikkerhetsnett. I industrielle systemer er tilbakestilling ofte ikke et alternativ midt i en prosess.

Hvis en PLC-programoppdatering går galt midt i en batch, kan du ikke bare gjenopprette den forrige versjonen og fortsette. Den fysiske tilstanden til prosessen har endret seg. Temperaturer, trykk og kjemiske sammensetninger er nå annerledes enn det den forrige versjonen forventet.

Dette er grunnen til at industrielle systemer har endringsstyringsprosesser som virker byråkratiske for IT-øyne: planlagte vedlikeholdsvindu, testede tilbakestillingsprosedyrer, operatørgodkjenninger. Det er ikke byråkrati for sin egen skyld. Det er bygget rundt virkeligheten at programvaren styrer noe som ikke stopper.

## Hva du bør gjøre

Hvis du skriver programvare som kommuniserer med industrielle systemer:

**Grasiøs degradering ser annerledes ut her.** I OT betyr det at styringssystemet fortsetter å operere trygt i manuell modus mens programvaren din er nede. Utform den overgangen eksplisitt.

**Test mot de fysiske begrensningene, ikke bare de programvaremessige.** Hva skjer med systemet ditt når nettverket faller ut i 30 sekunder? Hva gjør PLS-en? Hva ser operatøren?

**Forstå prosessen før du rører den.** Operatørene som driver anlegget vet ting om feilmoder som ikke er i noen dokumentasjon. Snakk med dem før du skriver en linje kode.

SLA-tallet på kontrakten er den enkle delen. Å forstå hva det faktisk betyr for det som styres, er den vanskelige delen.
