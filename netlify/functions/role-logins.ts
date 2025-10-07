import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

type EnvConfig = {
  url: string;
  serviceKey: string;
};

const getEnvConfig = (): EnvConfig => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing SUPABASE_URL environment variable for role login proxy.');
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable for role login proxy.');
  }

  return { url, serviceKey };
};

const { url, serviceKey } = getEnvConfig();

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
  },
});

type RoleLoginRow = {
  id: string;
  role_id: string;
  login_at: string;
  roles: {
    id: string;
    name: string;
  } | null;
};

type RoleLoginPayload = {
  roleId?: string;
  loginAt?: string;
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  try {
    if (event.httpMethod === 'POST') {
      const payload = (event.body ? JSON.parse(event.body) : {}) as RoleLoginPayload;
      const { roleId, loginAt } = payload;

      if (!roleId) {
        return jsonResponse(400, { message: 'roleId is required' });
      }

      const timestamp = loginAt ?? new Date().toISOString();
      const { error } = await supabase.from('role_logins').insert({ role_id: roleId, login_at: timestamp });

      if (error) {
        console.error('Failed to insert role login', error);
        return jsonResponse(500, { message: 'Failed to insert role login', details: error.message });
      }

      return jsonResponse(200, { roleId, loginAt: timestamp });
    }

    if (event.httpMethod === 'GET') {
      const startIso = event.queryStringParameters?.startIso;

      if (!startIso) {
        return jsonResponse(400, { message: 'startIso query parameter is required' });
      }

      const { data, error } = await supabase
        .from('role_logins')
        .select('id, role_id, login_at, roles ( id, name )')
        .gte('login_at', startIso)
        .order('login_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch role logins', error);
        return jsonResponse(500, { message: 'Failed to fetch role logins', details: error.message });
      }

      const rows = (data ?? []) as RoleLoginRow[];
      const logins = rows.map(row => ({
        roleId: row.role_id,
        roleName: row.roles?.name ?? 'Rôle inconnu',
        loginAt: row.login_at,
      }));

      return jsonResponse(200, { data: logins });
    }

    return jsonResponse(405, { message: 'Method not allowed' });
  } catch (error) {
    console.error('Unhandled error in role login proxy', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { message: 'Unexpected error', details: message });
  }
};

export { handler };
