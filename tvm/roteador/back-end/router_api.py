from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import time
from datetime import datetime, timedelta
import urllib.parse

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicializa o FastAPI sem root_path (vamos usar o middleware para isso)
app = FastAPI()

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:7001",
        "http://192.168.100.253:7001",
        "https://script4.store",
        "https://script4.store/tvm-roteador",
        "http://0.0.0.0:7001",
        "http://0.0.0.0/tvm-roteador",
        "*"  # Temporariamente permitindo todas as origens para debug
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações
GENIEACS_URL = "http://192.168.100.251:7557"
ROUTER_ID = "202BC1-BM632w-000000"


MAX_RETRIES = 2
RETRY_DELAY = 5  # segundos
TASK_TIMEOUT = 5  # segundos
PING_TIMEOUT = 1 # segundos específico para ping
PING_CHECK_INTERVAL = 1  # segundos entre verificações de ping

# Models
class WifiConfig(BaseModel):
    ssid: str
    password: str

class ConnectedDevice(BaseModel):
    id: str
    name: str
    isBlocked: bool

class DeviceManageRequest(BaseModel):
    deviceId: str
    action: str

# Funções de Utilidade
def get_mongo_client():
    return MongoClient(MONGO_URI)

def get_device_from_mongo() -> Optional[Dict[str, Any]]:
    try:
        # Usa a API do GenieACS para buscar o dispositivo
        query = {"_id": ROUTER_ID}
        encoded_query = urllib.parse.quote(json.dumps(query))
        response = requests.get(f"{GENIEACS_URL}/devices/?query={encoded_query}")
        
        if response.status_code != 200:
            logger.error(f"Erro ao buscar dispositivo: {response.text}")
            return None
            
        devices = response.json()
        return devices[0] if devices else None
    except Exception as e:
        logger.error(f"Erro ao acessar GenieACS: {str(e)}")
        return None

def is_device_online() -> bool:
    try:
        device = get_device_from_mongo()
        if not device:
            return False
        
        last_inform_time = device.get("_lastInform")
        if not last_inform_time:
            return False
        
        # Converte a string de data para datetime
        try:
            if isinstance(last_inform_time, str):
                # Usa o formato ISO 8601
                last_inform = datetime.fromisoformat(last_inform_time.replace('Z', '+00:00'))
            else:
                last_inform = last_inform_time
                
            # Verifica se o último inform foi nos últimos 5 minutos
            return datetime.now(last_inform.tzinfo) - last_inform < timedelta(minutes=5)
        except (ValueError, TypeError) as e:
            logger.error(f"Erro ao processar data do último inform: {str(e)}")
            return False
            
    except Exception as e:
        logger.error(f"Erro ao verificar status do dispositivo: {str(e)}")
        return False

def wait_for_task_completion(task_id: str) -> bool:
    """Aguarda a conclusão de uma task com melhor tratamento"""
    logger.info(f"Aguardando conclusão da task {task_id}")
    start_time = time.time()
    attempts = 0
    not_found_attempts = 0
    max_not_found_attempts = 5  # Número máximo de tentativas quando a task não é encontrada
    
    while time.time() - start_time < TASK_TIMEOUT:
        try:
            # Aguarda um pouco antes de verificar o status
            time.sleep(2)  # Aumentado para 2 segundos
            
            # Busca a task no GenieACS usando query
            query = {"_id": task_id}
            encoded_query = urllib.parse.quote(json.dumps(query))
            
            response = requests.get(
                f"{GENIEACS_URL}/tasks/?query={encoded_query}",
                headers={"Accept": "application/json"},
                timeout=5  # Aumentado para 5 segundos
            )
            
            if response.status_code != 200:
                logger.error(f"Erro ao verificar task: {response.status_code} - {response.text}")
                attempts += 1
                if attempts >= 3:  # Máximo de 3 tentativas de erro de comunicação
                    return False
                continue
            
            tasks = response.json()
            if not tasks:
                logger.warning(f"Task {task_id} não encontrada")
                not_found_attempts += 1
                if not_found_attempts >= max_not_found_attempts:
                    # Se a task não foi encontrada após várias tentativas, consideramos como sucesso
                    # já que o GenieACS às vezes limpa as tasks completadas muito rapidamente
                    logger.info(f"Task {task_id} não encontrada após {max_not_found_attempts} tentativas, assumindo sucesso")
                    return True
                continue
            
            task = tasks[0]  # Pega a primeira task encontrada
            logger.debug(f"Status da task: {json.dumps(task, indent=2)}")
            
            if task.get("status") == "completed":
                logger.info(f"Task {task_id} completada com sucesso")
                return True
            
            if task.get("status") == "failed":
                error_detail = task.get("fault", {}).get("detail", "Sem detalhes")
                logger.error(f"Task {task_id} falhou: {error_detail}")
                return False
            
            # Ainda em execução, continua o loop
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout ao verificar status da task {task_id}")
            attempts += 1
            if attempts >= 3:
                return False
            continue
            
        except Exception as e:
            logger.error(f"Erro ao verificar status da task {task_id}: {str(e)}")
            attempts += 1
            if attempts >= 3:
                return False
            time.sleep(1)
            
    logger.error(f"Timeout aguardando conclusão da task {task_id}")
    return False

