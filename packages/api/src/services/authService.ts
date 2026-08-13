import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreateFirstAdminInput,
  ExchangePortalSsoTokenInput,
  LoginInput,
  LoginOutput,
  LoginResult,
  PublicUser,
  RedeemActivationKeyInput,
  VerifyTwoFactorInput,
} from "@isac-erp/shared";
import { SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";
import { hashPassword, validatePasswordAgainstPolicy, verifyPassword } from "../security/password.js";
import { computeFailedLoginUpdate, isAccountLocked } from "../security/lockout.js";
import { createSession, revokeSession } from "../security/session.js";
import { consumePendingChallenge, createPendingChallenge, peekPendingChallenge, registerFailedTwoFactorAttempt } from "../security/twoFactorChallenge.js";
import { mintPortalSsoToken, redeemPortalSsoToken } from "../security/portalSsoToken.js";
import { getSecuritySettings } from "./securitySettingsService.js";
import { verifyTwoFactorCode } from "./twoFactorService.js";
import { logAction } from "./auditService.js";
import { toPublicUser, userWithRoleInclude } from "./userMapper.js";
import { createUser } from "./userService.js";

type UserWithRole = Prisma.UserGetPayload<{ include: typeof userWithRoleInclude }>;

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export async function getBootstrapStatus(): Promise<{ hasAdmin: boolean }> {
  const count = await prisma.user.count({ where: { deletedAt: null } });
  return { hasAdmin: count > 0 };
}

/**
 * Crée le tout premier compte (rôle Super Administrateur), uniquement
 * possible tant qu'aucun utilisateur n'existe. Remplace le script CLI
 * `creer_premier_administrateur.py` de l'ancien projet par un vrai parcours
 * applicatif (voir MODULE-01 §4.5).
 */
export async function createFirstAdmin(
  input: CreateFirstAdminInput,
  meta: RequestMeta
): Promise<PublicUser> {
  const { hasAdmin } = await getBootstrapStatus();
  if (hasAdmin) {
    throw new Error("Un administrateur existe déjà — le bootstrap n'est plus disponible.");
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { code: SUPER_ADMIN_ROLE_CODE },
  });
  if (!superAdminRole) {
    throw new Error("Rôle SUPER_ADMIN introuvable — la base a-t-elle bien été seedée ?");
  }

  const settings = await getSecuritySettings();
  const violations = validatePasswordAgainstPolicy(input.password, settings);
  if (violations.length > 0) {
    throw new Error(violations.join(" "));
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username.toLowerCase(),
      passwordHash,
      roles: { create: { roleId: superAdminRole.id } },
    },
    include: userWithRoleInclude,
  });

  await logAction({
    userId: user.id,
    action: "USER_CREATE",
    module: "IDENTITE",
    entityType: "User",
    entityId: user.id,
    result: "SUCCES",
    details: { bootstrap: true },
    ipAddress: meta.ipAddress,
  });

  return toPublicUser(user);
}

const GENERIC_LOGIN_ERROR = "Identifiants incorrects.";

