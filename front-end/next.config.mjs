/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignorar erros de compilação do TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignorar erros do ESLint durante a build
    ignoreDuringBuilds: true,
  },
  basePath: '', // <- Aqui define que o app vai rodar na raiz `/`
};

export default nextConfig;
