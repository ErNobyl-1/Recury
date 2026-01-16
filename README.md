# Recury

**Aufgaben, die an dich denken.**

Recury ist eine selbst-hostbare, lokale Todo-Webapp mit Fokus auf wiederkehrende Aufgaben, klare Fälligkeiten und intelligentes Verhalten bei verpassten Tasks. Die App läuft auf einem Homeserver (Docker Compose), ist im LAN per Browser erreichbar und unterwegs via VPN nutzbar.

## Features

- **Wiederkehrende Aufgaben**: Täglich, wöchentlich, monatlich, jährlich, oder alle X Tage/Wochen
- **Woche A/B Pattern**: Über Intervall mit Anker-Datum abbildbar
- **Zwei Verhaltensarten bei Verpassen**:
  - `FAIL_ON_MISS`: Fehlgeschlagen wenn bis Stichtag nicht erledigt
  - `CARRY_OVER_STACK`: Bleibt offen und stapelt sich
- **Dashboard**: Heute/Morgen Ansicht mit offenen, erledigten und überfälligen Aufgaben
- **Kalenderansicht**: Monatskalender mit Navigation und Tagesdetails
- **Aufgabenverwaltung**: Erstellen, Bearbeiten, Duplizieren, Archivieren
- **PWA-Support**: Als App auf dem Smartphone installierbar
- **Offline-tauglich**: Service Worker für Caching
- **Passwort-Schutz**: Simple Authentifizierung

## Installation

### 1. Repository klonen

```bash
git clone https://github.com/dein-user/recury.git
cd recury
```

### 2. Konfiguration erstellen

```bash
cp .env.example .env
```

Passe die `.env` Datei an:

```env
# Port für die App (default: 8123)
APP_PORT=8123

# WICHTIG: Ändere dieses Passwort!
AUTH_PASSWORD=dein-sicheres-passwort

# WICHTIG: Ändere diesen Secret!
SESSION_SECRET=ein-langer-zufaelliger-string
```

### 3. Starten

```bash
docker compose up -d
```

Das war's! Docker baut automatisch alles und startet die App.

### 4. Zugriff

Öffne im Browser: `http://<dein-server>:8123`

Melde dich mit dem Passwort aus deiner `.env` Datei an.

## Updates

```bash
git pull
docker compose up -d --build
```

## Stoppen

```bash
docker compose down
```

Deine Daten bleiben im Docker-Volume erhalten.

## Entwicklung (optional)

Falls du lokal ohne Docker entwickeln möchtest:

```bash
# Dependencies installieren
npm install

# Prisma Client generieren
npm run db:generate

# Datenbank erstellen
npm run db:push

# Entwicklungsserver starten
npm run dev
```

- API: http://localhost:3000
- Web: http://localhost:5173

## Projektstruktur

```
recury/
├── packages/
│   ├── api/           # Backend (Fastify + Prisma + SQLite)
│   └── web/           # Frontend (React + Vite + TailwindCSS)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Anmelden
- `POST /api/auth/logout` - Abmelden
- `GET /api/auth/status` - Auth-Status prüfen

### Aufgaben
- `GET /api/templates` - Alle Aufgaben
- `POST /api/templates` - Neue Aufgabe
- `PUT /api/templates/:id` - Aufgabe aktualisieren
- `DELETE /api/templates/:id` - Aufgabe archivieren

### Dashboard
- `GET /api/dashboard` - Heute/Morgen Übersicht
- `GET /api/instances?from=&to=` - Instanzen für Zeitraum
- `POST /api/instances/:id/complete` - Als erledigt markieren

## Woche A/B Beispiel

Für einen 2-Wochen-Rhythmus:

**Woche A:**
- Wiederholungsart: Intervall
- Alle: 2 Wochen
- Startdatum: Erster Tag von Woche A

**Woche B:**
- Wiederholungsart: Intervall
- Alle: 2 Wochen
- Startdatum: Erster Tag von Woche B (+1 Woche Offset)

## Sicherheit

- Passwort wird gehasht gespeichert
- Session-basierte Authentifizierung
- Empfohlen: Nur im lokalen Netz oder per VPN zugreifen

## Lizenz

MIT
