'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

type MessageType = {
    type: 'user' | 'bot';
    content: string;
};

export default function ChatBox() {
    const [messages, setMessages] = useState<MessageType[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        // Adiciona a mensagem do usuário
        const newMessage: MessageType = { type: 'user', content: inputMessage };
        const newMessages = [...messages, newMessage];
        setMessages(newMessages);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('https://script4.store/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: inputMessage }),
            });

            const data = await response.json();
            
            if (response.ok) {
                const botMessage: MessageType = { type: 'bot', content: data.response };
                setMessages([...newMessages, botMessage]);
            } else {
                console.error('Erro:', data.error);
                const errorMessage: MessageType = { type: 'bot', content: 'Desculpe, ocorreu um erro ao processar sua mensagem.' };
                setMessages([...newMessages, errorMessage]);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
            const errorMessage: MessageType = { type: 'bot', content: 'Erro ao conectar com o servidor.' };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-3xl mx-auto bg-white dark:bg-[#2A2A2A] transition-colors duration-300">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                    >
                        <div
                            className={`max-w-[80%] p-3 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] border-2 border-black dark:border-white transition-all duration-200 ${
                                message.type === 'user'
                                    ? 'bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC]'
                                    : 'bg-[#B8FF9F] dark:bg-[#008000] hover:bg-[#9dfc7c] dark:hover:bg-[#006400]'
                            }`}
                        >
                            {message.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 p-3 rounded-lg bg-[#B8FF9F] dark:bg-[#008000] border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-black dark:bg-white rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="border-t-2 border-black dark:border-white p-4 transition-colors duration-300">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 p-2 border-2 border-black dark:border-white rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFA6F6] dark:focus:ring-[#FF00FF] bg-white dark:bg-[#2A2A2A] text-black dark:text-white transition-colors duration-300"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading}
                        className="px-4 py-2 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] text-black dark:text-white border-2 border-black dark:border-white rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-5 h-5" />
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
} 