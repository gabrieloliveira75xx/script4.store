# Etapa de build: construir a aplicação Next.js
FROM node:18-alpine AS build

# Definir o diretório de trabalho
WORKDIR /app

# Copiar o package.json e o package-lock.json para instalar as dependências
COPY package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o restante dos arquivos do projeto
COPY . .

# Gerar o build para produção
RUN npm run build  # Agora o build já gera os arquivos estáticos na pasta 'out/'

# Etapa de produção: usar Nginx para servir os arquivos estáticos gerados pelo Next.js
FROM nginx:alpine

# Copiar os arquivos estáticos gerados pela etapa de build do Next.js para o diretório de arquivos estáticos do Nginx
COPY --from=build /app/out /usr/share/nginx/html

# Expor a porta 80 (padrão para Nginx)
EXPOSE 80

# Comando para rodar o Nginx em segundo plano
CMD ["nginx", "-g", "daemon off;"]