/** Crée la session et construit la réponse de connexion réussie — factorisé entre `login` (sans 2FA) et `verifyTwoFactor`. */
async function finalizeLogin(user: UserWithRole, settings: { sessionInactivityTimeoutMin: number }, meta: RequestMeta): Promise<LoginOutput> {
  const sessionToken = await createSession({
    userId: user.id,
    inactivityTimeoutMinutes: settings.sessionInactivityTimeoutMin,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await logAction({
    userId: user.id,
    action: "LOGIN_SUCCESS",
    module: "IDENTITE",
    result: "SUCCES",
    ipAddress: meta.ipAddress,
  });

  const roleId = user.roles[0]?.roleId;
  const permissionCodes = roleId
    ? (
        await prisma.rolePermission.findMany({
          where: { roleId },
          include: { permission: { select: { code: true } } },
        })
      ).map((rp) => rp.permission.code)
    : [];

  return { sessionToken, user: toPublicUser(user), permissionCodes };
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<LoginResult> {
  const settings = await getSecuritySettings();
  const username = input.username.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { username },
    include: userWithRoleInclude,
  });

  if (!user || user.deletedAt) {
    await logAction({
      usernameInput: input.username,
      action: "LOGIN_FAILURE",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason: "utilisateur_inconnu" },
      ipAddress: meta.ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  if (!user.isActive) {
    await logAction({
      userId: user.id,
      action: "LOGIN_FAILURE",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason: "compte_inactif" },
      ipAddress: meta.ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  if (isAccountLocked(user.lockedUntil)) {
    await logAction({
      userId: user.id,
      action: "LOGIN_FAILURE",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason: "compte_verrouille" },
      ipAddress: meta.ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    const update = computeFailedLoginUpdate(
      user.failedLoginAttempts,
      settings.maxFailedLoginAttempts,
      settings.accountLockoutMinutes
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: update.failedLoginAttempts,
        lockedUntil: update.didLock ? update.lockedUntil : user.lockedUntil,
      },
    });

    await logAction({
      userId: user.id,
      action: "LOGIN_FAILURE",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason: "mot_de_passe_incorrect", verrouille: update.didLock },
      ipAddress: meta.ipAddress,
    });

    throw new Error(GENERIC_LOGIN_ERROR);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // Double authentification (Module 11 §1.2) : identifiants déjà vérifiés, mais aucune session tant
  // que le code TOTP n'est pas validé via `verifyTwoFactor` — voir security/twoFactorChallenge.ts.
  if (user.totpEnabled) {
    const pendingToken = createPendingChallenge(user.id);
    await logAction({
      userId: user.id,
      action: "LOGIN_TWO_FACTOR_PENDING",
      module: "IDENTITE",
      result: "SUCCES",
      ipAddress: meta.ipAddress,
    });
    return { status: "TWO_FACTOR_REQUIRED", pendingToken };
  }

  const result = await finalizeLogin(user, settings, meta);
  return { status: "OK", ...result };
}

/** Seconde étape de connexion quand la 2FA est active — voir `login`. */
export async function verifyTwoFactor(input: VerifyTwoFactorInput, meta: RequestMeta): Promise<LoginOutput> {
  const userId = peekPendingChallenge(input.pendingToken);
  if (!userId) {
    throw new Error("Session de connexion expirée — veuillez vous reconnecter.");
  }

  const valid = await verifyTwoFactorCode(userId, input.code);
  if (!valid) {
    const exceeded = registerFailedTwoFactorAttempt(input.pendingToken);
    await logAction({
      userId,
      action: "LOGIN_TWO_FACTOR_FAILURE",
      module: "IDENTITE",
      result: "ECHEC",
      ipAddress: meta.ipAddress,
    });
    throw new Error(exceeded ? "Trop de tentatives — veuillez vous reconnecter." : "Code invalide.");
  }

  consumePendingChallenge(input.pendingToken);

  const [settings, user] = await Promise.all([
    getSecuritySettings(),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userWithRoleInclude }),
  ]);

  return finalizeLogin(user, settings, meta);
}

/**
 * Vérifie des identifiants administrateur pour le bouton « Paramètres » de
 * l'écran de connexion (MODULE-01 §1.4.1), SANS créer de session applicative
 * — cette porte donne uniquement accès à un panneau technique minimal
 * (diagnostic de connexion), jamais à l'application ni aux vrais écrans
 * Paramètres métier (Module 2).
 */
export async function verifyAdminCredentials(
  input: LoginInput,
  meta: RequestMeta
): Promise<{ ok: true }> {
  const settings = await getSecuritySettings();
  const username = input.username.toLowerCase();

  const user = await prisma.user.findUnique({ where: { username } });

  const genericFailure = async (reason: string) => {
    await logAction({
      userId: user?.id ?? null,
      usernameInput: user ? undefined : input.username,
      action: "TECHNICAL_SETTINGS_ACCESS",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason },
      ipAddress: meta.ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  };

  if (!user || user.deletedAt || !user.isActive) return genericFailure("identifiants_invalides");
  if (isAccountLocked(user.lockedUntil)) return genericFailure("compte_verrouille");

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    const update = computeFailedLoginUpdate(
      user.failedLoginAttempts,
      settings.maxFailedLoginAttempts,
      settings.accountLockoutMinutes
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: update.failedLoginAttempts,
        lockedUntil: update.didLock ? update.lockedUntil : user.lockedUntil,
      },
    });
    return genericFailure("mot_de_passe_incorrect");
  }

  const userRole = await prisma.userRole.findFirst({ where: { userId: user.id }, include: { role: true } });
  if (userRole?.role.code !== SUPER_ADMIN_ROLE_CODE) {
    await logAction({
      userId: user.id,
      action: "TECHNICAL_SETTINGS_ACCESS",
      module: "IDENTITE",
      result: "ECHEC",
      details: { reason: "role_insuffisant" },
      ipAddress: meta.ipAddress,
    });
    throw new Error("Accès réservé à l'administrateur.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  await logAction({
    userId: user.id,
    action: "TECHNICAL_SETTINGS_ACCESS",
    module: "IDENTITE",
    result: "SUCCES",
    ipAddress: meta.ipAddress,
  });

  return { ok: true };
}

