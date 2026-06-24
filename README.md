# Event Ticketing System

Production-ready event ticketing platform built with NestJS and Next.js.

## Tech Stack

### Backend
- **Framework**: NestJS 10+ with TypeScript
- **Server**: Fastify (high-performance HTTP server)
- **ORM**: Prisma (type-safe database client)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT + Passport.js
- **Validation**: class-validator + class-transformer

### Frontend
- **Framework**: Next.js 15+ (App Router) with TypeScript
- **UI**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State**: React Server Components + Server Actions
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.IO client

## Features

- **Event Management**: Create, update, and manage events
- **Seat Selection**: 2D visual seat maps with real-time availability
- **Booking System**: Distributed seat reservation with locking
- **Payment Integration**: Multiple payment gateways (Stripe, Midtrans)
- **Real-time Updates**: WebSocket for live seat availability
- **User Management**: Role-based access control (Admin, Organizer, Attendee)
- **Analytics**: Event performance and revenue tracking
- **QR Code Tickets**: Digital tickets with QR validation

## Getting Started

### Prerequisites

- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Docker (for Redis)
- PostgreSQL 15+ (local install, Docker, or cloud-hosted)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd event-ticketing-system
```

2. Start Redis:
```bash
docker-compose up -d
```

> **Note:** The default `docker-compose.yml` only starts Redis. If you need the full stack
> (PostgreSQL + Redis + MinIO), use the full compose file instead:
> ```bash
> docker-compose -f docker-compose.full.yml up -d
> ```

3. Install dependencies:
```bash
npm install
```

4. Set up environment variables:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

5. Run database migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

6. Start the development servers:
```bash
npm run dev
```

The backend will be available at `http://localhost:3000`
The frontend will be available at `http://localhost:3001`
API documentation: `http://localhost:3000/api/docs`

## Project Structure

```
.
├── backend/                # NestJS backend
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   ├── common/        # Shared utilities
│   │   ├── config/        # Configuration
│   │   └── websocket/     # WebSocket gateway
│   ├── prisma/            # Database schema
│   └── tests/             # Tests
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities and services
├── shared/               # Shared types
└── docker/               # Docker configurations
```

## API Documentation

Once the backend is running, visit `http://localhost:3000/api/docs` for the interactive API documentation.

## Testing

```bash
# Run all tests
npm test

# Run e2e tests
npm run test:e2e

# Run load tests
npm run test:load
```

## Development Scripts

```bash
# Start all services
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Build all packages
npm run build

# Lint all packages
npm run lint
```

## Database

View and manage your database with Prisma Studio:
```bash
cd backend
npx prisma studio
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
