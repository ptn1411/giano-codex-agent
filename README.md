# Giano Codex Agent

AI Coding Assistant for Giano Chat, powered by Claude API.

## Features

- 🤖 **Custom Agent Engine** - ReAct-based tool execution
- 🔧 **Tool Layer** - File ops, commands, grep, git
- 💬 **Giano Integration** - Bot SDK for chat
- 📋 **Task System** - Define tasks in Markdown
- 🔒 **Safety** - Command validation & approval flows
- 📝 **Planning** - Multi-step task planning
- 🛠️ **Tools** - See [Tool Catalog](TOOL_CATALOG.md) for full list.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your settings

# Run in development
npm run dev

# Build for production
npm run build
npm start

# Run quality checks (type-check, lint, build)
npm run check
```

## Configuration

Edit `.env` file:

```env
# Bot credentials
BOT_TOKEN=your_bot_token
GIANO_API_URL=https://messages-api.bug.edu.vn
GIANO_WS_URL=wss://messages-api.bug.edu.vn/bot/ws

# LLM settings
LLM_BASE_URL=http://127.0.0.1:8045/v1
LLM_API_KEY=your_api_key
LLM_MODEL=claude-opus-4-5-thinking
```

## Usage

In Giano chat:

```
@agent fix the typo in src/utils.ts
@agent add input validation to login endpoint
@agent run tasks/fix-auth-bug.md
@agent status
@agent reset
```

## Project Structure

```
src/
├── index.ts           # Entry point
├── config.ts          # Configuration
├── types/             # TypeScript types
├── bot/               # Giano bot handlers
├── agent/             # Agent engine
├── llm/               # LLM client
├── tools/             # Tool implementations
├── tasks/             # Task parser/executor
└── utils/             # Utilities
```

## Development Status

See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for progress.
For future plans, see [BACKLOG.md](BACKLOG.md).

## License

MIT
