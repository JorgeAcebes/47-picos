import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabaseClient, MockSupabaseClient } from "@/tests/mocks/supabase-mock";

describe("Supabase In-Memory Mock Client Integration", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  it("should handle inserts and selects on tables", async () => {
    const insertRes = await mockSupabase.from("ascents").insert({
      user_id: "user-123",
      summit_id: "gorbea",
      achieved_on: "2026-05-15",
    });

    expect(insertRes.error).toBeNull();
    expect(insertRes.data).toBeDefined();

    const selectRes = await mockSupabase
      .from("ascents")
      .select("*")
      .eq("user_id", "user-123");

    expect(selectRes.error).toBeNull();
    expect(selectRes.data).toHaveLength(1);
    expect(selectRes.data[0].summit_id).toBe("gorbea");
  });

  it("should support updates with eq filters", async () => {
    await mockSupabase.from("profiles").insert({
      id: "user-abc",
      username: "montanero",
      bio: "Rutas por Pirineos",
    });

    await mockSupabase
      .from("profiles")
      .update({ bio: "Rutas por Pirineos y Picos de Europa" })
      .eq("id", "user-abc");

    const res = await mockSupabase
      .from("profiles")
      .select("*")
      .eq("id", "user-abc")
      .single();

    expect(res.error).toBeNull();
    expect(res.data.bio).toBe("Rutas por Pirineos y Picos de Europa");
  });

  it("should support storage upload and retrieval", async () => {
    const bucket = mockSupabase.storage.from("summit-photos");
    const uploadRes = await bucket.upload("user-1/gorbea.jpg", "binary-data");
    expect(uploadRes.error).toBeNull();

    const listRes = await bucket.list("user-1");
    expect(listRes.error).toBeNull();
    expect(listRes.data).toHaveLength(1);

    const publicUrlRes = bucket.getPublicUrl("user-1/gorbea.jpg");
    expect(publicUrlRes.data.publicUrl).toContain("user-1/gorbea.jpg");
  });

  it("should mock authentication user and session", async () => {
    const userRes = await mockSupabase.auth.getUser();
    expect(userRes.data.user).toBeDefined();
    expect(userRes.data.user.id).toBe("mock-user-uuid-001");

    const sessionRes = await mockSupabase.auth.getSession();
    expect(sessionRes.data.session).toBeDefined();
    expect(sessionRes.data.session.access_token).toBe("mock-token");
  });
});
