
import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import type { IncomingMessage, ServerResponse } from 'http';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { 
  createTodoInputSchema, 
  getTodosInputSchema, 
  updateTodoInputSchema, 
  deleteTodoInputSchema,
  type AuthContext 
} from './schema';
import { verifyJwt } from './handlers/verify_jwt';
import { createTodo } from './handlers/create_todo';
import { getTodos } from './handlers/get_todos';
import { updateTodo } from './handlers/update_todo';
import { deleteTodo } from './handlers/delete_todo';

// Create context type
interface Context {
  req: IncomingMessage;
  user?: AuthContext;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Authenticated procedure middleware
const authenticatedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Extract token from headers
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const payload = await verifyJwt(token);
    return next({
      ctx: {
        ...ctx,
        user: { userId: payload.userId }
      }
    });
  } catch (error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
});

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Authenticated todo operations
  createTodo: authenticatedProcedure
    .input(createTodoInputSchema)
    .mutation(({ input, ctx }) => createTodo(input, ctx.user!.userId)),
    
  getTodos: authenticatedProcedure
    .input(getTodosInputSchema)
    .query(({ input, ctx }) => getTodos(input, ctx.user!.userId)),
    
  updateTodo: authenticatedProcedure
    .input(updateTodoInputSchema)
    .mutation(({ input, ctx }) => updateTodo(input, ctx.user!.userId)),
    
  deleteTodo: authenticatedProcedure
    .input(deleteTodoInputSchema)
    .mutation(({ input, ctx }) => deleteTodo(input, ctx.user!.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext({ req }: { req: IncomingMessage; res: ServerResponse }) {
      return { req };
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
