-- CreateTable
CREATE TABLE "LadderCheckPhoto" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ladderCheckId" INTEGER NOT NULL,

    CONSTRAINT "LadderCheckPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LadderCheckPhoto" ADD CONSTRAINT "LadderCheckPhoto_ladderCheckId_fkey" FOREIGN KEY ("ladderCheckId") REFERENCES "LadderCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
