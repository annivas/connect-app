import { useAuthStore } from '../useAuthStore';

// Access the mock auth object from test setup
const mockAuth = (global as Record<string, unknown>).__mockSupabaseAuth as {
  getSession: jest.Mock;
  signInWithPassword: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  resetPasswordForEmail: jest.Mock;
  onAuthStateChange: jest.Mock;
};

// Reset store and mocks before each test
beforeEach(() => {
  useAuthStore.setState({
    session: null,
    isLoading: false,
    isInitialized: false,
  });
  jest.clearAllMocks();
});

describe('useAuthStore', () => {
  describe('initialize', () => {
    it('should set isInitialized to true with mock session in mock mode', async () => {
      // config.useMocks is true in test setup, so initialize creates a fake session
      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.session).not.toBeNull();
      expect(state.session?.user?.id).toBe('mock-user');
    });
  });

  describe('signIn', () => {
    it('should call supabase signInWithPassword', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      });

      const result = await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.error).toBeUndefined();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should return error message on auth failure', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      const result = await useAuthStore.getState().signIn('test@example.com', 'wrong');

      expect(result.error).toBe('Invalid login credentials');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle unexpected errors', async () => {
      mockAuth.signInWithPassword.mockRejectedValueOnce(new Error('Network error'));

      const result = await useAuthStore.getState().signIn('test@example.com', 'password');

      expect(result.error).toBe('An unexpected error occurred');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('signUp', () => {
    it('should call supabase signUp with user metadata', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { user: { id: 'new-user' } } },
        error: null,
      });

      const result = await useAuthStore
        .getState()
        .signUp('test@example.com', 'password123', 'John Doe', 'johndoe');

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { name: 'John Doe', username: 'johndoe' },
        },
      });
      expect(result.error).toBeUndefined();
    });

    it('should return error on signup failure', async () => {
      mockAuth.signUp.mockResolvedValueOnce({
        data: {},
        error: { message: 'User already registered' },
      });

      const result = await useAuthStore
        .getState()
        .signUp('existing@example.com', 'password', 'Jane', 'jane');

      expect(result.error).toBe('User already registered');
    });
  });

  describe('signOut', () => {
    it('should clear session', async () => {
      // Set an initial session
      useAuthStore.setState({
        session: { user: { id: 'user-1' } } as any,
      });

      await useAuthStore.getState().signOut();

      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should call supabase resetPasswordForEmail', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await useAuthStore.getState().resetPassword('test@example.com');

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: { message: 'Email not found' },
      });

      const result = await useAuthStore.getState().resetPassword('unknown@example.com');

      expect(result.error).toBe('Email not found');
    });
  });
});
