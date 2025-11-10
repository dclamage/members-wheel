# Members Wheel

A full-stack web application for managing multiple customizable prize wheels. As the owner, you can
curate every wheel and its entries while sharing the spinning experience with anyone. Each entry on a
wheel credits a specific person, making it easy to celebrate contributions while keeping the drawing
fair.

## Features

- **Multiple wheels** – create and manage as many wheels as you like.
- **Credited entries** – each entry includes a description plus a person to credit.
- **Fair spinning animation** – the winning entry is determined before a smooth 5-second animation
  (configurable per wheel) plays out.
- **Public read-only access** – visitors can browse wheels and spin them without a token.
- **Owner-only management** – an admin token gate protects wheel and entry changes.
- **SQLite storage** – lightweight persistent storage that works well on a single EC2 instance.

## Tech stack

| Layer      | Technology |
| ---------- | ---------- |
| Frontend   | React 18 + Vite |
| Backend    | Node.js + Express |
| Database   | SQLite |

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Clone and install

```bash
# install backend dependencies
cd server
npm install

# install frontend dependencies
cd ../client
npm install
```

### Environment variables

Duplicate the provided sample file and adjust values as needed:

```bash
cd server
cp .env.example .env
```

| Variable      | Description | Default |
| ------------- | ----------- | ------- |
| `PORT`        | HTTP port for the API server | `4000` |
| `ADMIN_TOKEN` | Secret token required for wheel/entry changes | `change-me` |
| `SQLITE_PATH` | Path to the SQLite database file | `./data/members-wheel.sqlite` |

> **Important:** Keep the admin token secret. Share only the frontend URL with viewers.

### Initialize the database

Optionally seed a sample wheel and entries:

```bash
cd server
npm run seed
```

This creates `server/data/members-wheel.sqlite` if it doesn’t already exist.

### Run the development servers

Start the API server:

```bash
cd server
npm run dev
```

In another terminal, launch the React dev server:

```bash
cd client
npm run dev
```

The frontend listens on [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to
the backend.

### Production build

Build the frontend assets:

```bash
cd client
npm run build
```

The Vite output will be located in `client/dist`. You can serve these assets from any static host or
have Express serve them (add a static handler in `server/src/app.js` when you’re ready).

Run the server in production mode:

```bash
cd server
npm start
```

Ensure the `PORT` and `SQLITE_PATH` environment variables suit your EC2 deployment.

## API overview

The API is namespaced under `/api`.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/api/wheels` | List all wheels with entries |
| `GET` | `/api/wheels/:id` | Fetch a single wheel |
| `POST` | `/api/wheels` | Create a wheel *(admin token required)* |
| `PATCH` | `/api/wheels/:id` | Update name or spin duration *(admin token required)* |
| `DELETE` | `/api/wheels/:id` | Delete a wheel *(admin token required)* |
| `POST` | `/api/wheels/:id/entries` | Add one or more entries *(admin token required)* |
| `PATCH` | `/api/wheels/:wheelId/entries/:entryId` | Update an entry *(admin token required)* |
| `DELETE` | `/api/wheels/:wheelId/entries/:entryId` | Remove an entry *(admin token required)* |

Authentication uses the `x-admin-token` header. Requests without the configured token receive a
`403 Forbidden` response.

## Project structure

```
members-wheel/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components and styles
│   │   ├── App.jsx       # Main application shell
│   │   └── api.js        # Axios instance
│   └── vite.config.js
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/       # Route definitions
│   │   ├── middleware/   # Express middleware (admin token guard)
│   │   ├── app.js        # Express app configuration
│   │   ├── db.js         # SQLite helper + schema bootstrap
│   │   ├── index.js      # Server entry point
│   │   └── seed.js       # Optional seed script
│   └── data/             # SQLite database location (git-ignored)
├── README.md
└── .gitignore
```

## Deployment notes

- Keep the backend process running (e.g., with PM2 or systemd) on your EC2 instance.
- Ensure the SQLite file is stored on persistent disk (`server/data/members-wheel.sqlite`).
- Serve the frontend with a static host or integrate with Express to deliver the built assets.
- Configure HTTPS via a load balancer or reverse proxy for production use.

## License

[MIT](LICENSE)
