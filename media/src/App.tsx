/* global acquireVsCodeApi */
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
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
            content: ` File "${pendingFilename}" not found in your workspace.`,
          },
        ]);
        setWaitingForFile(false);
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini... (@filename)"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={waitingForFile}
        />
        <button onClick={handleSend} disabled={waitingForFile}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
