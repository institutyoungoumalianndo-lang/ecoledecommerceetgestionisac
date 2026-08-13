/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify publie un portail statique : la sortie contient alors un vrai
  // index.html au lieu du dossier de runtime interne .next.
  output: "export",
  // Le contrôle ESLint reste exécuté séparément. Ne pas empêcher la génération
  // du portail distribuable à cause des avertissements historiques du portail.
  // Les vérifications strictes sont exécutées dans la CI; elles ne doivent pas
  // bloquer l'artefact Windows tant que la migration tRPC en cours expose des
  // types incomplets au portail.
  transpilePackages: ["@isac-erp/shared", "@isac-erp/ui"],
  // packages/shared et packages/ui utilisent des imports relatifs en ".js" (convention ESM/NodeNext,
  // résolus par TypeScript/Vite vers les ".ts" réels) — webpack a besoin de cet alias explicite pour
  // faire de même, sinon la résolution échoue sur les fichiers source non compilés du monorepo.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
