# CaseGraph LE API

Base URL: `http://localhost:8000/api`

Authentication uses bearer JWT tokens returned by `POST /auth/login`.

## Auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `GET /auth/me`

## Core MVP

- `GET /dashboard`
- `GET /cases`
- `POST /cases`
- `GET /cases/{id}`
- `PUT /cases/{id}`
- `DELETE /cases/{id}`
- `GET /persons`
- `POST /persons`
- `GET /persons/{id}`
- `PUT /persons/{id}`
- `DELETE /persons/{id}`
- `GET /relationships`
- `POST /relationships`
- `GET /relationships/{id}`
- `PUT /relationships/{id}`
- `DELETE /relationships/{id}`
- `GET /graph/case/{case_id}`
- `GET /graph/person/{person_id}`
- `GET /audit-logs`
- `GET /audit-logs/case/{case_id}`
- `GET /audit-logs/user/{user_id}`

Interactive OpenAPI docs are available at `http://localhost:8000/docs`.
