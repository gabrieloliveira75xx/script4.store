# TVM Router Management

Sistema de gerenciamento de roteador BM632w integrado com GenieACS.

## Requisitos

- Python 3.8+
- Node.js 16+
- GenieACS instalado e configurado
- Roteador BM632w conectado ao GenieACS

## Configuração

### Backend (API)

1. Navegue até o diretório da API:
```bash
cd apps/tvm/api
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Inicie a API:
```bash
python router_api.py
```

A API estará disponível em `http://localhost:8000`

### Frontend

1. Navegue até o diretório do frontend:
```bash
cd apps/tvm
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## Funcionalidades

- Visualização do status do roteador
- Configuração de Wi-Fi (SSID e senha)
- Gerenciamento de dispositivos conectados
- Monitoramento da qualidade da internet
- Suporte técnico

## Integração com GenieACS

O sistema se integra com o GenieACS para gerenciar o roteador BM632w. O roteador está localizado em:
```
/#!/devices/202BC1-BM632w-000000
```

## Segurança

- Todas as comunicações são feitas via HTTPS
- Autenticação requerida para acesso ao painel
- Senhas são armazenadas de forma segura
- Acesso restrito apenas a usuários autorizados

## Suporte

Para suporte técnico, entre em contato:
- Telefone: (19) 99782-4032
- Email: suporte@tvm.com.br 