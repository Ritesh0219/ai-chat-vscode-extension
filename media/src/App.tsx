/* global acquireVsCodeApi */
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [waitingForFile, setWaitingForFile] = useState(false);
  const [pendingFilename, setPendingFilename] = useState('');
  const [originalInput, setOriginalInput] = useState('');
  const [fileList, setFileList] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vscode.postMessage({ type: 'requestFileList' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'fileContent') {
        const content = message.content;
        const finalPrompt = originalInput.replace(`@${pendingFilename}`, `\n${content}\n`);
        sendToGemini(finalPrompt);
        setWaitingForFile(false);
      }

      if (message.type === 'fileNotFound') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `File "${pendingFilename}" not found in your workspace.`,
          },
        ]);
        setWaitingForFile(false);
      }

      if (message.type === 'fileList') {
        setFileList(message.files || []);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [originalInput, pendingFilename]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setOriginalInput(input);

    const atMatch = input.match(/@(\S+)/);
    if (atMatch) {
      const filename = atMatch[1];
      setPendingFilename(filename);
      setWaitingForFile(true);
      vscode.postMessage({ type: 'readFile', filename });
    } else {
      sendToGemini(input);
    }

    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const sendToGemini = async (prompt: string) => {
    try {
      const res = await fetch('http://localhost:3001/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      const aiMessage: Message = { role: 'assistant', content: data.reply };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Gemini server error.' },
      ]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setInput(value);
    setCursorPos(cursor);

    const lastAt = value.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1) {
      const typed = value.slice(lastAt + 1, cursor);
      const filtered = fileList.filter((file) => file.includes(typed));
      if (filtered.length) {
        setSuggestions(filtered);
        setShowSuggestions(true);
        return;
      }
    }

    setSuggestions([]);
    setShowSuggestions(false);
  };

  const selectSuggestion = (filename: string) => {
    if (!inputRef.current) return;
    const start = input.slice(0, cursorPos);
    const end = input.slice(cursorPos);
    const match = start.lastIndexOf('@');
    const newInput = start.slice(0, match + 1) + filename + ' ' + end;

    setInput(newInput);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  return (
    <div className="app">
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <b>{msg.role === 'user' ? 'You' : 'Gemini'}:</b> {msg.content}
          </div>
        ))}
      </div>

      <div className="input-box">
        <input
          type="text"
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Gemini... (@filename)"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={waitingForFile}
        />
        <button onClick={handleSend} disabled={waitingForFile}>
          Send
        </button>
        {showSuggestions && (
          <ul className="suggestions">
            {suggestions.map((file, i) => (
              <li key={i} onClick={() => selectSuggestion(file)}>
                {file}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
