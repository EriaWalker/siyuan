# SiYuan Backend (kernel) Instructions

This directory contains the SiYuan kernel, written in Go.

## Tech Stack

- **Language:** Go
- **Web Framework:** Gin
- **Real-time:** Gorilla WebSocket
- **Data Storage:** SQLite
- **Markdown Engine:** Lute

## Key Commands

- `go run main.go`: Run the kernel.
- `go build`: Build the kernel binary.
- `go test ./...`: Run tests.

## Directory Structure

- `api/`: REST API handlers.
- `model/`: Data models and business logic.
- `server/`: HTTP and WebSocket server setup.
- `util/`: Utility functions.

## Coding Standards

- Follow standard Go project layout and idioms.
- Use `gin.Context` for API request handling.
- Ensure proper error handling and logging using the project's logging utility.
