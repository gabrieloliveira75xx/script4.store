'use client'

import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { Send, ChevronDown, ChevronUp, MessageCircle, Settings, Edit, Menu, X, Moon, Sun, Monitor } from 'lucide-react'
import axios from 'axios'
import Image from 'next/image'
import React from 'react'
import ChatBox from './ChatBox'

// Theme context
const ThemeContext = createContext({
  theme: 'light',
  setTheme: (theme: string) => {}, // eslint-disable-next-line @typescript-eslint/no-unused-vars
})

// Theme provider component
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState('auto')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'auto'
    setTheme(savedTheme)
    
    const updateTheme = () => {
      const root = document.documentElement
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      const activeTheme = savedTheme === 'auto' ? systemTheme : savedTheme

      root.classList.remove('light', 'dark')
      root.classList.add(activeTheme)
      setIsLoading(false)
    }

    updateTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addListener(updateTheme)

    return () => mediaQuery.removeListener(updateTheme)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const activeTheme = theme === 'auto' ? systemTheme : theme

    root.classList.remove('light', 'dark')
    root.classList.add(activeTheme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {isLoading ? (
        <div className="fixed inset-0 bg-white dark:bg-[#1A1A1A] transition-colors duration-300"></div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  )
}

// Theme toggle component
const ThemeToggle = () => {
  const { theme, setTheme } = useContext(ThemeContext)

  return (
    <div className="fixed top-4 right-4 z-50 flex space-x-2 bg-white dark:bg-[#1A1A1A] p-1 rounded-full shadow-md">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-full transition-colors duration-200 ${
          theme === 'light' ? 'bg-yellow-400 text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`}
        aria-label="Light mode"
      >
        <Sun size={20} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-full transition-colors duration-200 ${
          theme === 'dark' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`}
        aria-label="Dark mode"
      >
        <Moon size={20} />
      </button>
      <button
        onClick={() => setTheme('auto')}
        className={`p-2 rounded-full transition-colors duration-200 ${
          theme === 'auto' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        }`}
        aria-label="Auto theme"
      >
        <Monitor size={20} />
      </button>
    </div>
  )
}

export default function Portfolio() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [commentName, setCommentName] = useState('')
  const [comments, setComments] = useState<Array<{ id: string; name: string; text: string; createdAt: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  const homeRef = useRef<HTMLDivElement>(null)
  const projectsRef = useRef<HTMLDivElement>(null)
  const passionsRef = useRef<HTMLDivElement>(null)
  const commentsRef = useRef<HTMLDivElement>(null)
  const skillsRef = useRef<HTMLDivElement>(null)

  const faqData = [
    { question: "Qual é a sua linguagem de programação favorita?", answer: "Eu adoro trabalhar com JavaScript e TypeScript!" },
    { question: "Como você entrou no desenvolvimento web?", answer: "Comecei construindo pequenos projetos e me apaixonei por criar experiências interativas." },
    { question: "Qual é a sua abordagem para aprender novas tecnologias?", answer: "Acredito na aprendizagem prática e na construção de projetos para solidificar meu entendimento." },
  ]

  const projectsData = [
    { title: "Nuuvik", description: "Transformando empresas do analógico para o digital.", image: "/nuuvik.svg" },
    { title: "Space Informática", description: "Soluções de Hardware B2B e B2C", image: "/space.png" },
    { title: "Nexus RP", description: "Servidor de Roleplay", image: "/nexus.svg" },
  ]

  const passionsData = [
    { title: "Mundo Automotivo", description: "Paixão por carros e motores, especialmente modificações de alta performance", image: "/engine.png" },
    { title: "Desenvolvimento de CPU", description: "Fascinado pelo design e otimização de Dies de processadores modernos", image: "/cpu.png" },
    { title: "Cyberpunk", description: "Amo o universo cyberpunk, tanto no jogo quanto na série", image: "/cyberpunk.png" },
  ]

  const skillsData = {
    networking: [
      "Configurações intermediárias em PFSense (Firewall, VLANs, VPN, etc.)",
      "Experiência com Nginx/Traefik e dispositivos wireless TP-Link/UBIQUITI",
      "Experiência com Nginx/Traefik e dispositivos wireless TP-Link/UBIQUITI",
    ],
    hardware: [
      "Reparo de PCB e diagnóstico de hardware",
      "Virtualização Proxmox e servidores",
    ],
    programming: [
      "Next.js, Tailwind CSS, TypeScript",
      "Python com FastAPI e SQLAlchemy",
    ]
  }

  const computerImages = [
    "/computer1.png",
    "/computer2.png",
    "/computer3.png",
    "/computer4.png",
    "/computer5.png",
    "/computer6.png",
    "/computer7.png",
    "/computer8.png",
    "/computer9.png",
    "/computer10.png",
    "/computer11.png",
  ]

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/comments');
        setComments(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        setIsLoading(false);
      }
    };

    fetchComments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % computerImages.length)
    }, 5000)

    return () => clearInterval(timer)
  }, []) // eslint-disable-next-line @typescript-eslint/no-unused-vars

  const toggleMenu = () => setMenuOpen(!menuOpen)

  const handleCommentSubmit = async () => {
    if (commentName.trim() && comment.trim()) {
      try {
        const response = await axios.post('http://localhost:5000/api/comments', {
          name: commentName,
          text: comment
        });
        setComments(prevComments => [response.data, ...prevComments]);
        setComment('');
        setCommentName('');
      } catch (error) {
        console.error('Erro ao enviar comentário:', error);
      }
    }
  };

  return (
    <ThemeProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-white dark:bg-[#1A1A1A] text-black dark:text-white transition-colors duration-300">
        <ThemeToggle />
        
        {/* Hamburger Menu Button (visible on mobile and tablets) */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] border-2 border-black dark:border-white rounded-md transition-colors duration-200"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Left Sidebar */}
        <div className={`w-full md:w-1/5 bg-[#F0F0F0] dark:bg-[#2A2A2A] border-r-2 border-black dark:border-white flex flex-col fixed h-full z-40 transition-all duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="h-40 bg-[#FFA6F6] dark:bg-[#8B008B] relative transition-colors duration-300">
            <Image src="/banner.gif" alt="Banner" layout="fill" objectFit="cover" />
            <div className="absolute bottom-0 left-4 transform translate-y-1/4">
              <div className="relative">
                <Image src="/profile.gif" alt="Profile" width={96} height={96} className="rounded-full border-4 border-white dark:border-[#2A2A2A] shadow-lg transition-colors duration-300" />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white dark:border-[#2A2A2A] rounded-full transition-colors duration-300"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start mt-16 p-4">
            <h2 className="text-2xl font-bold">Gabriel Oliveira</h2>
            <p className="text-gray-600 dark:text-gray-400 italic mt-2 transition-colors duration-300">xpe/script/ssh</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300">Online</p>
            <div className="flex mt-4 space-x-2">
              <button className="p-2 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] border-2 border-black dark:border-white rounded-md transition-colors duration-200">
                <MessageCircle size={16} />
              </button>
              <button className="p-2 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] border-2 border-black dark:border-white rounded-md transition-colors duration-200">
                <Settings size={16} />
              </button>
              <button className="p-2 bg-[#A6FAFF] dark:bg-[#FF00FF] hover:bg-[#79F7FF] dark:hover:bg-[#CC00CC] active:bg-[#00E1EF] dark:active:bg-[#990099] border-2 border-black dark:border-white rounded-md transition-colors duration-200">
                <Edit size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full md:w-4/5 md:ml-[20%] transition-all duration-300 ease-in-out">
          {/* Initial Section */}
          <div ref={homeRef} className="min-h-screen flex flex-col p-4 md:p-8 snap-start">
            <div className="flex-grow flex flex-col justify-center max-w-3xl mx-auto w-full">
              {/* Chat Section */}
              <div className="bg-white dark:bg-[#2A2A2A] border-2 border-black dark:border-white rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-4 md:p-6 mb-8 transition-colors duration-300">
                <ChatBox />
              </div>

              {/* FAQ Section */}
              <div>
                <h3 className="text-2xl font-bold mb-4">Perguntas Frequentes</h3>
                {faqData.map((faq, index) => (
                  <div key={index} className="mb-4">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full text-left p-4 bg-[#B8FF9F] dark:bg-[#008000] hover:bg-[#9dfc7c] dark:hover:bg-[#06400] border-2 border-black dark:border-white rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex justify-between items-center transition-colors duration-200"
                    >
                      <span>{faq.question}</span>
                      {expandedFaq === index ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {expandedFaq === index && (
                      <div className="p-4 border-2 border-t-0 border-black dark:border-white bg-white dark:bg-[#2A2A2A] rounded-b-md transition-colors duration-300">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div ref={skillsRef} className="py-12 bg-[#F0F0F0] dark:bg-[#2A2A2A] p-4 md:p-8 snap-start transition-colors duration-300">
            <h3 className="text-2xl font-bold mb-6 text-center">Minhas Habilidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {Object.entries(skillsData).map(([category, skills]) => (
                <div key={category} className="bg-white dark:bg-[#3A3A3A] border-2 border-black dark:border-white rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-4">
                  <h4 className="text-xl font-bold mb-4 capitalize">{category}</h4>
                  <ul className="list-disc pl-5">
                    {skills.map((skill, index) => (
                      <li key={index} className="mb-2">{skill}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Projects Section */}
          <div ref={projectsRef} className="py-12 bg-[#F0F0F0] dark:bg-[#2A2A2A] p-4 md:p-8 snap-start transition-colors duration-300">
            <h3 className="text-2xl font-bold mb-6 text-center">Meus Projetos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {projectsData.map((project, index) => (
                <div key={index} className="bg-white dark:bg-[#3A3A3A] border-2 border-black dark:border-white rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all duration-300">
                  <Image src={project.image} alt={project.title} width={400} height={200} className="w-full h-40 object-cover rounded-t-lg" />
                  <div className="p-4">
                    <h4 className="text-xl font-bold mb-2">{project.title}</h4>
                    <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">{project.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Passions Section */}
          <div ref={passionsRef} className="py-12 bg-white dark:bg-[#1A1A1A] p-4 md:p-8 snap-start transition-colors duration-300">
            <h3 className="text-2xl font-bold mb-6 text-center">Minhas Paixões</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {passionsData.map((passion, index) => (
                <div key={index} className="relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:scale-105">
                  <Image src={passion.image} alt={passion.title} width={400} height={400} className="w-full h-[300px] md:h-[400px] object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 transition-colors duration-300">
                    <h4 className="text-xl font-bold mb-2">{passion.title}</h4>
                    <p>{passion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Section */}


          {/* Footer */}
          <footer className="bg-[#1A1A1A] dark:bg-black text-white p-4 transition-colors duration-300">
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center">
              <p className="mb-4 md:mb-0">&copy; script!</p>
              <div className="flex space-x-4">
                <a href="https://www.instagram.com/gabrieloliveira75xx/" target="_blank" rel="noopener noreferrer" className="hover:text-[#A6FAFF] dark:hover:text-[#FF00FF] transition-colors duration-200">Instagram</a>
                <a href="https://www.linkedin.com/in/gabrieloliveira75xx/" target="_blank" rel="noopener noreferrer" className="hover:text-[#A6FAFF] dark:hover:text-[#FF00FF] transition-colors duration-200">LinkedIn</a>
                <a href="https://github.com/gabrieloliveira75xx" target="_blank" rel="noopener noreferrer" className="hover:text-[#A6FAFF] dark:hover:text-[#FF00FF] transition-colors duration-200">GitHub</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  )
}