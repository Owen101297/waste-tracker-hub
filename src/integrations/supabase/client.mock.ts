import type { Database } from "./types";
import type { Session, User, AuthError } from "@supabase/supabase-js";

const mockDelay = () =>
  new Promise((resolve) =>
    setTimeout(resolve, Number(import.meta.env.VITE_MOCK_AUTH_DELAY) || 0)
  );

const mockUser: User = {
  id: import.meta.env.VITE_MOCK_USER_ID || "test-user-123",
  email: import.meta.env.VITE_MOCK_USER_EMAIL || "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
} as Session;

const mockInstitution = {
  id: import.meta.env.VITE_MOCK_INSTITUTION_ID || "inst-123",
  name: "Institución de Prueba EcoResiduos",
  address: "Calle Falsa 123, Ciudad, País",
  phone: "+1234567890",
  responsible_person: "Juan Pérez",
  user_id: mockUser.id,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockUserRole = {
  id: "role-1",
  user_id: mockUser.id,
  role: (import.meta.env.VITE_MOCK_USER_ROLE as "admin" | "client") || "client",
};

const mockWasteRecords: Record<
  string,
  Database["public"]["Tables"]["waste_records"]["Row"]
> = {};

const generateMockRecords = (
  institutionId: string,
  year: number,
  month: number
) => {
  const result: Database["public"]["Tables"]["waste_records"]["Row"][] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= Math.min(3, daysInMonth); day++) {
    const key = `${institutionId}-${year}-${month}-${day}`;
    if (!mockWasteRecords[key]) {
      mockWasteRecords[key] = {
        id: `record-${day}`,
        institution_id: institutionId,
        year,
        month,
        day,
        aprovechables: day * 1.5,
        aprovechables_organicos: day * 0.8,
        no_aprovechables: day * 2.1,
        biosanitarios: day * 0.3,
        anatomopatologicos: day * 0.2,
        cortopunzantes: day * 0.1,
        farmacos: day * 0.05,
        de_animales: day * 0.02,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    result.push(mockWasteRecords[key]);
  }
  return result;
};

class MockQueryBuilder<T = any> {
  private tableName: string;
  private filters: Array<{
    field: string;
    value: any;
    operator: "eq" | "gte" | "lte";
  }> = [];
  private selectFields: string = "*";
  private orderField?: string;
  private orderDir: "asc" | "desc" = "asc";

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = "*") {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value, operator: "eq" });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, value, operator: "gte" });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, value, operator: "lte" });
    return this;
  }

  order(field: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderField = field;
    this.orderDir = ascending ? "asc" : "desc";
    return this;
  }

  async maybeSingle() {
    await mockDelay();

    if (this.tableName === "institutions") {
      const institutionIdFilter = this.filters.find(
        (f) => f.field === "user_id"
      );
      if (
        import.meta.env.VITE_MOCK_NO_INSTITUTION === "true" ||
        (institutionIdFilter && institutionIdFilter.value !== mockUser.id)
      ) {
        return { data: null, error: null };
      }
      return { data: mockInstitution, error: null };
    }

    if (this.tableName === "user_roles") {
      const userIdFilter = this.filters.find((f) => f.field === "user_id");
      if (userIdFilter && userIdFilter.value === mockUser.id) {
        return { data: mockUserRole, error: null };
      }
      return { data: null, error: null };
    }

    if (this.tableName === "waste_records") {
      const institutionId = this.filters.find((f) => f.field === "institution_id")?.value;
      const year = this.filters.find((f) => f.field === "year")?.value;
      const month = this.filters.find((f) => f.field === "month")?.value;

      if (institutionId && year && month) {
        const data = generateMockRecords(institutionId, year, month);
        return { data, error: null };
      }
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  async then(transform: (value: { data: any; error: null }) => any) {
    const result = await this.maybeSingle();
    return transform(result);
  }
}

class MockUpsertBuilder {
  private tableName: string;
  private data: any;
  private conflictFields?: string[];

  constructor(tableName: string, data: any) {
    this.tableName = tableName;
    this.data = data;
  }

  onConflict(fields: string) {
    this.conflictFields = fields.split(",");
    return this;
  }

  async then(transform: (value: { error: null }) => any) {
    await mockDelay();

    if (this.tableName === "waste_records") {
      const key = `${this.data.institution_id}-${this.data.year}-${this.data.month}-${this.data.day}`;
      mockWasteRecords[key] = {
        ...mockWasteRecords[key],
        ...this.data,
        id: mockWasteRecords[key]?.id || `record-${this.data.day}`,
        created_at: mockWasteRecords[key]?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    if (this.tableName === "institutions") {
      Object.assign(mockInstitution, this.data);
    }

    return transform({ error: null });
  }
}

class MockTableBuilder {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select() {
    return new MockQueryBuilder(this.tableName);
  }

  update(data: any) {
    const tableName = this.tableName;
    const builder = new MockQueryBuilder(this.tableName);
    return {
      ...builder,
      updateData: data,
      eq: (field: string, value: any) => {
        return {
          async then(transform: (value: { error: null }) => any) {
            await mockDelay();
            if (tableName === "institutions" && field === "id") {
              Object.assign(mockInstitution, data);
            }
            return transform({ error: null });
          },
        };
      },
    };
  }

  insert(data: any) {
    const tableName = this.tableName;
    return {
      async then(transform: (value: { data: any; error: null }) => any) {
        await mockDelay();
        if (tableName === "institutions") {
          const newInstitution = {
            ...data,
            id: data.id || "new-inst-" + Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return transform({ data: newInstitution, error: null });
        }
        return transform({ data: null, error: null });
      },
    };
  }

  upsert(data: any, options?: { onConflict?: string }) {
    return new MockUpsertBuilder(this.tableName, data);
  }
}

const mockAuth = {
  signInWithPassword: async (credentials: { email: string; password: string }) => {
    await mockDelay();
    if (credentials.email === "error@test.com") {
      return {
        error: { name: "AuthError", message: "Invalid login credentials" } as AuthError,
        data: { session: null },
      };
    }
    return { error: null, data: { session: mockSession } };
  },

  signOut: async () => {
    await mockDelay();
    return { error: null };
  },

  getSession: async () => {
    await mockDelay();
    return { data: { session: mockSession }, error: null };
  },

  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void
  ) => {
    callback("SIGNED_IN", mockSession);
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};

export const mockSupabase = {
  auth: mockAuth,
  from: (tableName: string) => new MockTableBuilder(tableName),
  realtime: { channel: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) },
  storage: {
    from: () => ({ upload: async () => ({ data: {}, error: null }), getPublicUrl: () => "" }),
  },
};

export type MockSupabase = typeof mockSupabase;