-- ========================================
-- 初期データ投入
-- ========================================

-- ユーザー
INSERT INTO users (user_id, email, display_name, is_active) VALUES
('admin001', 'test-admin@example.com', 'テスト管理者', TRUE),
('error001', 'test-user@example.com', 'テスト一般', TRUE),
('uF6FqsMh5NBqDG2jhOJA0ui6KX0u8BlFa3TBhhlPJ14', 'test-guest@example.com', 'テストゲスト', TRUE);

-- ロール
INSERT INTO roles (role_id, role_name, description) VALUES
('ADMIN', 'システム管理者', '全リソースの全操作権限'),
('USER', '一般ユーザー', '基本操作権限'),
('GUEST', 'ゲスト', '参照のみ権限');

-- ユーザー・ロール割当
INSERT INTO user_roles (user_id, role_id) VALUES
('admin001', 'ADMIN'),
('error001', 'USER'),
('uF6FqsMh5NBqDG2jhOJA0ui6KX0u8BlFa3TBhhlPJ14', 'GUEST');

-- ロール・権限割当
INSERT INTO role_permissions (role_id, resource, action) VALUES
('ADMIN', 'user', 'read'),
('ADMIN', 'user', 'write'),
('ADMIN', 'user', 'delete'),
('USER', 'user', 'read'),
('USER', 'user', 'write'),
('GUEST', 'user', 'read');
