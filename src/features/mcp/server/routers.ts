import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { createTRPCRouter, organizationProcedure } from "@/trpc/init";
import { createMCPClient } from "@ai-sdk/mcp";
import { TRPCError } from "@trpc/server";
import z from "zod";

const urlSchema = z.string().url("Invalid URL").min(1, "URL is required");

export const mcpRouter = createTRPCRouter({
  /**
   * Connect to an MCP server (no persist). Returns list of tools for selection.
   */
  connect: organizationProcedure
    .input(
      z.object({
        url: urlSchema,
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { url, apiKey } = input;
      const mcpClient = await createMCPClient({
        transport: {
          type: "http",
          url,
          headers:
            apiKey != null && apiKey !== ""
              ? { Authorization: `Bearer ${apiKey}` }
              : undefined,
        },
      });
      try {
        const toolSet = await mcpClient.tools();
        const tools = Object.entries(toolSet).map(([name, tool]) => ({
          name,
          description: tool.description ?? "",
        }));
        return { tools };
      } finally {
        await mcpClient.close();
      }
    }),

  /**
   * Add or update an MCP server for the organization.
   */
  addServer: organizationProcedure
    .input(
      z.object({
        url: urlSchema,
        label: z.string().min(1, "Label is required"),
        apiKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { url, label, apiKey } = input;
      const encryptedToken =
        apiKey != null && apiKey !== "" ? encrypt(apiKey) : null;

      const existing = await prisma.mcpServer.findFirst({
        where: {
          organizationId: ctx.organizationId,
          url,
        },
      });

      if (existing) {
        const updated = await prisma.mcpServer.update({
          where: { id: existing.id },
          data: { label, token: encryptedToken },
        });
        return { serverId: updated.id };
      }

      const created = await prisma.mcpServer.create({
        data: {
          organizationId: ctx.organizationId,
          label,
          url,
          token: encryptedToken,
        },
      });
      return { serverId: created.id };
    }),

  /**
   * List MCP servers for the organization (no token exposed).
   */
  getServers: organizationProcedure.query(({ ctx }) => {
    return prisma.mcpServer.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, label: true, url: true },
      orderBy: { updatedAt: "desc" },
    });
  }),

  /**
   * Get tools for a given MCP server (by serverId). Used by UI to show selected server's tools.
   */
  getToolsByServerId: organizationProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ ctx, input }) => {
      const server = await prisma.mcpServer.findFirst({
        where: {
          id: input.serverId,
          organizationId: ctx.organizationId,
        },
      });
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "MCP server not found",
        });
      }
      const apiKey =
        server.token != null && server.token !== ""
          ? decrypt(server.token)
          : undefined;
      const mcpClient = await createMCPClient({
        transport: {
          type: "http",
          url: server.url,
          headers:
            apiKey != null
              ? { Authorization: `Bearer ${apiKey}` }
              : undefined,
        },
      });
      try {
        const toolSet = await mcpClient.tools();
        return {
          tools: Object.entries(toolSet).map(([name, tool]) => ({
            name,
            description: tool.description ?? "",
          })),
        };
      } finally {
        await mcpClient.close();
      }
    }),
});
