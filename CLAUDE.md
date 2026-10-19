# CLAUDE.md

Hugo-blogg om IT/OT: industriell automasjon, sensordata og OT-sikkerhet.
Tospraaklig, engelsk og norsk.

## Bygg og kjoer

    hugo server -D        # lokal server med utkast
    hugo                  # bygg til public/

Temaet er en git-submodul. `git submodule update --init --recursive` etter fersk klone.

## Struktur

    content/posts/        artikler, <slug>.md (EN) og <slug>.no.md (NO), filnavnsuffiks
    content/              frittstaaende sider, samme filnavnsuffiks-monster
    layouts/              overstyringer av temaet, shortcodes
    static/og/            OG-bilder i databladstil
    assets/               SCSS og SVG
    private/              planlegging og distribusjon, GITIGNORERT

## Regler som gjelder alt arbeid her

- **Aldri kjoer `git commit` eller `git push`.** Eieren committer selv.
  Oppsummer hva som er endret og la det ligge.
- **Den norske versjonen oversettes ikke.** Den skrives selvstendig fra
  fagkunnskapen. Skriv den engelske ferdig, legg den bort, skriv den norske.
- **Ingen tankestreker (em/en dash)** i publisert tekst. Se `private/writing-voice.md`.
- **Forklar fagforkortelser** foerste gang de brukes.

## Hvor resten ligger

Alt om innholdsstrategi, distribusjon, plattformregler og skriveregler ligger i
`private/`, som ikke er en del av dette repoet. Skal du jobbe med noe av det,
start i `private/planning/README.md`.
