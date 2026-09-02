CREATE TABLE `SubscriptionEntitlement` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `stripeCustomerId` VARCHAR(255) NULL,
    `stripeSubscriptionId` VARCHAR(255) NULL,
    `status` VARCHAR(32) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionEntitlement_userId_key`(`userId`),
    UNIQUE INDEX `SubscriptionEntitlement_stripeCustomerId_key`(`stripeCustomerId`),
    UNIQUE INDEX `SubscriptionEntitlement_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StripeWebhookEvent` (
    `id` VARCHAR(255) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SubscriptionEntitlement` ADD CONSTRAINT `SubscriptionEntitlement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