def request_parameter_values(parameter_names: List[str]) -> Optional[str]:
    """Solicita valores de parâmetros ao dispositivo"""
    if not is_device_online():
        raise HTTPException(status_code=503, detail="Dispositivo offline")
    
    for attempt in range(MAX_RETRIES):
        try:
            # Cria uma task para buscar os parâmetros
            task_data = {
                "name": "getParameterValues",
                "parameterNames": parameter_names
            }
            
            response = requests.post(
                f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
                json=task_data
            )
            
            if response.status_code not in [200, 202]:
                logger.error(f"Erro ao criar task (tentativa {attempt + 1}): {response.text}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                raise HTTPException(status_code=500, detail="Falha ao solicitar parâmetros do dispositivo")
            
            task = response.json()
            task_id = task.get("_id")
            
            if not task_id:
                logger.error("Task ID não encontrado na resposta")
                continue
                
            if wait_for_task_completion(task_id):
                return task_id
                
            logger.error(f"Task não completou (tentativa {attempt + 1})")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
                
        except Exception as e:
            logger.error(f"Erro ao solicitar parâmetros (tentativa {attempt + 1}): {str(e)}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
                continue
            raise HTTPException(status_code=500, detail=str(e))
    
    raise HTTPException(status_code=500, detail="Falha ao obter parâmetros após várias tentativas")

# Rotas da API
@app.get("/tvm-roteador/api/wifi-config")
async def get_wifi_config():
    logger.info("Recebida requisição para obter configuração Wi-Fi")
    try:
        logger.info(f"Buscando configuração do Wi-Fi do roteador {ROUTER_ID}")
        
        device = get_device_from_mongo()
        if not device:
            logger.error("Roteador não encontrado")
            raise HTTPException(status_code=404, detail="Roteador não encontrado")
        
        # Acessa os parâmetros do Wi-Fi na estrutura correta do JSON
        wifi_config = device.get("InternetGatewayDevice", {}).get("LANDevice", {}).get("1", {}).get("WLANConfiguration", {}).get("1", {})
        logger.info(f"Configuração Wi-Fi encontrada: {json.dumps(wifi_config, indent=2)}")
        
        ssid = wifi_config.get("SSID", {}).get("_value", "")
        password = wifi_config.get("PreSharedKey", {}).get("1", {}).get("PreSharedKey", {}).get("_value", "")
        
        logger.info(f"SSID encontrado: {ssid}")
        logger.info(f"Senha encontrada: {'*' * len(password) if password else 'Não encontrada'}")
        
        response_data = {
            "ssid": ssid,
            "password": password
        }
        logger.info(f"Dados retornados: {json.dumps(response_data, indent=2)}")
        
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar configuração do Wi-Fi: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tvm-roteador/api/configure-wifi")
async def configure_wifi(config: WifiConfig):
    logger.info("Recebida requisição para configurar Wi-Fi")
    try:
        logger.info(f"Atualizando configuração do Wi-Fi para SSID: {config.ssid}")
        logger.info(f"Dados recebidos: {json.dumps(config.model_dump(), indent=2)}")
        
        if not is_device_online():
            logger.error("Dispositivo offline")
            raise HTTPException(status_code=503, detail="Dispositivo offline")
        
        # Validações básicas
        if not config.ssid or len(config.ssid) < 1:
            raise HTTPException(status_code=400, detail="SSID não pode estar vazio")
        if len(config.ssid) > 32:
            raise HTTPException(status_code=400, detail="SSID não pode ter mais que 32 caracteres")
        if len(config.password) < 8 and len(config.password) != 0:
            raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 8 caracteres")
        if len(config.password) > 63:
            raise HTTPException(status_code=400, detail="Senha não pode ter mais que 63 caracteres")
            
        # Configura os parâmetros no formato correto do TR-069 (array triplo)
        parameter_values = [
            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", config.ssid, "xsd:string"],
            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey", config.password, "xsd:string"]
        ]
        
        # Adiciona configurações de segurança apenas se houver senha
        if config.password:
            parameter_values.extend([
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType", "WPAbeacon", "xsd:string"],
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WPAAuthenticationMode", "PSKAuthentication", "xsd:string"],
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.WPAEncryptionModes", "AESEncryption", "xsd:string"],
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BasicAuthenticationMode", "None", "xsd:string"]
            ])
        else:
            # Se não houver senha, configura como rede aberta
            parameter_values.extend([
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BeaconType", "Basic", "xsd:string"],
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.BasicAuthenticationMode", "None", "xsd:string"]
            ])
        
        # Sempre habilita o Wi-Fi
        parameter_values.append(
            ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable", "1", "xsd:boolean"]
        )
        
        # Cria a task
        task_data = {
            "name": "setParameterValues",
            "parameterValues": parameter_values
        }
        
        logger.info(f"Enviando configuração: {json.dumps(task_data, indent=2)}")
        
        # Envia a requisição para o GenieACS com retry
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.post(
                    f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
                    json=task_data,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                if response.status_code not in [200, 202]:
                    logger.error(f"Erro na tentativa {attempt + 1}: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise HTTPException(
                        status_code=500,
                        detail=f"Falha ao atualizar configuração do Wi-Fi: {response.text}"
                    )
                
                task = response.json()
                task_id = task.get("_id")
                if not task_id:
                    raise HTTPException(
                        status_code=500,
                        detail="ID da task não encontrado na resposta"
                    )
                
                logger.info(f"Task de configuração Wi-Fi criada com ID: {task_id}")
                
                # Aguarda a conclusão da task
                if not wait_for_task_completion(task_id):
                    if attempt < MAX_RETRIES - 1:
                        logger.warning(f"Tentativa {attempt + 1} falhou, tentando novamente...")
                        time.sleep(RETRY_DELAY)
                        continue
                    return {
                        "message": "Configuração do Wi-Fi atualizada, mas não foi possível confirmar a atualização",
                        "ssid": config.ssid,
                        "status": "partial"
                    }
                
                logger.info("Configuração do Wi-Fi atualizada com sucesso")
                return {
                    "message": "Configuração do Wi-Fi atualizada com sucesso",
                    "ssid": config.ssid,
                    "status": "success"
                }
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Erro de conexão na tentativa {attempt + 1}: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro de conexão: {str(e)}"
                )
        
        raise HTTPException(
            status_code=500,
            detail="Todas as tentativas de atualização falharam"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar configuração do Wi-Fi: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tvm-roteador/api/connected-devices")
async def get_connected_devices():
    logger.info("Recebida requisição para listar dispositivos conectados")
    try:
        logger.info(f"Buscando dispositivos conectados ao roteador {ROUTER_ID}")
        
        device = get_device_from_mongo()
        if not device:
            logger.error("Roteador não encontrado")
            raise HTTPException(status_code=404, detail="Roteador não encontrado")
        
        # Verifica se o dispositivo está online
        if not is_device_online():
            logger.warning("Roteador está offline")
            raise HTTPException(status_code=503, detail="Roteador está offline")
        
        # Acessa os hosts na estrutura correta do JSON
        hosts = device.get("InternetGatewayDevice", {}).get("LANDevice", {}).get("1", {}).get("Hosts", {}).get("Host", {})
        logger.info(f"Hosts encontrados: {json.dumps(hosts, indent=2)}")
        
        connected_devices = []
        
        # Verifica se hosts é um dicionário
        if not isinstance(hosts, dict):
            logger.error(f"Formato inválido de hosts: {type(hosts)}")
            return []
            
        for host_id, host_data in hosts.items():
            if not isinstance(host_data, dict):
                continue
                
            # Extrai os valores necessários
            mac_address = host_data.get("MACAddress", {}).get("_value", "")
            hostname = host_data.get("HostName", {}).get("_value", "")
            ip_address = host_data.get("IPAddress", {}).get("_value", "")
            
            # Verifica se temos pelo menos o MAC address
            if not mac_address:
                continue
                
            # Considera o dispositivo como ativo se tiver IP e MAC
            if ip_address and mac_address:
                device_info = {
                    "id": mac_address,
                    "name": hostname or "Dispositivo Desconhecido",
                    "isBlocked": False,  # Por enquanto, todos começam como não bloqueados
                    "ipAddress": ip_address  # Adicionando IP address para mais informações
                }
                logger.info(f"Adicionando dispositivo: {json.dumps(device_info, indent=2)}")
                connected_devices.append(device_info)
        
        logger.info(f"Total de dispositivos ativos encontrados: {len(connected_devices)}")
        logger.info(f"Lista completa de dispositivos: {json.dumps(connected_devices, indent=2)}")
        
        return connected_devices
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar dispositivos conectados: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar dispositivos conectados: {str(e)}"
        )

@app.post("/tvm-roteador/api/manage-device")
async def manage_device(request: DeviceManageRequest):
    logger.info("Recebida requisição para gerenciar dispositivo")
    try:
        logger.info(f"Gerenciando dispositivo {request.deviceId}: {request.action}")
        
        if not is_device_online():
            raise HTTPException(status_code=503, detail="Dispositivo offline")
            
        # Valida a ação
        if request.action not in ["block", "unblock"]:
            raise HTTPException(
                status_code=400,
                detail="Ação inválida. Use 'block' ou 'unblock'"
            )
            
        # Primeiro, configura a política de filtro
        policy_task = {
            "name": "setParameterValues",
            "parameterValues": [
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_HUAWEI_WlanMacFilterpolicy", 
                 "deny" if request.action == "block" else "allow", 
                 "xsd:string"]
            ]
        }
        
        logger.info(f"Configurando política de filtro MAC para {request.action}...")
        response = requests.post(
            f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
            json=policy_task,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code not in [200, 202]:
            logger.error(f"Erro ao configurar política de filtro MAC: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500,
                detail="Falha ao configurar política de filtro MAC"
            )
            
        # Aguarda a conclusão da primeira task
        task = response.json()
        task_id = task.get("_id")
        if not task_id:
            raise HTTPException(
                status_code=500,
                detail="ID da task não encontrado na resposta"
            )
            
        logger.info(f"Aguardando conclusão da task de configuração da política (ID: {task_id})...")
        if not wait_for_task_completion(task_id):
            raise HTTPException(
                status_code=500,
                detail="Falha ao configurar política de filtro MAC"
            )
            
        # Agora, configura o MAC address
        mac_task = {
            "name": "setParameterValues",
            "parameterValues": [
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_HUAWEI_WlanMacFilterMac", 
                 request.deviceId,
                 "xsd:string"]
            ]
        }
        
        logger.info(f"Configurando MAC address para filtro: {request.deviceId}")
        response = requests.post(
            f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
            json=mac_task,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code not in [200, 202]:
            logger.error(f"Erro ao configurar MAC address: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500,
                detail="Falha ao configurar MAC address para filtro"
            )
            
        # Aguarda a conclusão da segunda task
        task = response.json()
        task_id = task.get("_id")
        if not task_id:
            raise HTTPException(
                status_code=500,
                detail="ID da task não encontrado na resposta"
            )
            
        logger.info(f"Aguardando conclusão da task de configuração do MAC (ID: {task_id})...")
        if not wait_for_task_completion(task_id):
            raise HTTPException(
                status_code=500,
                detail="Falha ao configurar MAC address para filtro"
            )
            
        # Por fim, habilita o filtro MAC
        enable_filter_task = {
            "name": "setParameterValues",
            "parameterValues": [
                ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.MACAddressControlEnabled", "1", "xsd:boolean"]
            ]
        }
        
        logger.info("Habilitando filtro MAC...")
        response = requests.post(
            f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
            json=enable_filter_task,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code not in [200, 202]:
            logger.error(f"Erro ao habilitar filtro MAC: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500,
                detail="Falha ao habilitar filtro MAC"
            )
            
        # Aguarda a conclusão da terceira task
        task = response.json()
        task_id = task.get("_id")
        if not task_id:
            raise HTTPException(
                status_code=500,
                detail="ID da task não encontrado na resposta"
            )
            
        logger.info(f"Aguardando conclusão da task de habilitação do filtro (ID: {task_id})...")
        if not wait_for_task_completion(task_id):
            raise HTTPException(
                status_code=500,
                detail="Falha ao habilitar filtro MAC"
            )
            
        logger.info(f"Dispositivo {request.deviceId} {request.action}eado com sucesso")
        return {
            "message": f"Dispositivo {request.action}eado com sucesso",
            "status": "success",
            "deviceId": request.deviceId,
            "action": request.action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerenciar dispositivo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tvm-roteador/api/latency")
async def get_latency():
    logger.info("Recebida requisição para medir latência")
    try:
        logger.info(f"Iniciando teste de latência para o roteador {ROUTER_ID}")
        
        # Verifica se o dispositivo está online
        if not is_device_online():
            logger.warning("Roteador está offline")
            raise HTTPException(status_code=503, detail="Roteador está offline")

        # Primeiro, limpa qualquer diagnóstico anterior
        clear_task = {
            "name": "setParameterValues",
            "parameterValues": [
                ["InternetGatewayDevice.IPPingDiagnostics.DiagnosticsState", "None", "xsd:string"]
            ]
        }
        
        try:
            response = requests.post(
                f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
                json=clear_task,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            if response.status_code in [200, 202]:
                logger.info("Estado de diagnóstico anterior limpo")
                time.sleep(1)
        except Exception as e:
            logger.warning(f"Erro ao limpar diagnóstico anterior: {str(e)}")

        # Configura os parâmetros do teste de ping
        task_data = {
            "name": "setParameterValues",
            "parameterValues": [
                ["InternetGatewayDevice.IPPingDiagnostics.Host", "8.8.8.8", "xsd:string"],
                ["InternetGatewayDevice.IPPingDiagnostics.NumberOfRepetitions", "3", "xsd:unsignedInt"],
                ["InternetGatewayDevice.IPPingDiagnostics.Timeout", "2000", "xsd:unsignedInt"],
                ["InternetGatewayDevice.IPPingDiagnostics.DataBlockSize", "32", "xsd:unsignedInt"],
                ["InternetGatewayDevice.IPPingDiagnostics.DiagnosticsState", "Requested", "xsd:string"]
            ]
        }

        logger.info(f"Enviando configuração de ping: {json.dumps(task_data, indent=2)}")

        # Envia a requisição para iniciar o diagnóstico
        response = requests.post(
            f"{GENIEACS_URL}/devices/{ROUTER_ID}/tasks?connection_request",
            json=task_data,
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if response.status_code not in [200, 202]:
            logger.error(f"Erro ao iniciar teste de ping: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500, 
                detail=f"Falha ao iniciar teste de ping: {response.text}"
            )

        # Aguarda um pouco antes de começar a verificar os resultados
        time.sleep(2)

        # Monitora os resultados do ping
        start_time = time.time()
        while time.time() - start_time < PING_TIMEOUT:
            try:
                query = {"_id": ROUTER_ID}
                projection = {
                    "InternetGatewayDevice.IPPingDiagnostics": 1
                }
                
                encoded_query = urllib.parse.quote(json.dumps(query))
                encoded_projection = urllib.parse.quote(json.dumps(projection))
                
                response = requests.get(
                    f"{GENIEACS_URL}/devices?query={encoded_query}&projection={encoded_projection}",
                    timeout=5
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=500,
                        detail="Erro ao buscar resultados do ping"
                    )

                device = response.json()[0]
                ping_results = device.get("InternetGatewayDevice", {}).get("IPPingDiagnostics", {})
                
                # Verifica o estado do diagnóstico
                diagnostics_state = ping_results.get("DiagnosticsState", {}).get("_value", "")
                
                if diagnostics_state == "Complete":
                    # Extrai os resultados
                    success_count = int(ping_results.get("SuccessCount", {}).get("_value", 0) or 0)
                    failure_count = int(ping_results.get("FailureCount", {}).get("_value", 0) or 0)
                    
                    # Calcula as estatísticas apenas se houver pings bem-sucedidos
                    if success_count > 0:
                        avg_time = float(ping_results.get("AverageResponseTime", {}).get("_value", 0) or 0)
                        min_time = float(ping_results.get("MinimumResponseTime", {}).get("_value", 0) or 0)
                        max_time = float(ping_results.get("MaximumResponseTime", {}).get("_value", 0) or 0)
                    else:
                        avg_time = min_time = max_time = 0

                    logger.info(f"Teste de ping concluído com sucesso. Resultados: {json.dumps(ping_results, indent=2)}")

                    return {
                        "average": avg_time,
                        "minimum": min_time,
                        "maximum": max_time,
                        "success": success_count,
                        "failure": failure_count,
                        "total": success_count + failure_count
                    }
                elif diagnostics_state == "Error":
                    raise HTTPException(
                        status_code=500,
                        detail="Erro ao executar teste de ping no dispositivo"
                    )
                
                # Se ainda não completou, aguarda um pouco antes da próxima verificação
                time.sleep(PING_CHECK_INTERVAL)

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Erro ao verificar resultados do ping: {str(e)}")
                time.sleep(PING_CHECK_INTERVAL)

        # Se chegou aqui, é timeout
        raise HTTPException(
            status_code=504,
            detail="Timeout aguardando resultados do ping"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao executar teste de latência: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Iniciando servidor API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
