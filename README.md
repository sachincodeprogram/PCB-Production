# PCB Tracking Management Application

A MERN stack app for tracking PCB orders through an 8-stage manufacturing pipeline.

## Stack
- **client/** — React (Vite) + react-router-dom + axios
- **server/** — Node.js + Express + MongoDB (mongoose) + JWT auth

## Setup

### Server
```
cd server
npm install
# copy .env.example to .env and fill in MONGO_URI / JWT_SECRET
npm run seed   # creates default admin (admin / admin123) and the 8 stages
npm run dev    # http://localhost:5000
```

### Client
```
cd client
npm install
# copy .env.example to .env and set VITE_API_URL if needed
npm run dev    # http://localhost:5173
```

## Roles
- **admin** — full access: orders, departments, user & stage management
- **manager** — orders, new order booking, departments (view only)
- **team** — sees only orders currently at their assigned stage; marks them complete to forward to the next stage

Default login: `admin` / `admin123`
