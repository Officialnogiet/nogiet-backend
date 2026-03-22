import { eq } from "drizzle-orm";
import { roles, permissions, rolePermissions } from "../db/schema/index";

export class RoleRepository {
  constructor(private db: any) {}

  async findAllRoles() {
    return this.db.select().from(roles);
  }

  async findRoleByName(name: string) {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);
    return role ?? null;
  }

  async findAllPermissions() {
    return this.db.select().from(permissions);
  }

  async getRolePermissions(roleId: string) {
    return this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
  }

  async setRolePermissions(roleId: string, permissionIds: string[]) {
    await this.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissionIds.length > 0) {
      await this.db.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({ roleId, permissionId }))
      );
    }
  }

  async createRole(name: string, description?: string) {
    const [role] = await this.db.insert(roles).values({ name, description }).returning();
    return role;
  }

  async createPermission(name: string, description?: string) {
    const [perm] = await this.db.insert(permissions).values({ name, description }).returning();
    return perm;
  }
}
