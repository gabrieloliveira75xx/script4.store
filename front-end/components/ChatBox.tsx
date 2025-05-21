"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Terminal } from "lucide-react"

type MessageType = {
  type: "user" | "bot"
  content: string
}

type CommandResponse = {
  stdout: string
  stderr: string
  returncode: number
}

export default function TerminalChat() {
  const [messages, setMessages] = useState<MessageType[]>([
    { type: "bot", content: "Welcome to Linux Terminal v1.0" },
    { type: "bot", content: "Type 'help' for a list of available commands." },
    { type: "bot", content: "Use ↑ and ↓ keys to navigate command history." },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // No auto-scrolling
  useEffect(() => {
    // Intentionally left empty - no auto-scrolling
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const formatCommandOutput = (response: CommandResponse): string => {
    let output = ""
    
    if (response.stdout) {
      output += response.stdout
    }
    
    if (response.stderr) {
      output += "\nError: " + response.stderr
    }
    
    if (response.returncode !== 0) {
      output += `\nCommand exited with code ${response.returncode}`
    }
    
    return output.trim() || "Command executed successfully."
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const cmd = inputMessage.trim().toLowerCase()
    
    // Handle clear command locally
    if (cmd === "clear") {
      setMessages([])
      setInputMessage("")
      return
    }

    setCommandHistory((prev) => [inputMessage, ...prev])
    setHistoryIndex(-1)

    const newMessage: MessageType = { type: "user", content: inputMessage }
    const newMessages = [...messages, newMessage]
    setMessages(newMessages)
    setInputMessage("")
    setIsLoading(true)

    try {
      const response = await fetch("https://script4.store/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: inputMessage }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const commandResponse = data.response as CommandResponse
      const formattedOutput = formatCommandOutput(commandResponse)
      
      const botMessage: MessageType = { 
        type: "bot", 
        content: formattedOutput
      }
      setMessages([...newMessages, botMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: MessageType = {
        type: "bot",
        content: "Error: Unable to execute command. Please try again.",
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setInputMessage(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInputMessage(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInputMessage("")
      }
    }
  }

  const handleTerminalClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col" onClick={handleTerminalClick}>
      {/* Terminal Header */}
      <div className="flex items-center px-3 py-2 bg-white dark:bg-[#2A2A2A] border-b-2 border-black dark:border-white">
        <Terminal className="w-4 h-4 mr-2 text-black dark:text-white" />
        <span className="font-semibold text-black dark:text-white text-sm">Terminal</span>
        <div className="ml-auto flex items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">user@linux:~</span>
        </div>
      </div>

      {/* Terminal Output Area - Redesigned to look like a continuous terminal */}
      <div className="h-[300px] overflow-y-auto font-mono text-sm bg-white dark:bg-[#2A2A2A] text-black dark:text-white p-3">
        {messages.map((message, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {message.type === "user" ? (
              <div className="text-black dark:text-green-400 mb-1">
                <span className="text-blue-600 dark:text-blue-400">user@linux</span>
                <span className="text-black dark:text-white">:</span>
                <span className="text-blue-600 dark:text-blue-400">~</span>
                <span className="text-black dark:text-white">$ </span>
                <span className="text-black dark:text-white">{message.content}</span>
              </div>
            ) : (
              <div className="pl-0 mb-2 text-black dark:text-white">{message.content}</div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-black dark:text-white">
            <span className="inline-flex items-center">
              <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse mr-1"></div>
              <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse mr-1 [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-pulse [animation-delay:0.4s]"></div>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-black dark:border-white py-2 px-3 transition-colors duration-300 bg-white dark:bg-[#2A2A2A] flex items-center">
        <div className="flex-1 flex items-center">
          <span className="text-blue-600 dark:text-blue-400 mr-0.5 text-sm">user@linux</span>
          <span className="text-black dark:text-white mr-0.5 text-sm">:</span>
          <span className="text-blue-600 dark:text-blue-400 mr-0.5 text-sm">~</span>
          <span className="text-black dark:text-white mr-2 text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 py-1 px-2 bg-transparent border-none outline-none text-black dark:text-white font-mono text-sm"
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="ml-2 px-3 py-1 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] text-black dark:text-white border-2 border-black dark:border-white rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
        >
          <Send className="w-3 h-3" />
          <span>Execute</span>
        </button>
      </div>
    </div>
  )
}
