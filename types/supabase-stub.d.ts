declare module '@supabase/supabase-js' {
  export interface SupabaseStubQueryBuilder {
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: never) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2>;
    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<TResult>;
    finally(onfinally?: (() => void) | undefined | null): Promise<never>;
    [key: string]: unknown;
  }

  export interface SupabaseStubClient {
    from(table: string): SupabaseStubQueryBuilder;
    functions: {
      invoke(name: string, params?: Record<string, unknown>): Promise<never>;
    };
    auth: {
      signInWithPassword(credentials: Record<string, unknown>): Promise<never>;
      signOut(): Promise<never>;
      getSession(): Promise<never>;
    };
    [key: string]: unknown;
  }

  export function createClient(...args: unknown[]): SupabaseStubClient;
}
