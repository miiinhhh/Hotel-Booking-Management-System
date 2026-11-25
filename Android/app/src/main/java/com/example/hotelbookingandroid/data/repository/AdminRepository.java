package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.portal.AdminModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.remote.api.AdminApi;

import java.util.List;

public class AdminRepository {
    private final AdminApi api = ApiClient.create(AdminApi.class);

    // --- Tài khoản ---
    public LiveData<Resource<List<AdminModels.AdminUser>>> users() {
        return CallExecutor.raw(api.users());
    }

    public LiveData<Resource<AdminModels.AdminUser>> updateUser(long userId, String fullName, String phone, String dob) {
        return CallExecutor.raw(api.updateUser(userId, new AdminModels.UpdateUserRequest(fullName, phone, dob)));
    }

    public LiveData<Resource<AdminModels.AdminUser>> setUserActive(long userId, boolean active) {
        return CallExecutor.raw(api.setUserActive(userId, new PortalModels.ActiveRequest(active)));
    }

    public LiveData<Resource<AdminModels.UserRoles>> setUserRoles(long userId, List<Integer> roleIds) {
        return CallExecutor.raw(api.setUserRoles(userId, new AdminModels.UserRolesRequest(roleIds)));
    }

    // --- Vai trò & quyền ---
    public LiveData<Resource<List<AdminModels.Permission>>> permissions() {
        return CallExecutor.raw(api.permissions());
    }

    public LiveData<Resource<List<AdminModels.Role>>> roles() {
        return CallExecutor.raw(api.roles());
    }

    public LiveData<Resource<AdminModels.Role>> createRole(String name, String description) {
        return CallExecutor.raw(api.createRole(new AdminModels.CreateRoleRequest(name, description)));
    }

    public LiveData<Resource<AdminModels.Role>> updateRole(int roleId, String name, String description, boolean active) {
        return CallExecutor.raw(api.updateRole(roleId, new AdminModels.UpdateRoleRequest(name, description, active)));
    }

    public LiveData<Resource<AdminModels.Role>> setRolePermissions(int roleId, List<String> codes) {
        return CallExecutor.raw(api.setRolePermissions(roleId, new AdminModels.RolePermissionsRequest(codes)));
    }

    public LiveData<Resource<Void>> deleteRole(int roleId) {
        return CallExecutor.raw(api.deleteRole(roleId));
    }
}
