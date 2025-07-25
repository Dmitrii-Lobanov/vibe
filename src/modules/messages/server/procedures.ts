import { inngest } from '@/inngest/client';
import { prisma } from '@/lib/db';
import { baseProcedure, createTRPCRouter } from '@/trpc/init';
import z from 'zod';
import { TRPCError } from '@trpc/server';

export const messagesRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(z.object({
      id: z.string().min(1, { message: 'ID is required' })
    }))
    .query(async ({ input }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id
        },
      });

      if (!existingProject) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      return existingProject;
    }),

  getMany: baseProcedure
    .input(
        z.object({
          projectId: z.string().min(1, { message: 'Project ID is required' })
        })
      )
    .query(async ({ input }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId
        },
        include: {
          fragment: true,
        },
        orderBy: {
          updatedAt: 'asc'
        },
      });

      return messages;
    }),

  create: baseProcedure
    .input(
      z.object({
        value: z.string()
          .min(1, { message: 'Value is required' })
          .max(10000, { message: 'Value is too long' }),
        projectId: z.string().min(1, { message: 'Project ID is required' })
      })
    )
    .mutation(async ({  input }) => {
      const createdMessage = await prisma.message.create({
        data: {
          projectId: input.projectId,
          content: input.value,
          role: 'USER',
          type: 'RESULT'
        }
      });

      await inngest.send({
        name: 'code-agent/run',
        data: {
          value: input.value,
          projectId: input.projectId
        }
      })

      return createdMessage;
    })
});