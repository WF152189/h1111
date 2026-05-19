package com.auth.app.service;

import com.auth.app.dto.UserPermissionInfo;
import com.auth.app.exception.AuthException;
import com.auth.app.model.Role;
import com.auth.app.model.RolePermission;
import com.auth.app.model.User;
import com.auth.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * ユーザーIDで権限情報を取得する
     */
    public UserPermissionInfo getUserPermissionInfo(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AuthException.entraTokenInvalid());

        if (!user.getIsActive()) {
            throw AuthException.userInactive();
        }

        List<String> roles = user.getRoles().stream()
                .map(Role::getRoleId)
                .collect(Collectors.toList());

        List<String> permissions = user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(RolePermission::toPermissionString)
                .distinct()
                .collect(Collectors.toList());

        return UserPermissionInfo.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    /**
     * ユーザーの存在確認
     */
    public boolean userExists(String userId) {
        return userRepository.existsById(userId);
    }

    /**
     * 全ユーザー一覧（スタブ用）
     */
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}
