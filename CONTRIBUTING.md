# Contributing to DoGet Chrome Extension

First off, thank you for considering contributing! 🎉

## Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/weisha1991/doget-chrome-extension.git`
3. Load the extension in Chrome (see [README.md](README.md) for instructions)
4. Make your changes
5. Submit a pull request

## Development Workflow

```bash
# Install dev dependencies
npm install

# Lint
npm run lint

# Format check
npm run format:check

# Auto-format
npm run format

# Build .zip for Chrome Web Store
npm run build
```

## Code Style

- Vanilla JavaScript (no frameworks)
- [Prettier](https://prettier.io/) for formatting
- [ESLint](https://eslint.org/) for linting
- Run `npm run format` before committing

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes with clear, focused commits
3. Run `npm run lint` and `npm run format:check` — both must pass
4. Update README.md if you changed user-facing behavior
5. Open a PR against the `main` branch

### PR Title Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add right-click menu for images`
- `fix: handle API timeout gracefully`
- `docs: update installation instructions`
- `i18n: add Japanese locale`

## Reporting Issues

When filing a bug report, please include:

1. Chrome version (`chrome://version/`)
2. Extension version (from `manifest.json`)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any) from `chrome://extensions/` → "Service Worker" → "Inspect"

## Adding a Language

1. Create a new directory under `_locales/` (e.g., `_locales/ja/`)
2. Copy `_locales/en/messages.json` as a template
3. Translate all `message` values
4. Test by changing Chrome's language setting

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
