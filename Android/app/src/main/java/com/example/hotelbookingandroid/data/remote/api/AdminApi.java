package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.portal.AdminModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;

/** Quản trị tài khoản (accounts.manage) và Vai trò & phân quyền (roles.manage). */
public interface AdminApi {
    // --- Tài khoản ---
    @GET("api/admin/users")
    Call<List<AdminModels.AdminUser>> users();

    @PUT("api/admin/users/{userId}")
    Call<AdminModels.AdminUser> updateUser(@Path("userId") long userId, @Body AdminModels.UpdateUserRequest request);

    @PATCH("api/admin/users/{userId}/status")
    Call<AdminModels.AdminUser> setUserActive(@Path("userId") long userId, @Body PortalModels.ActiveRequest request);

    @GET("api/admin/users/{userId}/roles")
    Call<AdminModels.UserRoles> userRoles(@Path("userId") long userId);

    @PUT("api/admin/users/{userId}/roles")
    Call<AdminModels.UserRoles> setUserRoles(@Path("userId") long userId, @Body AdminModels.UserRolesRequest request);

    // --- Vai trò & quyền ---
    @GET("api/admin/permissions")
    Call<List<AdminModels.Permission>> permissions();

    @GET("api/admin/roles")
    Call<List<AdminModels.Role>> roles();

    @POST("api/admin/roles")
    Call<AdminModels.Role> createRole(@Body AdminModels.CreateRoleRequest request);

    @PUT("api/admin/roles/{roleId}")
    Call<AdminModels.Role> updateRole(@Path("roleId") int roleId, @Body AdminModels.UpdateRoleRequest request);

    @PUT("api/admin/roles/{roleId}/permissions")
    Call<AdminModels.Role> setRolePermissions(@Path("roleId") int roleId, @Body AdminModels.RolePermissionsRequest request);

    @DELETE("api/admin/roles/{roleId}")
    Call<Void> deleteRole(@Path("roleId") int roleId);
}
