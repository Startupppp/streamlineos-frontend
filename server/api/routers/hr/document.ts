import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  documents,
  assets,
  employeeDevices,
} from "../../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "../../../../lib/date-utils";
import { TRPCError } from "@trpc/server";
import {
  createDocumentInputSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  createDeviceInputSchema,
  updateDeviceInputSchema,
} from "../../../../lib/validations/hr";

export const documentRouter = createTRPCRouter({
  getDocuments: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), type: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(documents.orgId, ctx.session.orgId),
        eq(documents.isActive, true),
      ];
      if (input.userId) {
        conditions.push(eq(documents.userId, input.userId));
      }
      if (input.type) {
        conditions.push(eq(documents.type, input.type as any));
      }
      return await ctx.db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.createdAt)],
      });
    }),

  createDocument: protectedProcedure
    .input(createDocumentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
      const targetUserId = (input.userId && isAdmin) ? input.userId : ctx.session.userId;

      const [document] = await ctx.db
        .insert(documents)
        .values({
          orgId: ctx.session.orgId,
          userId: targetUserId,
          name: input.name,
          type: input.type,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.session.userId,
          isActive: true,
        })
        .returning();
      return document;
    }),

  getAssets: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.assets.findMany({
      where: eq(assets.orgId, ctx.session.orgId),
      orderBy: [desc(assets.createdAt)],
    });
  }),

  createAsset: protectedProcedure
    .input(createAssetInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [asset] = await ctx.db
        .insert(assets)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          type: input.type,
          serialNumber: input.serialNumber,
          assignedTo: input.assignedTo,
          purchaseDate: input.purchaseDate
            ? formatDateOnly(input.purchaseDate)
            : undefined,
          purchaseCost: input.purchaseCost?.toString(),
          location: input.location,
          notes: input.notes,
          status: input.assignedTo ? "ASSIGNED" : "AVAILABLE",
        })
        .returning();
      return asset;
    }),

  updateAsset: protectedProcedure
    .input(updateAssetInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { assetId, ...updateData } = input;
      await ctx.db
        .update(assets)
        .set({
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.type && { type: updateData.type }),
          ...(updateData.serialNumber !== undefined && {
            serialNumber: updateData.serialNumber,
          }),
          ...(updateData.assignedTo !== undefined && {
            assignedTo: updateData.assignedTo,
            status: updateData.assignedTo ? "ASSIGNED" : "AVAILABLE",
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.location !== undefined && {
            location: updateData.location,
          }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(assets.id, assetId), eq(assets.orgId, ctx.session.orgId))
        );
    }),

  getDevices: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const conditions = [eq(employeeDevices.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(employeeDevices.userId, input.userId));
      }

      return await ctx.db.query.employeeDevices.findMany({
        where: and(...conditions),
        with: {
          user: true,
        },
        orderBy: [desc(employeeDevices.createdAt)],
      });
    }),

  createDevice: protectedProcedure
    .input(createDeviceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const [device] = await ctx.db.insert(employeeDevices).values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        serialNumber: input.serialNumber,
        brand: input.brand,
        model: input.model,
        assignedDate: input.assignedDate ? formatDateOnly(input.assignedDate) : undefined,
        notes: input.notes,
        status: "ACTIVE",
      }).returning();

      return device;
    }),

  updateDevice: protectedProcedure
    .input(updateDeviceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const { deviceId, ...updateData } = input;
      await ctx.db.update(employeeDevices)
        .set({
          ...(updateData.deviceType && { deviceType: updateData.deviceType }),
          ...(updateData.deviceName && { deviceName: updateData.deviceName }),
          ...(updateData.serialNumber !== undefined && { serialNumber: updateData.serialNumber }),
          ...(updateData.brand !== undefined && { brand: updateData.brand }),
          ...(updateData.model !== undefined && { model: updateData.model }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.returnDate && { returnDate: formatDateOnly(updateData.returnDate) }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          updatedAt: new Date(),
        })
        .where(and(
          eq(employeeDevices.id, deviceId),
          eq(employeeDevices.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  deleteDevice: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.delete(employeeDevices)
        .where(and(
          eq(employeeDevices.id, input.deviceId),
          eq(employeeDevices.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),
});
