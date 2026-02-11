# CaveTalk - Digital Word-Guessing Party Game

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

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the application is with Docker. A **local MongoDB** instance is included automatically — no external database needed.

```bash
# Clone the repository
git clone <repository-url>
cd pfn

# Start all services (frontend + backend + MongoDB)
docker compose up --build

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
- MongoDB running locally on port 27017

#### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pfn
   ```


2. **Setup Backend**
   ```bash
   cd backend
   cp ../.env.example .env
   npm install
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   cp ../.env.example .env.local
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

## Building for Production

### With Docker
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Manual Build
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

## License

This project is for personal/educational use. The game mechanics are inspired by Poetry for Neanderthals by Exploding Kittens, Inc. No copyrighted content is included.
