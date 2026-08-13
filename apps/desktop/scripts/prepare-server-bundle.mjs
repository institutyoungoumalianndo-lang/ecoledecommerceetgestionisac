import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, "..");
const monorepoRoot = join(desktopRoot, "../..");
const outDir = join(desktopRoot, "resources/campus-server");

function run(command, cwd = monorepoRoot) {
  console.log(`> ${command}`);
  execSync(command, { cwd, stdio: "inherit", shell: true });
}

function copyDir(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  if (process.platform === "win32") {
    try {
      execSync(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS`, { shell: true });
    } catch (error) {
      const code = error.status;
      if (code === undefined || code >= 8) throw error;
    }
  } else {
    execSync(`cp -a "${src}/." "${dest}/"`, { shell: true });
  }
}

function copyPath(src, dest) {
  if (!existsSync(src)) return;
  if (statSync(src).isDirectory()) {
    copyDir(src, dest);
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

function bundleWorkspacePackage(srcDir, destDir, { includePrisma = false } = {}) {
  mkdirSync(destDir, { recursive: true });
  copyPath(join(srcDir, "package.json"), join(destDir, "package.json"));
  copyPath(join(srcDir, "dist"), join(destDir, "dist"));
  if (includePrisma) {
    copyPath(join(srcDir, "prisma"), join(destDir, "prisma"));
  }
}

/**
 * Node ESM exige une extension dans les imports relatifs. Le package shared
 * conserve volontairement des imports sans extension pour Vite/Next en source;
 * on les rend explicites seulement dans la copie distribuée au serveur.
 */
function normalizeBundledEsmImports(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      normalizeBundledEsmImports(path);
      continue;
    }
    if (!entry.isFile() || !path.endsWith(".js")) continue;

    const source = readFileSync(path, "utf-8");
    const normalized = source.replace(
      /(["'])(\.{1,2}\/[^"']+)(["'])/g,
      (_match, openingQuote, specifier, closingQuote) => {
        return /\.[a-z0-9]+$/i.test(specifier)
          ? `${openingQuote}${specifier}${closingQuote}`
          : `${openingQuote}${specifier}.js${closingQuote}`;
      }
    );
    if (normalized !== source) writeFileSync(path, normalized);
  }
}

function bundleApi(apiOut) {
  const apiSrc = join(monorepoRoot, "packages/api");
  mkdirSync(join(apiOut, "pkgs"), { recursive: true });
  copyDir(join(apiSrc, "dist"), join(apiOut, "dist"));
  bundleWorkspacePackage(join(monorepoRoot, "packages/db"), join(apiOut, "pkgs/db"), { includePrisma: true });
  bundleWorkspacePackage(join(monorepoRoot, "packages/shared"), join(apiOut, "pkgs/shared"));
  normalizeBundledEsmImports(join(apiOut, "pkgs/shared", "dist"));

  const apiPkg = JSON.parse(readFileSync(join(apiSrc, "package.json"), "utf-8"));
  const dependencies = { ...apiPkg.dependencies };
  delete dependencies["@isac-erp/db"];
  delete dependencies["@isac-erp/shared"];
  dependencies["@isac-erp/db"] = "file:./pkgs/db";
  dependencies["@isac-erp/shared"] = "file:./pkgs/shared";

  writeFileSync(
    join(apiOut, "package.json"),
    JSON.stringify({ name: "isac-api-bundle", type: "module", private: true, dependencies }, null, 2)
  );

  mkdirSync(join(apiOut, "uploads"), { recursive: true });
  console.log("Installation des dépendances API (npm)…");
  run("npm install --omit=dev --no-audit --no-fund", apiOut);
  console.log("Génération du client Prisma…");
  run(
    `npx prisma generate --schema "${join(apiOut, "pkgs/db/prisma/schema.prisma")}"`,
    apiOut
  );
}

function bundlePortal(portalOut) {
  const portalSrc = join(monorepoRoot, "apps/web-portail");
  copyDir(join(portalSrc, ".next"), join(portalOut, ".next"));
  if (existsSync(join(portalSrc, "public"))) {
    copyDir(join(portalSrc, "public"), join(portalOut, "public"));
  }

  writeFileSync(
    join(portalOut, "package.json"),
    JSON.stringify(
      {
        name: "isac-portal-bundle",
        private: true,
        type: "module",
        dependencies: {
          next: "^15.1.0",
          react: "^18.3.0",
          "react-dom": "^18.3.0",
        },
      },
      null,
      2
    )
  );

  console.log("Installation des dépendances portail (npm)…");
  run("npm install --omit=dev --no-audit --no-fund", portalOut);
}

console.log("Construction des packages partagés…");
run("pnpm --filter @isac-erp/shared build");
run("pnpm --filter @isac-erp/db build");

console.log("Construction de l'API…");
run("pnpm --filter @isac-erp/api build");

console.log("Construction du portail web…");
run("pnpm --filter @isac-erp/web-portail build");

console.log("Préparation du bundle campus-server…");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

bundleApi(join(outDir, "api"));
bundlePortal(join(outDir, "portal"));

writeFileSync(
  join(outDir, "server.env.example"),
  readFileSync(join(monorepoRoot, "infra/windows/server.env.example"), "utf-8")
);

console.log(`Bundle campus-server prêt : ${outDir}`);
