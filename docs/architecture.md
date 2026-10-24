# System Architecture Documentation

This document outlines the software design, folder structure, and component interaction for the **Automated Banking Management System**.

## 1. Monorepo Structure

The project is structured as a monorepo to enable concurrent development of the frontend interface, secure API backend, machine learning modules, and schema migration utilities:

- **`/backend`**: FastAPI Python service implementing secure API routers, SQLAlchemy data structures, and middleware logic.
- **`/frontend`**: React web application built with Vite and Tailwind CSS.
- **`/ml`**: Python packages containing scikit-learn models for anomaly and fraud score evaluation.
- **`/database`**: System database definition and SQL schema references.

---

## 2. Backend Design (FastAPI)

The backend follows a modular, layered architecture to enforce a clean separation of concerns:

```
[Client / React UI] 
       │
       ▼
 ┌───────────┐
 │  main.py  │  ◄── Register middleware (CORS, ErrorHandling)
 └─────┬─────┘
       │
       ▼
 ┌───────────┐
 │  routers  │  ◄── API route paths (e.g., /health, /auth, /accounts)
 └─────┬─────┘
       │ (Request validation via Schemas / Pydantic models)
       ▼
 ┌───────────┐
 │ services  │  ◄── Core business logic & computations
 └─────┬─────┘
       │
       ▼
 ┌───────────┐
 │  models   │  ◄── ORM Entities mapping database tables
 └─────┬─────┘
       │ (SQLAlchemy Session)
       ▼
 ┌───────────┐
 │    db     │  ◄── Database engine configurations (SQLite / PostgreSQL)
 └───────────┘
```

### Components:
- **`core/`**: Read environment configurations from `.env` using Pydantic Settings, configure logging, and export global security keys.
- **`db/`**: Create engine binds and configure standard `get_db` session dependencies.
- **`middleware/`**: Define HTTP filters, global exception handlers, and CORS filters.
- **`routers/`**: Group APIs into modular sub-routers (`auth`, `accounts`, `transactions`, `health`).
- **`schemas/`**: Pydantic schemas enforcing request validation and response filtering.
- **`services/`**: Abstract data queries from routers to keep controllers thin and testable.

---

## 3. Database Strategy

To ensure zero-setup local execution while fully supporting standard production database setups, the application configures SQLAlchemy to support two engine classes:

- **SQLite**: Used automatically when no environment database string is found. Stores tables locally in a file called `banking.db`.
- **PostgreSQL**: Production-ready configuration supported by adding a standard connection string (`DATABASE_URL=postgresql://user:password@host:5432/db`) in `.env`.

On server startup, `lifespan` triggers check the database, auto-creating all defined relational models (`Base.metadata.create_all`).

---

## 4. Frontend Design (React + Vite + Tailwind)

The frontend is built using standard React components with high modularity:

- **`services/`**: Axios configuration with environment base url mappings, request timeouts, and interceptors to automatically format errors.
- **`pages/`**: View components loaded dynamically.
- **`components/`**: Atomic visual nodes (buttons, card layout, inputs).
- **`layouts/`**: Wrappers grouping common sidebars and navigation headers.
