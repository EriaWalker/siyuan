# SiYuan Frontend (app) Instructions

This directory contains the SiYuan frontend, built with TypeScript and Electron.

## Tech Stack

- **Framework:** Electron
- **Language:** TypeScript
- **Bundler:** Webpack
- **Styling:** SCSS
- **Package Manager:** pnpm

## Key Commands

- `pnpm install`: Install dependencies.
- `pnpm run dev`: Start development mode (Webpack watch).
- `pnpm run lint`: Run ESLint and fix issues.
- `pnpm run build:desktop`: Build the desktop version for production.
- `pnpm run dist`: Package the application.

## Directory Structure

- `src/`: Source code.
  - `protyle/`: The Markdown editor component.
  - `layout/`: UI layout management.
  - `busniess/`: Business logic.
- `electron/`: Electron main process code.
- `appearance/`: Themes, icons, and languages.

## Coding Standards

- Use functional programming where appropriate.
- Maintain type safety with TypeScript.
- Follow ESLint rules defined in `eslint.config.mjs`.
