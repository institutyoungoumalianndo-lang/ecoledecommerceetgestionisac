-- CreateEnum
CREATE TYPE "GatewayConnectionStatus" AS ENUM ('CONNECTE', 'DECONNECTE', 'INCONNU');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'INTERNE');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('INSCRIPTION_VALIDEE', 'PAIEMENT_SCOLARITE', 'BULLETIN_DISPONIBLE', 'CHANGEMENT_EMPLOI_DU_TEMPS', 'ABSENCE', 'CERTIFICAT_DISPONIBLE', 'ATTESTATION_DISPONIBLE');

-- CreateEnum
CREATE TYPE "CampaignAudienceType" AS ENUM ('INDIVIDUEL', 'CLASSE', 'CLASSES', 'FILIERE', 'FILIERES', 'CAMPUS', 'TOUS_ETUDIANTS', 'TOUS_ENSEIGNANTS', 'TOUS_PARENTS', 'TOUT_PERSONNEL');

-- CreateEnum
CREATE TYPE "CampaignScheduleType" AS ENUM ('IMMEDIAT', 'DIFFERE', 'QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('BROUILLON', 'PLANIFIEE', 'EN_COURS', 'SUSPENDUE', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "CommunicationRecipientType" AS ENUM ('ETUDIANT', 'PARENT', 'ENSEIGNANT', 'PERSONNEL', 'AUTRE');

-- CreateEnum
CREATE TYPE "CommunicationMessageStatus" AS ENUM ('EN_ATTENTE', 'ENVOYE', 'LIVRE', 'LU', 'ECHOUE');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "communication_settings" (
    "id" TEXT NOT NULL,
    "email_signature" TEXT,
    "message_footer" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_gateway_accounts" (
    "id" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "api_identifier" TEXT,
    "api_key" TEXT,
    "sender_id" TEXT,
    "official_phone_number" TEXT,
    "balance" DECIMAL(10,2),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "connection_status" "GatewayConnectionStatus" NOT NULL DEFAULT 'INCONNU',
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_gateway_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_gateway_settings" (
    "id" TEXT NOT NULL,
    "business_phone_number" TEXT,
    "api_identifier" TEXT,
    "access_token" TEXT,
    "connection_status" "GatewayConnectionStatus" NOT NULL DEFAULT 'INCONNU',
    "last_tested_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_gateway_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_gateway_settings" (
    "id" TEXT NOT NULL,
    "official_email" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_username" TEXT,
    "smtp_password" TEXT,
    "use_tls" BOOLEAN NOT NULL DEFAULT true,
    "connection_status" "GatewayConnectionStatus" NOT NULL DEFAULT 'INCONNU',
    "last_tested_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_gateway_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_event_configs" (
    "id" TEXT NOT NULL,
    "event_type" "NotificationEventType" NOT NULL,
    "template_id" TEXT NOT NULL,
    "channels" "CommunicationChannel"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_event_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "template_id" TEXT,
    "custom_content" TEXT,
    "audience_type" "CampaignAudienceType" NOT NULL,
    "audience_filter" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'BROUILLON',
    "schedule_type" "CampaignScheduleType" NOT NULL DEFAULT 'IMMEDIAT',
    "scheduled_for" TIMESTAMP(3),
    "recurrence_end_date" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "recipient_type" "CommunicationRecipientType" NOT NULL,
    "recipient_id" TEXT,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "recipient_email" TEXT,
    "content" TEXT NOT NULL,
    "template_id" TEXT,
    "campaign_id" TEXT,
    "status" "CommunicationMessageStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "error_message" TEXT,
    "sent_by_user_id" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link_type" TEXT,
    "link_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_code_key" ON "message_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "notification_event_configs_event_type_key" ON "notification_event_configs"("event_type");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "communication_messages_channel_idx" ON "communication_messages"("channel");

-- CreateIndex
CREATE INDEX "communication_messages_status_idx" ON "communication_messages"("status");

-- CreateIndex
CREATE INDEX "communication_messages_campaign_id_idx" ON "communication_messages"("campaign_id");

-- CreateIndex
CREATE INDEX "communication_messages_recipient_type_recipient_id_idx" ON "communication_messages"("recipient_type", "recipient_id");

-- CreateIndex
CREATE INDEX "internal_notifications_user_id_is_read_idx" ON "internal_notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "notification_event_configs" ADD CONSTRAINT "notification_event_configs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_notifications" ADD CONSTRAINT "internal_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

