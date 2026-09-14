CREATE UNIQUE INDEX "LoyaltyTransaction_userId_reason_reference_key"
ON "LoyaltyTransaction"("userId", "reason", "reference");
