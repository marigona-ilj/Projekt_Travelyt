# Projektdokumentation - [Projekttitel]

## Inhaltsverzeichnis

1. [Ausgangslage](#1-ausgangslage)
2. [Lösungsidee](#2-lösungsidee)
3. [Vorgehen & Artefakte](#3-vorgehen--artefakte)
    1. [Understand & Define](#31-understand--define)
    2. [Sketch](#32-sketch)
    3. [Decide](#33-decide)
    4. [Prototype](#34-prototype)
    5. [Validate](#35-validate)
4. [Erweiterungen [Optional]](#4-erweiterungen-optional)
5. [Projektorganisation [Optional]](#5-projektorganisation-optional)
6. [KI-Deklaration](#6-ki-deklaration)
7. [Anhang [Optional]](#7-anhang-optional)

> **Hinweis:** Massgeblich sind die im **Unterricht** und auf **Moodle** kommunizierten Anforderungen.

<!-- WICHTIG: DIE KAPITELSTRUKTUR DARF NICHT VERÄNDERT WERDEN! -->

<!-- Diese Vorlage ist für eine README.md im Repository gedacht. Abschnitte mit [Optional] können weggelassen werden, wenn in den Übungen nichts anderes verlangt wird. -->

## 1. Ausgangslage
Travelyt adressiert das Problem, dass Reiseplanung häufig unübersichtlich und auf verschiedene Tools verteilt ist. Viele Reisende organisieren ihre Trips über WhatsApp-Chats, Notizen, Excel-Listen, Kalender oder separate Apps für Budget, Aktivitäten und Packlisten. Dadurch können wichtige Informationen verloren gehen, Absprachen unklar bleiben oder Aufgaben vergessen werden. Dieses Problem betrifft sowohl Gruppenreisen als auch Einzelreisen: Während Gruppen vor allem gemeinsame Abstimmung benötigen, brauchen Solo-Reisende eine zentrale Übersicht über ihre Planung.

Das angestrebte Ergebnis ist ein funktionaler Web-Prototyp, der die Reiseplanung an einem Ort bündelt. Nutzerinnen und Nutzer sollen Trips erstellen, Aktivitäten planen, Ausgaben erfassen und Packlisten verwalten können. Bei gemeinsamen Reisen sollen mehrere Personen einen Trip einsehen und bearbeiten können.

- **Problem:** Reiseplanung ist oft auf mehrere Apps, Chats oder Dokumente verteilt. Dadurch entstehen Unübersichtlichkeit, vergessene Aufgaben und zusätzlicher Koordinationsaufwand. Bei Gruppenreisen kommt hinzu, dass Aktivitäten, Ausgaben und Packlisten gemeinsam abgestimmt werden müssen. Bei Solo-Reisen fehlt häufig eine zentrale Übersicht über alle wichtigen Reiseinformationen.
 
- **Ziele:**  Ziel des Projekts ist die Entwicklung einer Web-App, mit der Reisen strukturiert geplant und verwaltet werden können. Die App soll es ermöglichen, Trips zu erstellen, Aktivitäten festzuhalten, Ausgaben zu erfassen und Packlisten zu nutzen. Für Gruppenreisen soll zusätzlich eine gemeinsame Bearbeitung möglich sein, damit alle Beteiligten Zugriff auf dieselben Informationen haben. Der Prototyp soll die wichtigsten Workflows einer digitalen Reiseplanung abbilden und als online zugängliche SvelteKit-Anwendung umgesetzt werden.

- **Primäre Zielgruppe:**  Die primäre Zielgruppe sind Personen, die gemeinsam mit Freunden, Familie oder Partnern reisen und Aktivitäten, Kosten sowie Vorbereitungsschritte koordinieren wollen. Der aktuelle Fokus liegt bewusst auf Gruppenreisen, da kollaborative Planung den zentralen Mehrwert der App darstellt. Solo-Reisen sind technisch bereits möglich, jedoch ist die Benutzeroberfläche noch nicht gezielt darauf ausgerichtet. Eine Erweiterung und UI-Anpassung für Solo-Reisende ist für einen späteren Entwicklungsschritt vorgesehen.

- **Weitere Stakeholder [Optional]:** _[z. B. Verwaltung, Geschäftsleitung]_  


## 2. Lösungsidee
Travelyt ist eine Web-App zur zentralen Organisation von Gruppenreisen. Die Lösungsidee besteht darin, alle relevanten Planungsbereiche – von der Reiseübersicht über Aktivitäten, Packliste und Budget bis hin zu Karte, Wetter, Galerie und Gruppen-Chat – in einer einzigen Anwendung zu bündeln. Dadurch sollen Reisende nicht mehr zwischen mehreren Tools, Chats oder Dokumenten wechseln müssen. Im Zentrum steht die kollaborative Nutzung: Mehrere Personen können denselben Trip gemeinsam einsehen und bearbeiten.

- **Kernfunktionalität:**  Die zentrale Funktion ist das Erstellen und Verwalten von Trips. Nutzer können einen neuen Trip mit Titel, Reiseziel, Zeitraum und optionalem Coverbild anlegen. Trips mit mehreren Zwischenstopps werden durch eine Multi-Destination-Funktion unterstützt: Jede Station erhält ein eigenes Ziel und einen eigenen Zeitraum. Trips können über einen Einladungslink mit Mitreisenden geteilt werden, sodass alle Beteiligten Zugriff auf dieselben Informationen haben.

  Innerhalb eines Trips können Aktivitäten geplant und verwaltet werden – zum Beispiel Ausflüge, Restaurantbesuche oder Sehenswürdigkeiten. Jede Aktivität kann mit Titel, Datum, Uhrzeit, Ort, Kategorie und Beschreibung ergänzt werden.

  Die Packlisten-Funktion ermöglicht es, Einträge zu erfassen, abzuhaken und nach Kategorien zu organisieren. Es gibt zwei Arten von Listen: eine **geteilte Packliste**, die für alle Mitreisenden sichtbar ist und Gegenstände enthält, die jede Person individuell mitbringen muss (z. B. Kleider, Schuhe, Sonnenbrille). Jeder kann Einträge hinzufügen und alle profitieren davon – so muss niemand eine Packliste von Grund auf selbst erstellen. Jede Person hakt ihre eigenen Einträge für sich ab. Daneben gibt es eine **private Packliste**, die nur für die jeweilige Person sichtbar ist und persönliche Gegenstände enthält, die niemand sonst sehen soll.

  Die Budget-Funktion erlaubt das Erfassen von Ausgaben mit Betrag, Kategorie und Beschreibung. Bei jeder Ausgabe kann festgelegt werden, auf welche Personen die Kosten aufgeteilt werden – es müssen nicht zwingend alle Mitreisenden beteiligt sein. Die App berechnet automatisch, wer wem wie viel schuldet, und zeigt offene Salden übersichtlich an.

  Ergänzend stehen folgende Funktionen zur Verfügung: eine **Galerie** für gemeinsame Reisefotos, ein **Gruppen-Chat** für Absprachen innerhalb des Trips, eine **Checkliste** für reisebezogene Aufgaben, eine **Wettervorschau** pro Reiseziel sowie eine interaktive **Karte**, die Aktivitäten und Reisestationen visualisiert. Alle Trips sind ausserdem in einer **Kalenderansicht** dargestellt.

- **Annahmen [Optional]:** _[welche Hypothesen werden geprüft?]_
- **Abgrenzung [Optional]:** Die gezielte Unterstützung von Solo-Reisen gehört nicht zum aktuellen Umfang des Prototyps. Solo-Nutzung ist zwar möglich, jedoch ist die Benutzeroberfläche (z. B. Ausgaben-Splitting, Mitglieder-Verwaltung, Gruppen-Chat) auf gemeinsame Reisen ausgerichtet. Eine UI-Anpassung für Solo-Reisende ist als zukünftige Erweiterung geplant.

## 3. Vorgehen & Artefakte
Die Durchführung erfolgt phasenbasiert; dokumentieren Sie die wichtigsten Ergebnisse je Phase.

### 3.1 Understand & Define
- **Zielgruppenverständnis:** Im Rahmen einer informellen Zielgruppenanalyse wurden drei typische Nutzergruppen identifiziert, für die gemeinsame Reiseplanung besonders relevant ist:
  - **Freundesgruppen** (z. B. Studierende oder junge Berufstätige): planen Reisen gemeinsam, teilen sich Kosten, haben aber oft unklare Absprachen über Aktivitäten und Budget
  - **Paare**: reisen häufig zusammen und möchten Planung und Ausgaben unkompliziert koordinieren
  - **Familien**: benötigen vor allem Übersicht über Packlisten und gemeinsame Aktivitäten; mehrere Personen müssen koordiniert werden

- **Wesentliche Erkenntnisse:**
  - Reisende nutzen heute mehrere Tools parallel (WhatsApp, Notes, Excel, Splitwise), was zu Informationsverlust und Mehraufwand führt
  - Es gibt viele Reise-Apps, aber kaum eine, die Aktivitäten, Ausgaben, Packliste, Kommunikation und Karte in einem vereint – Nutzer müssen zwischen mehreren Apps wechseln
  - Apps wie Splitwise lösen das Ausgabenproblem, haben aber keinen Reisekontext; Google Maps und Kalender-Apps fehlt die kollaborative Planungsebene
  - Bei Gruppenreisen ist die Kostenteilung ein zentrales Frustrationspotenzial
  - Packlisten werden oft mündlich oder in Chat-Gruppen koordiniert und häufig vergessen
  - WhatsApp-Gruppen sind für viele Reisegruppen das primäre Koordinationswerkzeug, obwohl wichtige Informationen dort schnell untergehen

### 3.2 Sketch
- **Variantenüberblick:** _[TODO: Kurzbeschreibung der skizzierten Varianten – z. B. Variante A: Card-basiertes Layout, Variante B: listenbasiert]_
- **Skizzen:** _[TODO: Skizzen als Bilder einbinden oder verlinken, Unterschiede kurz dokumentieren]_

### 3.3 Decide
- **Gewählte Variante & Begründung:** Gewählt wurde ein **card- und tab-basiertes Layout** mit einer persistenten Kopfnavigation. Die Trip-Detailseite ist in acht Tabs unterteilt (Itinerary, Packing, Budget, Gallery, Checklist, Members, Weather, Map), um die vielen Funktionsbereiche übersichtlich zu strukturieren, ohne die Nutzenden zu überfordern. Diese Variante wurde gegenüber einer rein listen- oder scroll-basierten Ansicht bevorzugt, da Tabs einen schnellen Kontextwechsel ermöglichen und der Umfang der Funktionen eine klare Trennung erfordert. Das Dashboard bietet eine kompakte Übersicht über den nächsten Trip, offene Salden und den Activity Feed, damit Nutzende sofort den relevantesten Inhalt sehen.

- **End-to-End-Ablauf:** Ein typischer Nutzungsfluss sieht wie folgt aus:
  1. **Registrierung/Login** – Nutzerin erstellt einen Account oder meldet sich an
  2. **Trip erstellen** – Titel, Reiseziel(e), Zeitraum und optionales Coverbild werden erfasst; bei Mehrfachzielen können mehrere Stationen hinzugefügt werden
  3. **Mitglieder einladen** – ein Einladungslink wird generiert und geteilt; Mitreisende treten dem Trip über den Link bei
  4. **Aktivitäten planen** – alle Mitglieder können Aktivitäten mit Datum, Ort und Beschreibung erfassen
  5. **Packliste befüllen** – Einträge werden in der geteilten Liste ergänzt; jede Person hakt ihre eigenen Sachen ab; persönliche Gegenstände kommen in die private Liste
  6. **Ausgaben erfassen** – Kosten werden mit Betrag, Kategorie und Aufteilung auf ausgewählte Personen eingetragen
  7. **Während der Reise** – Fotos in die Galerie hochladen, im Gruppen-Chat kommunizieren, Checkliste abhaken
  8. **Abschluss** – offene Salden einsehen und Schulden begleichen

- **Mockup:** _[TODO: Figma-URL oder Screenshots einfügen – ursprüngliches Design unter: https://www.figma.com/make/KxztIkmeWMwjQ0OYVbP0yp/Travelyt---Design (Hinweis: Details haben sich im Laufe der Entwicklung verändert)]_

### 3.4 Prototype

#### 3.4.1. Entwurf (Design)
Beschreibt die Gestaltung und Interaktion.
> **Hinweis:** Hier wird der **Prototyp** beschrieben, nicht das **Mockup**.
- **Informationsarchitektur:** Die App ist in fünf Hauptbereiche gegliedert, die über eine persistente Navigation in der Kopfzeile erreichbar sind:
  - **Dashboard** – Übersicht mit dem nächsten Trip, offenen Salden und dem Activity Feed
  - **My Trips** – Listenansicht aller eigenen Trips; Erstellen neuer Trips; Detail-Ansicht mit acht Tabs (Itinerary, Packing, Budget, Gallery, Checklist, Members, Weather, Map)
  - **Calendar** – Monatskalender, der alle Trips als farbige Balken darstellt; Erstellen neuer Trips direkt aus dem Kalender
  - **Profile** – Profilbild, Name, Passwort ändern, Account löschen
  - **Settings** – Dark Mode, Benachrichtigungseinstellungen pro Kategorie
  - Zusätzlich gibt es einen **Activity Feed** (Glocken-Icon in der Navigation), der tripübergreifend Aktivitäten anzeigt

- **User Interface Design:** _[TODO: Screenshots der wichtigsten Screens mit kurzen Erläuterungen einfügen – z. B. Dashboard, Trip-Detail, Budget-Tab]_

- **Designentscheidungen:**
  - **Tailwind CSS** für konsistentes, utility-first Styling ohne separate CSS-Dateien
  - **Dark Mode** über localStorage persistiert; systemweite Unterstützung via CSS-Klasse auf `<html>`
  - **Tab-basierte Navigation** im Trip-Detail, um die vielen Funktionsbereiche eines Trips übersichtlich zu halten
  - **Inline-Bestätigung** statt Browser-`confirm()` für Löschaktionen, um ein einheitliches UI-Erlebnis zu gewährleisten
  - **Toast + Undo** (5 Sekunden) für weniger kritische Löschaktionen (Aktivitäten, Packlisteneinträge), um versehentliche Löschungen rückgängig machen zu können
  - **Onboarding-Tour** beim ersten Login, die interaktiv durch die wichtigsten Navigationspunkte führt

#### 3.4.2. Umsetzung (Technik)
Fasst die technische Realisierung zusammen.
- **Technologie-Stack:**
  - **Framework:** SvelteKit 5 mit Svelte 5 Runes (`$state`, `$derived`, `$props`, `$effect`)
  - **Sprache:** JavaScript (kein TypeScript)
  - **Styling:** Tailwind CSS
  - **Datenbank:** MongoDB Atlas (NoSQL, Cloud-gehostet)
  - **Icons:** lucide-svelte
  - **Authentifizierung:** Eigene Implementierung mit bcryptjs (Passwort-Hashing), Session via HTTP-Cookie (`userId`)
  - **Karten:** MapLibre GL (OpenFreeMap-Tiles, OpenStreetMap-Daten), Geocoding via Nominatim
  - **Wetter:** Open-Meteo API (kostenlos, kein API-Key erforderlich); historische Wetterdaten via Open-Meteo Archive API
  - **Standortsuche:** Open-Meteo Geocoding API für Destination-Autocomplete

- **Tooling:**
  - **IDE:** Visual Studio Code mit Svelte- und ESLint-Erweiterungen
  - **Versionskontrolle:** Git / GitHub
  - **Lokale Entwicklung:** Node.js, `npm run dev`
  - **Datenbank-Verwaltung:** MongoDB Atlas Web UI
  - _[TODO: weitere Tools ergänzen falls genutzt]_

- **Struktur & Komponenten:**
  - **Routen (Seiten):**
    - `/` – Dashboard
    - `/auth` – Login / Registrierung
    - `/trips` – Trip-Liste und Erstellungsformular
    - `/trips/[tripId]` – Trip-Detail mit Tab-Navigation
    - `/trips/[tripId]/print` – Druckansicht (PDF-Export)
    - `/calendar` – Kalenderansicht
    - `/profile` – Profilseite
    - `/settings` – Einstellungen
    - `/join/pending` – Einladungs-Warteseite
    - `/trips/join/[code]` – Einladungslink-Handler
  - **API-Routen** unter `src/routes/api/` für alle Datenzugriffe (trips, activities, expenses, packing, gallery, members, messages, feed, dashboard, auth, user)
  - **Wiederverwendbare Komponenten** unter `src/lib/components/`: `Header`, `TripCard`, `ActivityList`, `ExpenseList`, `PackingList`, `MemberList`, `Gallery`, `TripChat`, `TripWeather`, `TripMap`, `TripChecklist`, `ActivityFeed`, `DestinationInput`, `OnboardingTour`, `Toast`, `ConfirmDialog`
  - **State-Management:** Ausschliesslich lokales Komponentenstate via Svelte 5 Runes; kein globaler Store

- **Daten & Schnittstellen:**
  - Alle Daten werden in **MongoDB Atlas** gespeichert. Die wichtigsten Collections sind: `users`, `trips`, `tripMembers`, `tripInvites`, `activities`, `expenses`, `packingItems`, `messages`, `gallery`, `checklist`, `tripActivityLog`
  - **API-Kommunikation:** REST-API über SvelteKit Server Routes (`+server.js`); alle Anfragen erfolgen mit `fetch()` im Client
  - **Authentifizierung:** Passwörter werden mit bcryptjs gehasht gespeichert. Nach Login wird ein `userId`-Cookie gesetzt, das bei jeder API-Anfrage serverseitig geprüft wird
  - **Bilder** (Profilfotos, Trip-Cover, Galerie) werden als Base64-Strings direkt in MongoDB gespeichert (Prototyp-Entscheidung; für Produktion wäre Cloudinary o. Ä. sinnvoll)
  - **Echtzeit:** Kein WebSocket; der Activity Feed und der Chat werden clientseitig per Polling (alle 12 Sekunden) aktualisiert

- **Deployment:** _[TODO: URL der deployten Anwendung einfügen]_

- **Test-Zugänge:** Für das Testen stehen folgende Benutzerkonten zur Verfügung:

  | E-Mail | Passwort | Rolle |
  |--------|----------|-------|
  | marigona@test.com | 12345678 | Trip-Besitzerin (erstellt Trips, kann Members hinzufügen) |
  | andrea@test.com | 12345678 | Mitglied (wurde einem Trip hinzugefügt) |

  > Hinweis: Um beide Accounts gleichzeitig zu testen, müssen zwei verschiedene Browser verwendet werden (z. B. Chrome und Edge), da jeder Browser seinen eigenen Cookie-Speicher hat.

- **Besondere Entscheidungen:**
  - **Base64-Bildspeicherung in MongoDB:** Für den Prototyp wurde auf einen externen Bildhosting-Dienst verzichtet. Bilder werden direkt als Base64 in der Datenbank gespeichert. Dies vereinfacht die Umsetzung, ist aber für den Produktiveinsatz nicht skalierbar.
  - **Kein TypeScript:** Bewusste Entscheidung zugunsten schnellerer Entwicklung im Prototyp-Kontext.
  - **Polling statt WebSockets:** Echtzeit-Updates im Chat und Feed erfolgen über regelmässiges Polling statt über eine persistente WebSocket-Verbindung, da dies für einen Prototyp deutlich einfacher umzusetzen ist.
  - **Multi-Destination als Legs:** Trips mit mehreren Zielen werden über ein `legs`-Array im Trip-Dokument abgebildet. Ältere Trips ohne `legs` werden beim Lesen automatisch normalisiert (Rückwärtskompatibilität).

### 3.5 Validate
- **URL der getesteten Version:** _[TODO: URL einfügen]_
- **Ziele der Prüfung:** _[TODO: z. B. Ist die Navigation intuitiv verständlich? Können Nutzer selbstständig einen Trip erstellen und Mitglieder einladen?]_
- **Vorgehen:** _[TODO: moderiert/unmoderiert; remote/on-site]_
- **Stichprobe:** _[TODO: Mit wem wurde getestet? Profil; Anzahl]_
- **Aufgaben/Szenarien:** _[TODO: Ausformulierte Testaufgaben einfügen]_
- **Kennzahlen & Beobachtungen:** _[TODO: z. B. Erfolgsquote, Zeitbedarf, qualitative Findings]_
- **Zusammenfassung der Resultate:** _[TODO: Wichtigste Erkenntnisse; 2–4 Sätze]_
- **Abgeleitete Verbesserungen:** _[TODO: Anforderungen, die als nächstes umgesetzt werden sollten, priorisiert, kurz begründet]_

## 4. Erweiterungen [Optional]
Dokumentiert Erweiterungen über den Mindestumfang hinaus.
> **Hinweis:** Jede Erweiterung ist separat nach dem folgenden Schema zu beschreiben.

### _[4.x Kurzbeschreibung / Titel]_Budget-Aufteilung: Wer schuldet wem?  
- **Beschreibung & Nutzen:** _[Was wurde erweitert? Warum?]_  
- **Wo umgesetzt:** _[Wie und wo wurde es gemacht? Frontend, Backend, Datenbank?]_  
- **Referenz:** _[Wo wird die Erweiterung auch noch beschrieben, z.B. Screenshot oder Beschreibung in einem anderen Kapitel]_  
- **Aus Evaluation abgeleitet?:** _[Wurde diese Erweiterung als Folge eines in der Evaluation identifizierten Issues implementiert?]_  

> Das folgende **Beispiel** wurde bewusst kurz gehalten. Erweiterungen dürfen auch ausführlicher beschrieben werden.

### 4.1 Tabelle nach Kategorien filtern
- **Beschreibung & Nutzen:** Tabelle X kann nach Kategorie gefiltert werden, weil User typischerweise nur an einer bestimmten Kategorie interessiert sind.  
- **Wo umgesetzt:** 
  - **Frontend:** Tabelle mit Dropdown in Datei ...
  - **Backend:** Form Action ... in Datei ...
  - **Datenbank:** MongoDB-Query in Datei ...
- **Referenz:** Screenshot in Kap. x.y
- **Aus Evaluation abgeleitet?:** Ja, Issue x.y

## 5. Projektorganisation [Optional]
Beispiele:
- **Repository & Struktur:** _[Link; kurze Strukturübersicht]_  
- **Issue-Management:** _[Vorgehen kurz beschreiben]_  
- **Commit-Praxis:** _[z. B. sprechende Commits]_

## 6. KI-Deklaration
Die folgende Deklaration ist verpflichtend und beschreibt den Einsatz von KI im Projekt.

### 6.1 KI-Tools
- **Eingesetzte Tools**: _[z. B. Copilot, ChatGPT, Claude, lokale Modelle; Version/Variante wenn bekannt]_
- **Zweck & Umfang**: _[wie, wofür und in welchem Ausmass wurde KI eingesetzt (z. B. Textentwürfe, Codevorschläge, Tests, Refactoring); welche Teile stammen (ganz/teilweise) aus KI-Unterstützung?]_
- **Eigene Leistung (Abgrenzung):** _[was ist eigenständig erarbeitet/überarbeitet worden?]_

### 6.2 Prompt-Vorgehen
_[Überlegungen zu Prompt-Vorgehen, Qualität und Urheberrecht/Quellen. Wie wurde beim Prompting vorgegangen? Zu beschreiben ist die grundlegende Vorgehensweise. Einzelne, konkrete Prompts sollten höchstens als Beispiele aufgeführt werden. ]_

### 6.3 Reflexion
_[Nutzen, Grenzen, Risiken/Qualitätssicherung, ...]_

## 7. Anhang [Optional]
Beispiele:
- **Quellen:** _[verwendete Vorlagen/Assets/Modelle; Lizenz/Urheberrecht; ...]_ Gratis Bilder von Pixabay
- **Testskript & Materialien:** _[Link/Datei]_  
- **Rohdaten/Auswertung:** _[Link/Datei]_  

