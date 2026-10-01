/**
 * Supabase In-Memory Mock Client for testing and harness verification
 * Simulates table operations, basic filtering, auth, and storage.
 */

export interface MockRecord {
  [key: string]: any;
}

export class MockQueryBuilder {
  private tableName: string;
  private store: Map<string, MockRecord[]>;
  private filters: Array<(row: MockRecord) => boolean> = [];
  private orderCol?: string;
  private ascending = true;
  private limitCount?: number;
  private isSingle = false;
  private pendingInsert?: MockRecord | MockRecord[];
  private pendingUpdate?: Partial<MockRecord>;
  private isDelete = false;

  constructor(tableName: string, store: Map<string, MockRecord[]>) {
    this.tableName = tableName;
    this.store = store;
  }

  private getRows(): MockRecord[] {
    if (!this.store.has(this.tableName)) {
      this.store.set(this.tableName, []);
    }
    return this.store.get(this.tableName)!;
  }

  select(_columns = "*"): this {
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}): this {
    this.orderCol = column;
    this.ascending = ascending;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  insert(data: MockRecord | MockRecord[]): this {
    this.pendingInsert = data;
    return this;
  }

  update(data: Partial<MockRecord>): this {
    this.pendingUpdate = data;
    return this;
  }

  delete(): this {
    this.isDelete = true;
    return this;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const result = this.execute();
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private execute(): { data: any; error: any; count?: number } {
    let rows = this.getRows();

    // Handle INSERT
    if (this.pendingInsert) {
      const items = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert];
      const inserted = items.map((item) => ({
        id: item.id || `mock-id-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        ...item,
      }));
      rows.push(...inserted);
      return { data: this.isSingle ? inserted[0] : inserted, error: null };
    }

    // Handle UPDATE
    if (this.pendingUpdate) {
      const updatedRows: MockRecord[] = [];
      for (let i = 0; i < rows.length; i++) {
        const matches = this.filters.every((f) => f(rows[i]));
        if (matches) {
          rows[i] = { ...rows[i], ...this.pendingUpdate, updated_at: new Date().toISOString() };
          updatedRows.push(rows[i]);
        }
      }
      return { data: this.isSingle ? updatedRows[0] || null : updatedRows, error: null };
    }

    // Handle DELETE
    if (this.isDelete) {
      const deletedRows: MockRecord[] = [];
      const remaining: MockRecord[] = [];
      for (const row of rows) {
        if (this.filters.every((f) => f(row))) {
          deletedRows.push(row);
        } else {
          remaining.push(row);
        }
      }
      this.store.set(this.tableName, remaining);
      return { data: deletedRows, error: null };
    }

    // Handle SELECT
    let filtered = rows.filter((row) => this.filters.every((f) => f(row)));

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.ascending;
      filtered.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      filtered = filtered.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return {
        data: filtered[0] || null,
        error: filtered.length === 0 ? { message: "Row not found", code: "PGRST116" } : null,
      };
    }

    return { data: filtered, error: null, count: filtered.length };
  }
}

export class MockStorageBucket {
  private files = new Map<string, { data: any; metadata: any }>();

  async upload(filePath: string, fileData: any, options: any = {}) {
    this.files.set(filePath, {
      data: fileData,
      metadata: {
        size: options?.size || 1024,
        mimetype: options?.contentType || "image/jpeg",
      },
    });
    return { data: { path: filePath }, error: null };
  }

  async list(folder = "", _options = {}) {
    const list: Array<{ name: string; id: string | null; metadata?: any }> = [];
    for (const [key, value] of this.files.entries()) {
      if (folder && !key.startsWith(folder)) continue;
      const subPath = folder ? key.slice(folder.length).replace(/^\//, "") : key;
      list.push({
        name: subPath,
        id: subPath,
        metadata: value.metadata,
      });
    }
    return { data: list, error: null };
  }

  getPublicUrl(path: string) {
    return {
      data: {
        publicUrl: `https://mock-supabase.local/storage/v1/object/public/summit-photos/${path}`,
      },
    };
  }

  async remove(paths: string[]) {
    for (const p of paths) {
      this.files.delete(p);
    }
    return { data: paths, error: null };
  }
}

export class MockSupabaseClient {
  private store = new Map<string, MockRecord[]>();
  private storageBuckets = new Map<string, MockStorageBucket>();

  public auth = {
    getUser: async () => ({
      data: {
        user: {
          id: "mock-user-uuid-001",
          email: "test@example.com",
          user_metadata: { username: "tester" },
        },
      },
      error: null,
    }),
    getSession: async () => ({
      data: {
        session: {
          access_token: "mock-token",
          user: { id: "mock-user-uuid-001", email: "test@example.com" },
        },
      },
      error: null,
    }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { user: { id: "mock-user-uuid-001" }, session: {} },
      error: null,
    }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  public storage = {
    from: (bucketId: string) => {
      if (!this.storageBuckets.has(bucketId)) {
        this.storageBuckets.set(bucketId, new MockStorageBucket());
      }
      return this.storageBuckets.get(bucketId)!;
    },
  };

  from(tableName: string): MockQueryBuilder {
    return new MockQueryBuilder(tableName, this.store);
  }

  // Helper for test fixtures
  seedTable(tableName: string, data: MockRecord[]): void {
    this.store.set(tableName, [...data]);
  }

  getTableData(tableName: string): MockRecord[] {
    return this.store.get(tableName) || [];
  }

  clear(): void {
    this.store.clear();
    this.storageBuckets.clear();
  }
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return new MockSupabaseClient();
}
