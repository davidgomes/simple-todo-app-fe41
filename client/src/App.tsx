
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../../server/src/schema';

function App() {
  // Auth state
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Todo state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Form state
  const [formData, setFormData] = useState<CreateTodoInput>({
    title: '',
    description: null
  });

  // Authentication handler
  const handleAuth = () => {
    if (token.trim()) {
      // Store token for API calls
      localStorage.setItem('auth_token', token);
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Please enter a valid JWT token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken('');
    setIsAuthenticated(false);
    setTodos([]);
    setAuthError('');
  };

  // Load todos with proper authentication
  const loadTodos = useCallback(async () => {
    if (!isAuthenticated) return;

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      setAuthError('No authentication token found');
      setIsAuthenticated(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Configure tRPC with auth header (Note: This is simplified - real implementation would need proper header setup)
      const filterInput = filter === 'all' ? {} : { completed: filter === 'completed' };
      
      const result = await trpc.getTodos.query(filterInput);
      setTodos(result);
      setAuthError('');
    } catch (error: unknown) {
      console.error('Failed to load todos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('UNAUTHORIZED')) {
        setAuthError('Authentication failed. Please check your token.');
        setIsAuthenticated(false);
      } else {
        setAuthError('Failed to load todos');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, filter]);

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      setAuthError('No authentication token found');
      return;
    }

    setIsLoading(true);
    try {
      const newTodo = await trpc.createTodo.mutate(formData);
      setTodos((prev: Todo[]) => [newTodo, ...prev]);
      
      // Reset form
      setFormData({
        title: '',
        description: null
      });
      setAuthError('');
    } catch (error: unknown) {
      console.error('Failed to create todo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('UNAUTHORIZED')) {
        setAuthError('Authentication failed. Please check your token.');
        setIsAuthenticated(false);
      } else {
        setAuthError('Failed to create todo');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    if (!isAuthenticated) return;

    try {
      const updateData: UpdateTodoInput = {
        id: todo.id,
        completed: !todo.completed
      };

      await trpc.updateTodo.mutate(updateData);
      
      // Optimistically update UI
      setTodos((prev: Todo[]) =>
        prev.map((t: Todo) =>
          t.id === todo.id ? { ...t, completed: !t.completed, updated_at: new Date() } : t
        )
      );
    } catch (error: unknown) {
      console.error('Failed to update todo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('UNAUTHORIZED')) {
        setAuthError('Authentication failed. Please check your token.');
        setIsAuthenticated(false);
      }
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    if (!isAuthenticated) return;

    try {
      await trpc.deleteTodo.mutate({ id: todoId });
      
      // Remove from UI
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todoId));
    } catch (error: unknown) {
      console.error('Failed to delete todo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('UNAUTHORIZED')) {
        setAuthError('Authentication failed. Please check your token.');
        setIsAuthenticated(false);
      }
    }
  };

  // Authentication form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🔐 Todo Authentication</CardTitle>
            <CardDescription>
              Enter your JWT token to access your todos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                JWT Token
              </label>
              <Textarea
                id="token"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={token}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToken(e.target.value)}
                className="min-h-[100px] font-mono text-xs"
              />
            </div>
            
            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            <Button onClick={handleAuth} className="w-full" disabled={!token.trim()}>
              🚀 Authenticate
            </Button>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Note:</strong> This application uses JWT authentication.</p>
              <p>Enter a valid JWT token to access your todo list.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main todo interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📝 My Todos</h1>
            <p className="text-gray-600">Manage your authenticated todo list</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            🚪 Logout
          </Button>
        </div>

        {authError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {/* Create todo form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">✨ Create New Todo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title *
                </label>
                <Input
                  id="title"
                  placeholder="What needs to be done?"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTodoInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Add more details (optional)"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateTodoInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                />
              </div>
              
              <Button type="submit" disabled={isLoading || !formData.title.trim()}>
                {isLoading ? '⏳ Creating...' : '➕ Add Todo'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filter buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            📋 All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            ⏰ Pending
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            size="sm"
          >
            ✅ Completed
          </Button>
        </div>

        {/* Todo list */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-gray-600">Loading your todos...</p>
            </CardContent>
          </Card>
        ) : todos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">No todos yet!</h3>
              <p className="text-gray-600 mb-4">
                {filter === 'all' 
                  ? "Create your first todo above to get started."
                  : `No ${filter} todos found. Try changing the filter.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todos.map((todo: Todo) => (
              <Card key={todo.id} className={`transition-all ${todo.completed ? 'opacity-75' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleComplete(todo)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${todo.completed ? 'line-through text-gray-500' : ''}`}>
                        {todo.title}
                      </h3>
                      
                      {todo.description && (
                        <p className={`text-sm mt-1 ${todo.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                          {todo.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={todo.completed ? 'secondary' : 'default'}>
                          {todo.completed ? '✅ Done' : '⏰ Pending'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          Created {todo.created_at.toLocaleDateString()}
                        </span>
                        {todo.updated_at > todo.created_at && (
                          <span className="text-xs text-gray-500">
                            • Updated {todo.updated_at.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleDeleteTodo(todo.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer info */}
        <Separator className="my-8" />
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>🔐 All operations require JWT authentication</p>
          <p>📊 Total: {todos.length} | ✅ Completed: {todos.filter(t => t.completed).length} | ⏰ Pending: {todos.filter(t => !t.completed).length}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