/**
 * Émet le jeton d'ouverture directe du portail (2026-08-10, retour du porteur du projet) — le
 * routeur vérifie déjà que l'appelant est authentifié ; le rôle Super Administrateur est revérifié ici
 * en plus, par défense en profondeur (voir MODULE-15 §1 décision 1).
 */
export async function createPortalSsoToken(userId: string, roleCode: string | undefined): Promise<{ token: string }> {
  if (roleCode !== SUPER_ADMIN_ROLE_CODE) {
    throw new Error("Accès réservé au Super Administrateur.");
  }
  return { token: mintPortalSsoToken(userId) };
}

/**
 * Échange le jeton contre une vraie session `User` (MODULE-15 §1 décision 1) — jamais un
 * `PortalCredential`/`PortalSession`. Jeton à usage unique : un second appel avec le même jeton échoue
 * toujours, que ce soit une réutilisation légitime (page rechargée) ou une tentative de rejeu.
 */
export async function exchangePortalSsoToken(input: ExchangePortalSsoTokenInput, meta: RequestMeta): Promise<LoginOutput> {
  const userId = redeemPortalSsoToken(input.token);
  if (!userId) {
    throw new Error("Lien d'ouverture du portail expiré ou déjà utilisé — relancez depuis l'application desktop.");
  }

  const [settings, user] = await Promise.all([
    getSecuritySettings(),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userWithRoleInclude }),
  ]);

  if (user.deletedAt || !user.isActive || user.roles[0]?.role?.code !== SUPER_ADMIN_ROLE_CODE) {
    throw new Error("Accès réservé au Super Administrateur.");
  }

  return finalizeLogin(user, settings, meta);
}

/**
 * Clé d'activation d'installation (2026-08-10, retour du porteur du projet, ADR-054) — usage unique :
 * une clé valide crée le compte du collaborateur avec le rôle déjà choisi par le Super Administrateur
 * qui l'a générée (`activationKeyService.generateActivationKeys`), puis se consomme définitivement.
 * `createdBy` (Super Administrateur émetteur) sert d'auteur d'attribution du rôle (`assignedBy`),
 * cohérent avec `userService.createUser` appelé partout ailleurs par un utilisateur déjà connecté.
 */
export async function redeemActivationKey(input: RedeemActivationKeyInput, meta: RequestMeta): Promise<LoginOutput> {
  const key = await prisma.activationKey.findUnique({ where: { code: input.code } });
  if (!key || key.status !== "UNUSED") {
    throw new Error("Clé d'activation invalide ou déjà utilisée.");
  }

  const existingUsername = await prisma.user.findUnique({ where: { username: input.username.toLowerCase() } });
  if (existingUsername) {
    throw new Error("Cet identifiant est déjà utilisé.");
  }

  const newUser = await createUser(
    {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      password: input.password,
      roleId: key.roleId,
    },
    key.createdBy
  );

  await prisma.activationKey.update({
    where: { id: key.id },
    data: { status: "USED", usedByUserId: newUser.id, usedAt: new Date() },
  });

  const [settings, user] = await Promise.all([
    getSecuritySettings(),
    prisma.user.findUniqueOrThrow({ where: { id: newUser.id }, include: userWithRoleInclude }),
  ]);

  return finalizeLogin(user, settings, meta);
}

export async function logout(
  sessionToken: string,
  userId: string,
  meta: RequestMeta
): Promise<void> {
  await revokeSession(sessionToken);
  await logAction({
    userId,
    action: "LOGOUT",
    module: "IDENTITE",
    result: "SUCCES",
    ipAddress: meta.ipAddress,
  });
}
