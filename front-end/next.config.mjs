/** @type {import('next').NextConfig} */
const nextConfig = {
     // output: 'export', // Habilita a exportação estática

  typescript: {
    // Ignorar erros de compilação do TypeScript
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignorar erros do ESLint durante a build
    ignoreDuringBuilds: true,
  },
  basePath: '', // Aqui define que o app vai rodar na raiz `/`

  // Você pode adicionar outras opções se necessário, como manipulação de imagens ou redirecionamentos.
};

export default nextConfig;
