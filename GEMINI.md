# SiYuan Gemini Instructions

SiYuan is a privacy-first personal knowledge management system. This project is a monorepo consisting of a Go kernel and a TypeScript/Electron frontend.

## Project Structure

- `app/`: Frontend application (TypeScript, Electron, Webpack).
- `kernel/`: Backend application (Go).
- `scripts/`: Various build and maintenance scripts.
- `appearance/`: Themes, icons, and language files.

## Tech Stack

- **Frontend:** TypeScript, Electron, Webpack, SCSS, pnpm.
- **Backend:** Go, Gin (HTTP), WebSocket, SQLite (data storage).
- **Editor Engine:** [Lute](https://github.com/88250/lute).

## Development Workflows

- **Frontend Development:** See `app/GEMINI.md`.
- **Backend Development:** See `kernel/GEMINI.md`.
- **Building:** Use the scripts in `scripts/` or `pnpm` commands in `app/`.

## Conventions

- Follow standard Go idioms for the kernel.
- Use TypeScript for the frontend, following the project's ESLint configuration.
- Markdown is the primary data format, handled by Lute.
