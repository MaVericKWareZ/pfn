# PFN - Digital Word-Guessing Party Game

A digital adaptation of a word-guessing party game where players give clues using only single-syllable words. This MVP is designed for same-room, synchronous play where players use their phones as controllers.

## Features

- **Room-based multiplayer**: Create or join games with a 6-character room code
- **Role-based views**: Different UI for Poet, Judge, and Guesser roles
- **Server-authoritative**: Timer, scoring, and game state managed on server
- **Shared display**: Optional TV/laptop view showing scores and timer
- **Real-time updates**: WebSocket-based instant synchronization

## Tech Stack

### Backend

- Node.js + TypeScript
- NestJS (WebSocket gateway, dependency injection)
- Socket.IO for real-time communication

### Frontend

- Next.js 14 + React + TypeScript
- Tailwind CSS for styling
- Socket.IO client

## Project Structure

```
pfn/
├── backend/           # NestJS server
│   └── src/
│       ├── domain/        # Pure game logic
│       ├── application/   # Services
│       └── infrastructure/# WebSocket gateway
├── frontend/          # Next.js client
│   └── src/
│       ├── app/           # Pages
│       ├── hooks/         # React hooks
│       └── lib/           # Utilities
└── docs/              # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    └── IMPLEMENTATION_PLAN.md
```

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the application is with Docker. A **local MongoDB** instance is included automatically — no external database needed.

```bash
# Clone the repository
git clone <repository-url>
cd pfn

# Start all services (frontend + backend + MongoDB)
docker compose up --build

# Or for hot-reload development:
docker compose -f docker-compose.dev.yml up --build

# Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# MongoDB:  localhost:27017 (see .env.example for credentials / db: cavetalk)
```

> **Note:** On first run, the MongoDB init script creates the `cavetalk` database, an application user, and the required collections (`rooms`, `player_room_map`) with indexes.

### Option 2: Manual Setup

#### Prerequisites

- Node.js 18+
- npm or yarn

#### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pfn
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

#### Running the Application

1. **Start the backend server** (Terminal 1)

   ```bash
   cd backend
   npm run start:dev
   ```

   Server runs on `http://localhost:3001`

2. **Start the frontend** (Terminal 2)

   ```bash
   cd frontend
   npm run dev
   ```

   Frontend runs on `http://localhost:3000`

3. **Open in browser**
   - Main app: `http://localhost:3000`
   - Shared display: `http://localhost:3000/game/[ROOM_CODE]/display`

### Building for Production

#### With Docker

```bash
docker compose -f docker-compose.prod.yml up -d
```

#### Manual Build

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm run start
```

## How to Play

### Setup

1. One player creates a game and shares the room code
2. Other players join using the code on their phones
3. Players assign themselves to teams (or shuffle randomly)
4. Host starts the game

### Gameplay

1. Each turn, one player is the **Poet** and must give clues
2. The Poet sees a card with a 1-point word and 3-point phrase
3. The Poet describes the words using **only single-syllable words**
4. Teammates shout guesses aloud (real-world communication)
5. The opposing team's **Judge** watches for rule violations
6. If the Poet uses a multi-syllable word, the Judge presses **NO!**

### Scoring

- **+1 point**: Correctly guessing the easy word
- **+3 points**: Correctly guessing the hard phrase
- **-1 point**: NO! penalty (rule violation)
- **-1 point**: Skipping a card

### Turn End Conditions

- Timer expires (90 seconds)
- Judge presses NO!
- Both word and phrase are guessed

## Configuration

### Environment Variables

**Frontend** (`.env.local`):

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

**Backend** (`.env`):

```
PORT=3001
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and patterns
- [API Reference](docs/API.md) - WebSocket event documentation
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Development roadmap
- [Deployment Guide](docs/DEPLOYMENT.md) - CI/CD and production deployment

## MVP Scope

### Included

- Room creation/joining with codes
- Team assignment (manual + shuffle)
- 90-second server-authoritative timer
- Poet, Judge, Guesser, Spectator roles
- NO! mechanic with instant turn end
- Skip mechanic with penalty
- Scoring (+1, +3, -1)
- Shared screen display
- Reconnection support
- ~100 sample word/phrase pairs

### Not Included (Future)

- Online/remote multiplayer
- Voice chat or speech-to-text
- AI syllable detection
- User accounts
- Expansion packs
- Statistics/achievements

## Development

### Running Tests

The project includes a comprehensive test suite with 1,123 tests across three layers:

```bash
# Backend - All tests
cd backend
npm test

# Unit tests (domain layer)
npm run test:unit

# Integration tests (application layer)
npm run test:integration

# E2E tests (full game flow)
npm run test:e2e

# Coverage report
npm run test:cov

# Watch mode for TDD
npm run test:watch
```

**Test Coverage**: 91% overall

- Domain Layer: 95%
- Application Layer: 92%
- Infrastructure Layer: 87%

See [TESTING_SETUP.md](TESTING_SETUP.md) for detailed testing guide.

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## License

This project is for personal/educational use. The game mechanics are inspired by Poetry for Neanderthals by Exploding Kittens, Inc. No copyrighted content is included.
