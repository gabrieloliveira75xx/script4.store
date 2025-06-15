"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Eye, EyeOff, Wifi, Smartphone, Activity, HelpCircle, LogOut, Menu, Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider } from "@/components/ui/tooltip"

interface WifiConfig {
  ssid: string
  password: string
}

interface ConnectedDevice {
  id: string
  name: string
  isBlocked: boolean
}

interface LatencyInfo {
  average: number
  minimum: number
  maximum: number
  success: number
  failure: number
}

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'script4.store' 
  ? 'https://script4.store/tvm-roteador/api'
  : 'http://192.168.100.253:8000/tvm-roteador/api';

export function RouterManagementComponent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [wifiConfig, setWifiConfig] = useState<WifiConfig>({ ssid: "", password: "" })
  const [showWifiPassword, setShowWifiPassword] = useState(false)
  const [activeSection, setActiveSection] = useState("status")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [forceUpdate, setForceUpdate] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [debugMode, setDebugMode] = useState(false)
  const [latencyInfo, setLatencyInfo] = useState<LatencyInfo | null>(null)
  const [isLoadingLatency, setIsLoadingLatency] = useState(false)

  const triggerRerender = useCallback(() => {
    setForceUpdate((prev) => prev + 1)
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      setIsLoading(true)

      // Fetch both WiFi config and connected devices in parallel
      Promise.all([
        fetchWifiConfig().catch((err) => {
          console.error("Error fetching WiFi config:", err)
          return null // Return null to continue with the other promise
        }),
        fetchConnectedDevices().catch((err) => {
          console.error("Error fetching connected devices:", err)
          return [] // Return empty array to continue
        }),
      ])
        .then(() => setIsLoading(false))
        .catch((err) => {
          console.error("Error in initial data fetch:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch data")
          setIsLoading(false)
        })
    }
  }, [isLoggedIn, forceUpdate])

  const fetchWifiConfig = async () => {
    try {
      console.log("Buscando configuração do Wi-Fi...")
      
      const response = await fetch(`${API_BASE_URL}/wifi-config`)
      console.log("Resposta recebida (get-wifi-config):", {
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        throw new Error(`Falha ao buscar configuração do Wi-Fi: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.text()
      console.log("Dados recebidos (raw):", responseData)

      let data
      try {
        data = JSON.parse(responseData)
        console.log("Configuração do Wi-Fi recebida:", data)
      } catch (parseError) {
        console.error("Erro ao fazer parse da configuração:", parseError)
        throw new Error("Erro ao processar dados do servidor")
      }

      setWifiConfig(data)
      setLastUpdate(new Date().toLocaleTimeString())
      return data
    } catch (err) {
      console.error("Erro ao buscar configuração do Wi-Fi:", err)
      setError(err instanceof Error ? err.message : "Erro ao buscar configuração do Wi-Fi")
      throw err
    }
  }

  const updateWifiConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validações do frontend
    if (!wifiConfig.ssid || wifiConfig.ssid.trim().length === 0) {
      setError("O nome da rede (SSID) não pode estar vazio")
      setIsLoading(false)
      return
    }

    if (wifiConfig.ssid.length > 32) {
      setError("O nome da rede (SSID) não pode ter mais que 32 caracteres")
      setIsLoading(false)
      return
    }

    // Se houver senha, deve ter pelo menos 8 caracteres
    if (wifiConfig.password && wifiConfig.password.length > 0 && wifiConfig.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres")
      setIsLoading(false)
      return
    }

    if (wifiConfig.password && wifiConfig.password.length > 63) {
      setError("A senha não pode ter mais que 63 caracteres")
      setIsLoading(false)
      return
    }

    console.log("Iniciando atualização do Wi-Fi:", {
      ssid: wifiConfig.ssid,
      passwordLength: wifiConfig.password ? wifiConfig.password.length : 0
    })

    try {
      console.log("Enviando requisição para:", `${API_BASE_URL}/configure-wifi`)
      
      const response = await fetch(`${API_BASE_URL}/configure-wifi`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(wifiConfig),
      })

      console.log("Resposta recebida:", {
        status: response.status,
        statusText: response.statusText
      })

      const responseData = await response.text()
      console.log("Dados da resposta (raw):", responseData)

      let data
      try {
        data = JSON.parse(responseData)
        console.log("Dados da resposta (parsed):", data)
      } catch (parseError) {
        console.error("Erro ao fazer parse da resposta:", parseError)
        throw new Error(`Erro ao processar resposta do servidor: ${responseData}`)
      }

      if (!response.ok) {
        throw new Error(data.detail || "Falha ao atualizar configuração do Wi-Fi")
      }

      // Se chegou aqui, a atualização foi realizada
      console.log("Resposta do servidor:", data)

      if (data.status === "partial") {
        // Atualização parcial - mostra aviso mas não erro
        alert("A configuração foi enviada, mas não foi possível confirmar a atualização. O roteador pode levar alguns segundos para aplicar as mudanças.")
      } else {
        alert(data.message || "Configuração do Wi-Fi atualizada com sucesso")
      }

      // Atualiza o estado local com os novos valores
      setWifiConfig(prev => ({
        ...prev,
        ssid: data.ssid || prev.ssid
      }))

      // Força uma atualização dos dados após um pequeno delay
      setTimeout(async () => {
        try {
          await fetchWifiConfig()
        } catch (err) {
          console.warn("Erro ao atualizar dados após configuração:", err)
        }
      }, 2000)
      
    } catch (err) {
      console.error("Erro detalhado ao atualizar Wi-Fi:", err)
      const errorMessage = err instanceof Error ? err.message : "Erro ao atualizar configuração do Wi-Fi"
      setError(errorMessage)
      alert(`Erro: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchConnectedDevices = async () => {
    try {
      console.log("Fetching connected devices...")

      // Make the API request
      const response = await fetch(`${API_BASE_URL}/connected-devices`)

      // Check if the response is ok
      if (!response.ok) {
        throw new Error(`Failed to fetch connected devices: ${response.status} ${response.statusText}`)
      }

      // Get the raw text first for debugging
      const rawText = await response.text()
      console.log("Raw response:", rawText)

      // Try to parse the JSON
      let data: ConnectedDevice[]
      try {
        // If the response is empty, use an empty array
        if (!rawText.trim()) {
          console.warn("Empty response received from API")
          data = []
        } else {
          data = JSON.parse(rawText)
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Raw text:", rawText)
        throw new Error(
          `Failed to parse device data: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        )
      }

      console.log("Connected devices received:", data)

      // Validate the data structure
      if (!Array.isArray(data)) {
        console.error("Expected array but received:", typeof data, data)
        throw new Error(`Invalid data format: not an array. Received: ${typeof data}`)
      }

      // Process and validate each device
      const validatedDevices = data.map((device, index) => {
        if (!device || typeof device !== "object") {
          console.warn(`Invalid device at index ${index}:`, device)
          return { id: `unknown-${index}`, name: "Unknown Device", isBlocked: false }
        }

        return {
          id: device.id || `unknown-${index}`,
          name: device.name || "Unknown Device",
          isBlocked: Boolean(device.isBlocked),
        }
      })

      console.log("Validated devices:", validatedDevices)

      // Update state with the validated devices
      setConnectedDevices(validatedDevices)
      setLastUpdate(new Date().toLocaleTimeString())

      return validatedDevices
    } catch (err) {
      console.error("Error fetching connected devices:", err)
      setError(err instanceof Error ? err.message : "Error fetching connected devices")
      // Don't clear existing devices on error
      throw err
    }
  }

  const toggleDeviceBlock = async (deviceId: string, isBlocked: boolean) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Iniciando ${isBlocked ? "desbloqueio" : "bloqueio"} do dispositivo:`, deviceId)

      const response = await fetch(`${API_BASE_URL}/manage-device`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          deviceId, 
          action: isBlocked ? "unblock" : "block" 
        }),
      })

      console.log("Resposta recebida:", {
        status: response.status,
        statusText: response.statusText
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Falha ao gerenciar dispositivo: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Resposta do servidor:", data)

      // Atualiza o estado local apenas se a operação foi bem-sucedida
      if (data.status === "success") {
        setConnectedDevices((devices) =>
          devices.map((device) => 
            device.id === deviceId 
              ? { ...device, isBlocked: !isBlocked } 
              : device
          ),
        )

        alert(data.message || `Dispositivo ${isBlocked ? "desbloqueado" : "bloqueado"} com sucesso.`)
      } else {
        throw new Error("Operação não completada com sucesso")
      }

      // Atualiza a lista após um pequeno delay
      setTimeout(() => {
        fetchConnectedDevices().catch(console.error)
      }, 2000)

    } catch (err) {
      console.error("Erro ao gerenciar dispositivo:", err)
      setError(err instanceof Error ? err.message : "Erro ao gerenciar dispositivo")
      alert(err instanceof Error ? err.message : "Falha ao gerenciar dispositivo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      // Simulate login API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsLoggedIn(true)
      alert("Logado com sucesso.")
    } catch (err) {
      setError("Falha no login. Tente novamente..")
      alert("Falha no login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUsername("")
    setPassword("")
    alert("Logged out successfully.")
  }

  const fetchLatency = async () => {
    try {
      setIsLoadingLatency(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/latency`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Aumenta o timeout para 10 segundos
        signal: AbortSignal.timeout(10000)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Erro ao medir latência: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("Dados de latência recebidos:", data)
      
      // Valida os dados recebidos
      if (!data || typeof data.average !== 'number') {
        throw new Error("Dados de latência inválidos recebidos do servidor")
      }
      
      setLatencyInfo(data)
      setLastUpdate(new Date().toLocaleTimeString())
      setError(null)
    } catch (err) {
      console.error("Erro ao medir latência:", err)
      setLatencyInfo(null)
      setError(err instanceof Error ? err.message : "Erro ao medir latência")
    } finally {
      setIsLoadingLatency(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && (activeSection === "status" || activeSection === "qualidade")) {
      fetchLatency()
      const intervalId = setInterval(fetchLatency, 30000) // Atualiza a cada 30 segundos
      return () => clearInterval(intervalId)
    }
  }, [isLoggedIn, activeSection])

  const renderLatencyInfo = () => {
    if (isLoadingLatency) {
      return (
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-4 w-24" />
          <span className="text-sm text-gray-500">Medindo latência...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="space-y-2">
          <div className="text-red-500 text-sm">{error}</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchLatency()}
          >
            Tentar Novamente
          </Button>
        </div>
      )
    }

    if (!latencyInfo) {
      return (
        <div className="space-y-2">
          <span className="text-gray-500">Dados não disponíveis</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchLatency()}
          >
            Medir Agora
          </Button>
        </div>
      )
    }

    const avgLatency = latencyInfo.average.toFixed(1)
    const successRate = latencyInfo.success / (latencyInfo.success + latencyInfo.failure) * 100

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Média:</span>
          <span className={`font-medium ${
            latencyInfo.average <= 50 ? 'text-green-600' : 
            latencyInfo.average <= 100 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {avgLatency}ms
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Mín/Máx:</span>
          <span className="text-sm text-gray-600">
            {latencyInfo.minimum.toFixed(1)}ms / {latencyInfo.maximum.toFixed(1)}ms
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Taxa de Sucesso:</span>
          <span className={`text-sm ${successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
            {successRate.toFixed(1)}%
          </span>
        </div>
        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => fetchLatency()}
            disabled={isLoadingLatency}
          >
            {isLoadingLatency ? "Medindo..." : "Atualizar"}
          </Button>
        </div>
      </div>
    )
  }

  const Sidebar = ({ className = "", mobile = false }) => (
    <aside className={`w-64 bg-red-700 text-white p-6 ${className}`}>
      <div className="flex items-center mb-8">
        <Wifi className="h-8 w-8 mr-2" />
        <h1 className="text-2xl font-bold">TVM Internet</h1>
      </div>
      <nav>
        <ul className="space-y-2">
          {[
            { icon: Wifi, label: "Status do Roteador", value: "status" },
            { icon: Wifi, label: "Configurações de Wi-Fi", value: "wi-fi" },
            { icon: Smartphone, label: "Dispositivos Conectados", value: "dispositivos" },
            { icon: Activity, label: "Qualidade da Internet", value: "qualidade" },
            { icon: HelpCircle, label: "Suporte", value: "suporte" },
          ].map((item) => (
            <li key={item.value}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${activeSection === item.value ? "bg-red-600" : ""}`}
                onClick={() => {
                  setActiveSection(item.value)
                  if (item.value === "dispositivos") {
                    // Refresh device list when navigating to devices section
                    setIsLoading(true)
                    fetchConnectedDevices()
                      .then(() => setIsLoading(false))
                      .catch(() => setIsLoading(false))
                  }
                  if (mobile) {
                    setIsMobileMenuOpen(false)
                    document
                      .querySelector('[data-state="open"]')
                      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
                  }
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <Button
        variant="ghost"
        className="w-full justify-start text-white mt-4"
        onClick={() => {
          handleLogout()
          if (mobile) {
            setIsMobileMenuOpen(false)
            document
              .querySelector('[data-state="open"]')
              ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
          }
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </aside>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case "status":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Status do Roteador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <span className="mb-2 sm:mb-0">Conectividade:</span>
                  <div className="w-full sm:w-48 h-2 bg-gray-200 rounded-full">
                    <div className="w-3/4 h-full bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <span className="mb-2 sm:mb-0">Desempenho:</span>
                  <div className="w-full sm:w-48 h-2 bg-gray-200 rounded-full">
                    <div className="w-1/2 h-full bg-yellow-500 rounded-full"></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Latência</h3>
                  {renderLatencyInfo()}
                </div>
                <div className="text-sm text-gray-500">
                  Última atualização: {lastUpdate || "Nunca"}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "wi-fi":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Wi-Fi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-1/2" />
                </div>
              ) : (
                <form className="space-y-4" onSubmit={updateWifiConfig}>
                  <div className="space-y-2">
                    <Label htmlFor="wifiName">Nome da rede (SSID)</Label>
                    <Input
                      id="wifiName"
                      value={wifiConfig.ssid}
                      onChange={(e) => setWifiConfig({ ...wifiConfig, ssid: e.target.value })}
                      placeholder="Digite o nome da rede"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="wifiPassword">Senha do Wi-Fi</Label>
                    <Input
                      id="wifiPassword"
                      type={showWifiPassword ? "text" : "password"}
                      value={wifiConfig.password}
                      onChange={(e) => setWifiConfig({ ...wifiConfig, password: e.target.value })}
                      placeholder="Digite a senha da rede"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWifiPassword(!showWifiPassword)}
                      className="absolute right-3 top-8 transform -translate-y-1/2"
                    >
                      {showWifiPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white rounded-full">
                    Salvar Alterações
                  </Button>
                  <div className="text-sm text-gray-500">Última atualização: {lastUpdate || "Nunca"}</div>
                </form>
              )}
            </CardContent>
          </Card>
        )
      case "dispositivos":
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dispositivos Conectados</CardTitle>
              <div className="flex items-center gap-2">
                {debugMode && (
                  <Button size="sm" variant="outline" onClick={() => setDebugMode(false)}>
                    Hide Debug
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsLoading(true)
                    fetchConnectedDevices()
                      .then(() => setIsLoading(false))
                      .catch(() => setIsLoading(false))
                  }}
                >
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Total de dispositivos: {connectedDevices.length}</div>
                    <div className="text-sm text-gray-500">Última atualização: {lastUpdate || "Nunca"}</div>
                    {!debugMode && (
                      <Button
                        size="sm"
                        variant="link"
                        className="p-0 h-auto text-xs text-gray-500"
                        onClick={() => setDebugMode(true)}
                      >
                        Show Debug Info
                      </Button>
                    )}
                  </div>

                  {/* Debug information */}
                  {debugMode && (
                    <div className="mb-4 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      <p className="font-bold">Connected Devices State:</p>
                      <pre>{JSON.stringify(connectedDevices, null, 2)}</pre>
                    </div>
                  )}

                  {connectedDevices.length === 0 ? (
                    <div className="p-6 text-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Nenhum dispositivo conectado encontrado.</p>
                      <Button
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setIsLoading(true)
                          fetchConnectedDevices()
                            .then(() => setIsLoading(false))
                            .catch(() => setIsLoading(false))
                        }}
                      >
                        Tentar Novamente
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {connectedDevices.map((device) => (
                        <li
                          key={device.id}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{device.name || "Dispositivo Desconhecido"}</span>
                            <span className="text-sm text-gray-500">{device.id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={!device.isBlocked}
                              onCheckedChange={() => toggleDeviceBlock(device.id, device.isBlocked)}
                            />
                            <span className="text-sm">{device.isBlocked ? "Bloqueado" : "Permitido"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      case "qualidade":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Qualidade da Internet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <span className="mb-2 sm:mb-0">Download:</span>
                  <div className="w-full sm:w-48 h-2 bg-gray-200 rounded-full">
                    <div className="w-3/4 h-full bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <span className="mb-2 sm:mb-0">Upload:</span>
                  <div className="w-full sm:w-48 h-2 bg-gray-200 rounded-full">
                    <div className="w-1/2 h-full bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Latência</h3>
                  {renderLatencyInfo()}
                </div>
                <Button 
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                  onClick={fetchLatency}
                  disabled={isLoadingLatency}
                >
                  {isLoadingLatency ? "Medindo..." : "Medir Latência"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      case "suporte":
        return (
<Card>
  <CardHeader>
    <CardTitle>Suporte</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <p>Para obter ajuda, entre em contato com nosso suporte:</p>
      <p>Telefone: (19) 99782-4032</p>
      <Button
        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
        onClick={() => window.open('https://wa.me/5519997824032?text=Ol%C3%A1!%20Preciso%20de%20suporte%20t%C3%A9cnico.', '_blank')}
      >
        Abrir Chat de Suporte
      </Button>
    </div>
  </CardContent>
</Card>
        )
      default:
        return null
    }
  }

  // Wrap the entire component with TooltipProvider
  return (
    <TooltipProvider>
      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
          <img src="/logo.jpg" alt="" className="w-48 mb-8" />
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-8 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full">
                  Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row h-screen bg-white">
          {/* Mobile Header with Hamburger Menu */}
          <header className="md:hidden flex items-center justify-between p-4 bg-red-700 text-white">
            <div className="flex items-center">
              <Wifi className="h-6 w-6 mr-2" />
              <h1 className="text-xl font-bold">TVM Internet</h1>
            </div>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-red-600 focus:bg-red-600"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-red-700 border-red-800">
                <Sidebar className="h-full" mobile={true} />
              </SheetContent>
            </Sheet>
          </header>

          {/* Sidebar for desktop */}
          <Sidebar className="hidden md:block" />

          {/* Main content */}
          <main className="flex-1 p-8 overflow-auto">
            <header className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">
                {activeSection === "dispositivos"
                  ? "Dispositivos Conectados"
                  : activeSection === "wi-fi"
                    ? "Configurações de Wi-Fi"
                    : activeSection === "qualidade"
                      ? "Qualidade da Internet"
                      : activeSection === "suporte"
                        ? "Suporte"
                        : "Status do Roteador"}
              </h2>
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback>UN</AvatarFallback>
                </Avatar>
              </div>
            </header>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {renderActiveSection()}
          </main>
        </div>
      )}
    </TooltipProvider>
  )
}
