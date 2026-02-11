// This script runs on first MongoDB container startup.
// It is mounted via docker-entrypoint-initdb.d and executed
// against the MONGO_INITDB_DATABASE (cavetalk).

// Create an application-level user for the backend
// Credentials come from environment variables (set in docker-compose)
// with safe defaults for local development
db.createUser({
  user: process.env.PFN_MONGO_USER || "pfn_user",
  pwd: process.env.PFN_MONGO_PASSWORD || "pfn_pass",
  roles: [{ role: "readWrite", db: "cavetalk" }],
});

// Create collections with schema validation hints
db.createCollection("rooms");
db.createCollection("player_room_map");

// Create indexes
// rooms: _id is the room code (default index)
// player_room_map: index on roomCode for fast lookups
db.player_room_map.createIndex({ roomCode: 1 });

print("✅ cavetalk database initialized: collections and indexes created.");
