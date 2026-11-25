package com.example.hotelbookingandroid.data.model.portal;

import java.io.Serializable;
import java.util.List;

/** DTO cho AdminUsersController và RolesController. */
public final class AdminModels {
    private AdminModels() {}

    // ===== Tài khoản =====
    public static class AdminUser {
        public long userId;
        public String fullName;
        public String email;
        public String phone;
        public String dateOfBirth;
        public boolean isActive;
        public List<String> roles;
    }

    public static class UpdateUserRequest {
        public final String fullName;
        public final String phone;
        /** yyyy-MM-dd hoặc null */
        public final String dateOfBirth;

        public UpdateUserRequest(String fullName, String phone, String dateOfBirth) {
            this.fullName = fullName;
            this.phone = phone;
            this.dateOfBirth = dateOfBirth;
        }
    }

    public static class UserRoles {
        public long userId;
        public String fullName;
        public String email;
        public List<String> roles;
    }

    public static class UserRolesRequest {
        public final List<Integer> roleIds;
        public UserRolesRequest(List<Integer> roleIds) { this.roleIds = roleIds; }
    }

    // ===== Vai trò & quyền =====
    public static class Permission {
        public int permissionId;
        public String code;
        public String name;
        public String group;
        public String description;
    }

    public static class Role implements Serializable {
        public int roleId;
        public String name;
        public String description;
        /** Vai trò hệ thống (Customer / Hotel Staff / Admin): không đổi tên, không xóa. */
        public boolean isSystem;
        public boolean isActive;
        public int userCount;
        public List<String> permissions;
    }

    public static class CreateRoleRequest {
        public final String name;
        public final String description;
        public CreateRoleRequest(String name, String description) { this.name = name; this.description = description; }
    }

    public static class UpdateRoleRequest {
        public final String name;
        public final String description;
        public final boolean isActive;

        public UpdateRoleRequest(String name, String description, boolean isActive) {
            this.name = name;
            this.description = description;
            this.isActive = isActive;
        }
    }

    public static class RolePermissionsRequest {
        public final List<String> permissionCodes;
        public RolePermissionsRequest(List<String> permissionCodes) { this.permissionCodes = permissionCodes; }
    }
}
