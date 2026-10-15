# 📚 ResourceHub
### Resource Reservation Management System

![Next.js](https://img.shields.io/badge/Next.js-16.4.1-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)
![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)

**ResourceHub** is a full-stack web application designed to simplify the management and reservation of shared organizational resources.

It provides a centralized platform for administrators to manage physical resources and monitor reservations, while employees can browse availability, reserve specific units, and track their bookings.


---

## 🎯 Problem Statement

Organizations often rely on spreadsheets, manual records, or informal communication to manage shared facilities and equipment. This can result in scheduling conflicts, overlapping reservations, and uncertainty about resource availability.

ResourceHub addresses these challenges through:

- Centralized resource and reservation management.
- Real-time availability checking.
- Individual physical resource unit tracking.
- Role-based access control.
- Conflict prevention and booking validation.
- Reservation lifecycle management.
- Resource maintenance handling.
- Auditable reservation activity.

## ✨ Core Features

### 🔐 Authentication & Authorization

- Secure login and logout.
- ADMIN and EMPLOYEE user roles.
- JWT authentication using `jose`.
- HttpOnly authentication cookies.
- Server-side route protection.
- Role-based API authorization.
- Session-based navigation.

### 🛠️ Administrator Features

**Resource Management**

- Create and update resource categories.
- Create and update resource types.
- Register individually identifiable physical units.
- Bulk-create resource units.
- Activate and deactivate units.
- Start and end resource maintenance.
- Handle reservations affected by maintenance.
- Search, filter, sort, and paginate resource records.

**Reservation Management**

- View employee reservations.
- View confirmed, checked-out, overdue, and completed reservations.
- Check out reserved resources.
- Process physical resource returns.
- Cancel eligible reservations.
- Manually mark eligible reservations as no-show.
- Inspect reservation audit events.
- Search and filter reservation records.

### 👩‍💻 Employee Features

- Browse resource categories and types.
- View physical resource inventory.
- Search and filter available resources.
- Select reservation dates and time slots.
- Check availability for individual physical units.
- Reserve a specific available resource unit.
- View current and upcoming reservations.
- Cancel eligible reservations.
- Access completed, cancelled, and no-show history.

## 📋 Reservation Business Rules

The following business rules are enforced by the backend:

| Rule | Implementation |
|---|---|
| Operating timezone | Asia/Colombo (UTC+05:30) |
| Database timestamp storage | UTC |
| Operating hours | 8:00 AM – 5:00 PM |
| Booking window | Next 48 hours |
| Minimum duration | 30 minutes |
| Time intervals | 30-minute boundaries |
| Overnight bookings | Not permitted |
| Reservation approval | Immediate confirmation |
| Resource assignment | Individual physical units |
| Overlapping reservations | Prevented for the same unit |
| Overdue reservations | Derived from time and status |
| No-show handling | Manual ADMIN action |
| Late returns | Resource remains occupied until returned |
| Maintenance conflicts | Explicit reassignment or cancellation handling |
| Audit trail | Reservation lifecycle events recorded |

The backend performs authoritative validation. Frontend validation improves usability but does not replace backend checks.

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| Full-stack framework | Next.js 16.4.1, App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS v4 |
| Icons | Lucide React |
| Notifications | Sonner |
| Validation | Zod |
| Authentication | JWT (`jose`), HttpOnly cookies |
| Database | PostgreSQL |
| ORM | Prisma 6.19.3 |
| Version control | Git and GitHub |

## 🧩 System Architecture

ResourceHub follows a modular full-stack architecture within a single Next.js application.

```text
React Frontend
      |
      v
Next.js App Router
      |
      v
API Route Handlers
      |
      v
Controllers
      |
      v
Services / Business Logic
      |
      v
Repositories
      |
      v
Prisma ORM
      |
      v
PostgreSQL Database
```

The architecture separates HTTP handling, business rules, and database access to improve maintainability and testability.

### Project Structure

```text
resourcehub/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── admin/
│   │   │   ├── resources/
│   │   │   └── reservations/
│   │   ├── employee/
│   │   │   ├── book/
│   │   │   └── reservations/
│   │   ├── login/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/
│   │   └── ui/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── resources/
│   │   └── reservations/
│   ├── hooks/
│   ├── lib/
│   ├── server/
│   │   ├── auth/
│   │   ├── config/
│   │   └── modules/
│   └── types/
├── .env
├── package.json
└── README.md
```

## 🗃️ Database Design

The application uses six core database entities.

| Entity | Responsibility |
|---|---|
| User | Stores employee and administrator accounts |
| ResourceCategory | Groups organizational resources |
| ResourceType | Defines bookable resource types |
| ResourceUnit | Represents identifiable physical items |
| Reservation | Stores resource bookings and lifecycle status |
| ReservationEvent | Records reservation audit activity |

### Entity Relationships

- One resource category can contain multiple resource types.
- One resource type can contain multiple physical units.
- One physical unit can have multiple reservations over time.
- One user can create multiple reservations.
- One reservation can have multiple audit events.

**ER Diagram:** [View the ResourceHub ER Diagram](REPLACE_WITH_PUBLIC_VIEW_ONLY_ER_DIAGRAM_URL)

## ⚙️ Local Setup & Installation

### Prerequisites

Install the following tools:

- Node.js and npm compatible with Next.js 16.
- PostgreSQL.
- Git.
- A code editor such as Visual Studio Code.

### 1. Clone the repository

```bash
git clone https://github.com/Noori-Amasha/resourcehub.git
cd resourcehub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/resourcehub?schema=public"
JWT_SECRET="REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG"
```

Replace the placeholders with your local PostgreSQL credentials and a secure random JWT secret.

Never commit real credentials or secrets to GitHub.

### 4. Initialize the database

Create the PostgreSQL database specified by `DATABASE_URL`, then generate the Prisma client:

```bash
npx prisma generate
```

Apply existing Prisma migrations:

```bash
npx prisma migrate deploy
```

If the project does not contain migration files, follow the database initialization procedure appropriate to the checked-in Prisma schema.

### 5. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The application redirects users to the login page or their authorized dashboard.

### 6. Create initial users

An ADMIN account and an EMPLOYEE account must exist in the database before the respective interfaces can be tested.

Use the project's configured user provisioning or seed procedure to create these accounts. Passwords must be stored securely as hashes.

Do not insert plaintext passwords or publish real account credentials.

## 🧭 Application Routes

| Route | Role | Purpose |
|---|---|---|
| `/login` | Public | Sign in |
| `/admin` | ADMIN | Administrator dashboard |
| `/admin/resources` | ADMIN | Resource Management |
| `/admin/reservations` | ADMIN | Reservation Management |
| `/employee` | EMPLOYEE | Employee dashboard |
| `/employee/book` | EMPLOYEE | Resource availability and booking |
| `/employee/reservations` | EMPLOYEE | Current reservations and history |

## 🔌 API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Get authenticated user |

### Resource Management

| Method | Endpoint | Description |
|---|---|---|
| GET / POST | `/api/categories` | List or create categories |
| PATCH | `/api/categories/[id]` | Update category |
| GET / POST | `/api/resource-types` | List or create types |
| PATCH | `/api/resource-types/[id]` | Update type |
| GET / POST | `/api/resource-units` | List or create physical units |
| PATCH | `/api/resource-units/[id]` | Update unit |
| POST | `/api/resource-units/bulk` | Bulk unit creation |
| POST | `/api/resource-units/[id]/maintenance` | Start maintenance |
| POST | `/api/resource-units/[id]/maintenance/end` | End maintenance |

### Reservations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/availability` | Check unit availability |
| GET / POST | `/api/reservations` | List or create reservations |
| POST | `/api/reservations/[id]/cancel` | Cancel reservation |
| POST | `/api/reservations/[id]/checkout` | Check out unit |
| POST | `/api/reservations/[id]/return` | Return unit |
| POST | `/api/reservations/[id]/no-show` | Mark no-show |
| GET | `/api/reservations/[id]/events` | View audit events |

Protected endpoints require an authenticated session and appropriate role permissions.

## 🔄 Reservation Lifecycle

```text
              CONFIRMED
               /  |  \
              /   |   \
        CANCELLED |   NO_SHOW
                  |
               CHECKOUT
                  |
              CHECKED_OUT
                  |
         Overdue if past end
                  |
                RETURN
                  |
              COMPLETED
```

Overdue is a derived condition rather than a separate database reservation status.

## ✅ Validation & Reliability

ResourceHub includes:

- Client-side form validation.
- Server-side Zod validation.
- Authentication and role authorization.
- Availability conflict checking.
- Confirmation dialogs for important actions.
- Loading and error states.
- User-facing toast notifications.
- Reservation audit events.
- Resource maintenance safeguards.

## 🧪 Testing

### Build Validation

Run:

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

### Functional Test Checklist

- [x] ADMIN resource management
- [x] Employee reservation creation
- [x] Reservation checkout
- [x] Overdue status identification
- [x] Resource return
- [x] Completed status reflected in Employee History
- [x] ADMIN session authorization during return
- [ ] Final cancellation regression test
- [ ] Final no-show regression test
- [ ] Final maintenance conflict regression test
- [ ] Final audit event regression test
- [ ] Final clean-clone setup verification

These entries reflect the tests confirmed during development; unchecked items should be verified before submission.

## 🎥 Demonstration Video

**Application demonstration (3–5 minutes):**

[Watch the ResourceHub Demonstration](REPLACE_WITH_PUBLIC_VIEW_ONLY_VIDEO_URL)

The demonstration covers authentication, resource management, employee booking, reservation lifecycle handling, and the database architecture.

## 🔒 Security Considerations

- Password-based authentication.
- HttpOnly JWT session cookies.
- Role-based server-side access control.
- Protected administrative operations.
- Input validation.
- Restricted reservation state transitions.
- Sensitive configuration stored in environment variables.
- No authentication tokens stored in browser localStorage.

## 🚀 Release Information

**Release:** `v0.0.1` — Initial Assessment Release

**Release scope:**
- Role-based authentication.
- Resource category, type, and unit management.
- Employee booking and history.
- Admin reservation lifecycle management.
- Maintenance handling.
- Audit event tracking.
- Responsive dashboard interface.

**Deployment:** Local development environment. Public deployment is not required for this assessment.

## 👩‍💻 Developer

**Amasha Kahandawa**

GitHub: [Noori-Amasha](https://github.com/Noori-Amasha)


## 📄 Project Purpose

This repository is submitted as an internship technical assessment, demonstrating full-stack engineering, database modeling, modular architecture, access control, practical usability, and maintainable code.

---

**ResourceHub — Organize resources. Simplify reservations.**