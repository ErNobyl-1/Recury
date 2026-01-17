<div align="center">

<img src="logo.png" alt="Recury Logo" width="120" />

# Recury

**Tasks that think of you.**

A self-hosted, privacy-first recurring task manager with intelligent scheduling and deadline handling.

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Features](#features) • [Quick Start](#quick-start) • [Configuration](#configuration) • [Development](#development)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔁 **Flexible Scheduling** | Daily, weekly, monthly, yearly, or custom intervals (every X days/weeks) |
| 📅 **Week A/B Patterns** | Perfect for alternating schedules using interval anchoring |
| ⚡ **Smart Deadline Behavior** | Choose between stacking overdue tasks or marking them as failed |
| 📊 **Dashboard View** | Today/Tomorrow overview with open, completed, and overdue tasks |
| 🗓️ **Calendar View** | Monthly calendar with navigation and daily details |
| 📱 **PWA Support** | Install as a native app on your phone |
| 🔒 **Password Protected** | Simple authentication for personal use |
| 🌍 **Multi-language** | English and German, easily extensible |
| 🏠 **Self-hosted** | Your data stays on your server |

## 🚀 Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/ErNobyl-1/Recury.git
cd Recury
cp .env.example .env
```

### 2. Edit `.env`

```env
APP_PORT=8123
AUTH_PASSWORD=your-secure-password    # Change this!
SESSION_SECRET=your-random-string     # Change this!
```

> 💡 Generate a secure secret: `openssl rand -hex 32`

### 3. Launch

```bash
docker compose up -d
```

### 4. Access

Open `http://your-server:8123` and log in with your password.

---

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | Port the app runs on | `8123` |
| `AUTH_PASSWORD` | Login password | `changeme` |
| `SESSION_SECRET` | Secret for secure cookies | - |
| `VITE_DEFAULT_LOCALE` | Default language (`en` or `de`) | `en` |
| `TZ` | Timezone | `Europe/Berlin` |

## 🔄 Updates

```bash
git pull
docker compose up -d --build
```

## 🛑 Stop

```bash
docker compose down
```

Your data persists in the Docker volume.

---

## 🛠️ Development

<details>
<summary>Local development without Docker</summary>

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Create database
npm run db:push

# Start dev servers
npm run dev
```

- **API**: http://localhost:3000
- **Web**: http://localhost:5173

</details>

### Project Structure

```
Recury/
├── packages/
│   ├── api/           # Backend (Fastify + Prisma + SQLite)
│   └── web/           # Frontend (React + Vite + TailwindCSS)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 📡 API Reference

<details>
<summary>View API Endpoints</summary>

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/status` | Check auth status |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all tasks |
| POST | `/api/templates` | Create task |
| PUT | `/api/templates/:id` | Update task |
| DELETE | `/api/templates/:id` | Archive task |

### Instances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Today/Tomorrow overview |
| GET | `/api/instances?from=&to=` | Get instances for date range |
| POST | `/api/instances/:id/complete` | Mark as completed |

</details>

---

## 💡 Tips

### Week A/B Schedule

For a bi-weekly rotation:

**Week A Task:**
- Schedule: Interval
- Every: 2 weeks
- Anchor: First day of Week A

**Week B Task:**
- Schedule: Interval
- Every: 2 weeks
- Anchor: First day of Week B (+1 week offset)

---

## 🔐 Security

- Passwords are hashed (bcrypt)
- Session-based authentication with secure cookies
- Recommended: Access only via local network or VPN

---

## 📄 License

MIT © [Recury](https://github.com/ErNobyl-1/Recury)
