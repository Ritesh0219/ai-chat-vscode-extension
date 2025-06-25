# AI Chat Assistant

A Visual Studio Code extension that integrates a Gemini-powered AI chat assistant using a React-based WebView interface.

## 🔍 Features

- React-based chat UI embedded inside VS Code.
- Powered by Google Gemini API (supports `gemini-pro`, `gemini-1.5`, etc).
- Mention files using `@filename` syntax to include file contents in prompts.
- Supports contextual code generation and modification based on current workspace.

## 📷 Demo

> _Add a screenshot or screen recording of your extension here if possible._

## ⚙️ Requirements

- Node.js (v14 or above)
- `vsce` CLI for packaging: `npm install -g vsce`
- Google Gemini API Key (place in `.env` file as `GEMINI_API_KEY`)
- Ensure `asset-manifest.json` is correctly generated after `npm run build` inside React.

## 🧪 How to Use

1. Run your extension in a VS Code Extension Development Host.
2. Open Command Palette → `AI Chat Assistant: Start`.
3. Start chatting in the AI interface.
4. To include a file’s content, type `@filename` in your prompt.

Example:
```text
Explain what the function in @test1.py does.
