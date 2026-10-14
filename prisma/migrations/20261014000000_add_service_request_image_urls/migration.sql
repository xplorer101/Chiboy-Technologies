-- AlterTable: images moved from local disk to Vercel Blob, so a request stores
-- the URLs of the images that were attached instead of rows in the attachment
-- table. The column is added without a default, matching how Prisma maps a
-- required scalar list; existing rows read back as an empty list.
ALTER TABLE "service_requests" ADD COLUMN "imageUrls" TEXT[];
