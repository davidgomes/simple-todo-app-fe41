
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  registerInputSchema, 
  loginInputSchema, 
  createTodoInputSchema, 
  updateTodoInputSchema, 
  deleteTodoInputSchema,
  getTodosInputSchema
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createTodo } from './handlers/create_todo';
import { getTodos } from './handlers/get_todos';
import { updateTodo } from './handlers/update_todo';
import { deleteTodo } from './handlers/delete_todo';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Auth routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  // Todo routes
  createTodo: publicProcedure
    .input(createTodoInputSchema)
    .mutation(({ input }) => createTodo(input)),
  
  getTodos: publicProcedure
    .input(getTodosInputSchema)
    .query(({ input }) => getTodos(input)),
  
  updateTodo: publicProcedure
    .input(updateTodoInputSchema)
    .mutation(({ input }) => updateTodo(input)),
  
  deleteTodo: publicProcedure
    .input(deleteTodoInputSchema)
    .mutation(({ input }) => deleteTodo(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
