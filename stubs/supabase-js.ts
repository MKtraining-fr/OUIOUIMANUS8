const errorMessage = 'Supabase client is not available in this offline build. Install @supabase/supabase-js in production.';

const createThenableBuilder = () => {
  const rejection = Promise.reject(new Error(errorMessage));
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return rejection[prop as keyof Promise<never>].bind(rejection);
        }

        return () => createThenableBuilder();
      },
    },
  );
};

export const createClient = () => {
  const builder = createThenableBuilder();
  const rejectAsync = async () => {
    throw new Error(errorMessage);
  };

  return {
    from() {
      return builder;
    },
    functions: {
      invoke: rejectAsync,
    },
    auth: {
      signInWithPassword: rejectAsync,
      signOut: rejectAsync,
      getSession: rejectAsync,
    },
  } as const;
};

export default { createClient };
