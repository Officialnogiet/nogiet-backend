import { RoleRepository } from "../repositories/role.repository";

export class RoleService {
  constructor(private roleRepo: RoleRepository) {}

  async getAllRoles() {
    await this.ensureDefaultRoles();
    const allRoles = await this.roleRepo.findAllRoles();
    const rolesWithPermissions = await Promise.all(
      allRoles.map(async (role: any) => {
        const perms = await this.roleRepo.getRolePermissions(role.id);
        return { ...role, permissions: perms };
      })
    );
    return rolesWithPermissions;
  }

  async getAllPermissions() {
    await this.ensureDefaultPermissions();
    return this.roleRepo.findAllPermissions();
  }

  async updateRolePermissions(roleName: string, permissionIds: string[]) {
    const role = await this.roleRepo.findRoleByName(roleName);
    if (!role) {
      throw Object.assign(new Error("Role not found"), { statusCode: 404 });
    }
    await this.roleRepo.setRolePermissions(role.id, permissionIds);
    const updated = await this.roleRepo.getRolePermissions(role.id);
    return { ...role, permissions: updated };
  }

  private async ensureDefaultRoles() {
    const existing = await this.roleRepo.findAllRoles();
    const existingNames = new Set(existing.map((r: any) => r.name));
    const defaults = [
      { name: "super_admin", description: "Full access — MD, CEO, CDO, CTO" },
      { name: "admin", description: "Management access — Managers, Team Leads" },
      { name: "member", description: "Standard team member access" },
    ];
    for (const d of defaults) {
      if (!existingNames.has(d.name)) {
        await this.roleRepo.createRole(d.name, d.description);
      }
    }
  }

  private async ensureDefaultPermissions() {
    const existing = await this.roleRepo.findAllPermissions();
    const existingNames = new Set(existing.map((p: any) => p.name));
    const defaults = [
      { name: "live_map", description: "Access live emission map" },
      { name: "data_comparison", description: "Compare ground vs satellite data" },
      { name: "manage_data", description: "Add/edit facilities and ground data" },
      { name: "manage_alerts", description: "Create and manage alerts" },
      { name: "user_management", description: "Manage team members" },
      { name: "role_management", description: "Configure roles and permissions" },
      { name: "settings", description: "Change application settings" },
      { name: "export_data", description: "Export reports and data" },
    ];
    for (const d of defaults) {
      if (!existingNames.has(d.name)) {
        await this.roleRepo.createPermission(d.name, d.description);
      }
    }
  }
}
