# Etapa de build: construir a aplicação Next.js
FROM node:18-alpine AS build

# Definir o diretório de trabalho
WORKDIR /app

# Copiar o package.json e o package-lock.json para instalar as dependências
COPY package*.json ./

# Instalar as dependências com --legacy-peer-deps
RUN npm install --legacy-peer-deps

# Copiar o restante dos arquivos do projeto
COPY . .

# Limpar cache e gerar o build para produção
RUN rm -rf .next && \
    npm run build

# Etapa de produção: rodar a aplicação Next.js
FROM node:18-alpine

# Definir o diretório de trabalho
WORKDIR /app

# Copiar o package.json e o package-lock.json
COPY package*.json ./

# Instalar apenas as dependências de produção com --legacy-peer-deps
RUN npm install --production --legacy-peer-deps

# Copiar os arquivos de build da etapa anterior
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=7001

# Expor a porta 7001
EXPOSE 7001

# Comando para iniciar a aplicação
CMD ["npm", "start"] 