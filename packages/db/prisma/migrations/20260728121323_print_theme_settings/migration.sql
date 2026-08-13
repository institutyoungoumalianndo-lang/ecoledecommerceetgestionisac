-- CreateTable
CREATE TABLE "print_theme_settings" (
    "id" TEXT NOT NULL,
    "preset_label" TEXT NOT NULL DEFAULT 'Noir administratif',
    "border_color" TEXT NOT NULL DEFAULT '#000000',
    "separator_color" TEXT NOT NULL DEFAULT '#000000',
    "title_color" TEXT NOT NULL DEFAULT '#000000',
    "header_color" TEXT NOT NULL DEFAULT '#000000',
    "table_color" TEXT NOT NULL DEFAULT '#000000',
    "primary_text_color" TEXT NOT NULL DEFAULT '#000000',
    "secondary_text_color" TEXT NOT NULL DEFAULT '#4B5563',
    "box_color" TEXT NOT NULL DEFAULT '#000000',
    "total_color" TEXT NOT NULL DEFAULT '#000000',
    "net_amount_color" TEXT NOT NULL DEFAULT '#000000',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_theme_settings_pkey" PRIMARY KEY ("id")
);

