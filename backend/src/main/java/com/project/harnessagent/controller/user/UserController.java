package com.project.harnessagent.controller.user;

import com.project.harnessagent.common.ApiResponse;
import com.project.harnessagent.dto.user.UserCreateRequest;
import com.project.harnessagent.dto.user.UserResponse;
import com.project.harnessagent.dto.user.UserUpdateRequest;
import com.project.harnessagent.service.user.InMemoryUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 体验期用户管理。按当前约定全开放（任何人可增删改查），认证落地后统一收紧。
 */
@Tag(name = "体验用户")
@RestController
@RequestMapping("/users")
public class UserController {

    private final InMemoryUserService users;

    public UserController(InMemoryUserService users) {
        this.users = users;
    }

    @Operation(summary = "用户列表，q 可按用户名/昵称/租户模糊过滤")
    @GetMapping
    public ApiResponse<List<UserResponse>> list(@RequestParam(required = false) String q) {
        return ApiResponse.ok(users.list(q).stream().map(UserResponse::from).toList());
    }

    @Operation(summary = "用户详情")
    @GetMapping("/{id}")
    public ApiResponse<UserResponse> detail(@PathVariable String id) {
        return ApiResponse.ok(UserResponse.from(users.require(id)));
    }

    @Operation(summary = "新建用户")
    @PostMapping
    public ApiResponse<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ApiResponse.ok(UserResponse.from(users.create(request)));
    }

    @Operation(summary = "修改用户")
    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable String id, @Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok(UserResponse.from(users.update(id, request)));
    }

    @Operation(summary = "删除用户")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        users.delete(id);
        return ApiResponse.ok();
    }
}
