# Travelyt - Travel Planning Web Application

A collaborative travel planning application built with SvelteKit, MongoDB, and deployed on Netlify.

## Features

### Core Workflow
- **Trip Management**: Create, edit, and delete trips with destination and date information
- **Activities**: Plan and organize activities by date within trips
- **Collaborative Planning**: Invite other users to collaborate on trips
- **Packing List**: Create category-based packing checklists with progress tracking
- **Budget Tracking**: Track expenses and monitor total trip budget

### Technical Stack
- **Frontend**: SvelteKit 5 with Svelte runes and Tailwind CSS
- **Backend**: SvelteKit API routes (`+server.js`)
- **Database**: MongoDB with authentication and multi-user support
- **Authentication**: Session-based email/password login
- **Styling**: Tailwind CSS for responsive design
- **Deployment**: Netlify

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas cloud account)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travelyt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - See [MONGODB_SETUP.md](MONGODB_SETUP.md) for detailed instructions
   - Update `.env.local` with your MongoDB connection string

4. **Start development server**
   ```bash
   npm run dev
   ```
   - Visit http://localhost:5173

5. **Create an account and start planning!**

## Project Structure

```
src/
├── lib/
│   ├── components/         # Reusable Svelte components
│   ├── server/             # Backend utilities (auth, db, validators)
│   ├── stores/             # Svelte stores for state management
│   └── utils/              # Client-side utilities
├── routes/
│   ├── api/                # API endpoints
│   ├── auth/               # Authentication pages
│   └── trips/              # Trip management pages
└── app.css                 # Global styles with Tailwind
```

## API Endpoints

### Authentication
- `POST /api/auth?action=register` - Register new user
- `POST /api/auth?action=login` - Login user
- `GET /api/auth` - Check authentication status

### Trips
- `GET /api/trips` - List user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/[tripId]` - Get trip details
- `PUT /api/trips/[tripId]` - Update trip
- `DELETE /api/trips/[tripId]` - Delete trip

### Activities
- `GET /api/trips/[tripId]/activities` - List activities
- `POST /api/trips/[tripId]/activities` - Create activity
- `PUT /api/trips/[tripId]/activities/[activityId]` - Update activity
- `DELETE /api/trips/[tripId]/activities/[activityId]` - Delete activity

### Expenses
- `GET /api/trips/[tripId]/expenses` - List expenses
- `POST /api/trips/[tripId]/expenses` - Create expense
- `DELETE /api/trips/[tripId]/expenses/[expenseId]` - Delete expense

### Packing
- `GET /api/trips/[tripId]/packing` - List packing items
- `POST /api/trips/[tripId]/packing` - Add packing item
- `PUT /api/trips/[tripId]/packing/[itemId]` - Mark item as packed
- `DELETE /api/trips/[tripId]/packing/[itemId]` - Delete packing item

### Members
- `GET /api/trips/[tripId]/members` - List trip members
- `POST /api/trips/[tripId]/members` - Invite member by email
- `DELETE /api/trips/[tripId]/members/[memberId]` - Remove member

## Database Schema

### Collections
- **users**: User accounts with email, password hash, and profile
- **trips**: Trip records with dates, destination, and creator
- **tripMembers**: Join table for user-trip relationships and roles
- **activities**: Trip activities with date, time, location
- **expenses**: Trip expenses with amount, category, and payer
- **packingItems**: Packing list items with category and packed status

## Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Deployment (Netlify)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: Initialize Travelyt"
   git push origin main
   ```

2. **Connect to Netlify**
   - Log in to Netlify
   - Click "New site from Git"
   - Select your repository
   - Set build command: `npm run build`
   - Set publish directory: `build`

3. **Configure environment variables**
   - Go to Site Settings → Build & Deploy → Environment
   - Add `MONGODB_URI` with your production MongoDB connection string
   - Add `SESSION_SECRET` with a secure random string

4. **Deploy**
   - Netlify will automatically deploy on every push to main

## Future Enhancements

- [ ] Weather API integration for destinations
- [ ] Real-time collaboration with WebSockets
- [ ] Email notifications and reminders
- [ ] Trip photos and gallery
- [ ] Expense splitting and settlements
- [ ] Mobile app
- [ ] Multi-language support

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/my-feature`
4. Open a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

- **End-to-End-Ablauf:** _[Beschreibung inkl. User Journey Map]_  
- **Mockup:** _[URL, z. B. Figma; Screenshots mit kurzen Beschreibungen]_  

### 3.4 Prototype

#### 3.4.1. Entwurf (Design)
Beschreibt die Gestaltung und Interaktion.
> **Hinweis:** Hier wird der **Prototyp** beschrieben, nicht das **Mockup**.
- **Informationsarchitektur:** _[z. B. Seiten/Navigation: Konzept, nicht die technische Umsetzung]_
- **User Interface Design:** _[wichtige Screens: Screenshots mit kurzen Erläuterungen]_  
- **Designentscheidungen:** _[zentrale Entscheidungen und Begründungen]_

#### 3.4.2. Umsetzung (Technik)
Fasst die technische Realisierung zusammen.
- **Technologie-Stack:** _[SvelteKit, Bibliotheken falls genutzt]_
- **Tooling:** _[IDE/Erweiterungen, lokale/Cloud-Tools; den Einsatz von KI beschreiben Sie im Kapitel **KI-Deklaration**]_  
- **Struktur & Komponenten:** _[Seiten, Routen, State/Stores, wichtige Komponenten]_
- **Daten & Schnittstellen:** _[Wie werden Daten gespeichert, verwaltet, abgerufen?]_
- **Deployment:** _[URL]_  
- **Besondere Entscheidungen:** _[z. B. Trade-offs, Vereinfachungen]_  

### 3.5 Validate
- **URL der getesteten Version** (separat deployt)
- **Ziele der Prüfung:** _[welche Fragen sollen beantwortet werden?]_  
- **Vorgehen:** _[moderiert/unmoderiert; remote/on-site]_  
- **Stichprobe:** _[Mit wem wurde getestet? Profil; Anzahl]_  
- **Aufgaben/Szenarien:** _[Ausformulierte Testaufgaben]_  
- **Kennzahlen & Beobachtungen:** _[z. B. Erfolgsquote, Zeitbedarf, qualitative Findings]_  
- **Zusammenfassung der Resultate:** _[Wichtigste Erkenntnisse; 2-4 Sätze]_  
- **Abgeleitete Verbesserungen:** _[Anforderungen, die als nächstes umgesetzt werden sollten, priorisiert, kurz begründet; falls Verbesserungen im Prototyp konkret umgesetzt wurden: In Kap. 4 dokumentieren]_  

## 4. Erweiterungen [Optional]
Dokumentiert Erweiterungen über den Mindestumfang hinaus.
> **Hinweis:** Jede Erweiterung ist separat nach dem folgenden Schema zu beschreiben.

### _[4.x Kurzbeschreibung / Titel]_  
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
- **Quellen:** _[verwendete Vorlagen/Assets/Modelle; Lizenz/Urheberrecht; ...]_
- **Testskript & Materialien:** _[Link/Datei]_  
- **Rohdaten/Auswertung:** _[Link/Datei]_  

