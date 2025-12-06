-- 创建登录函数，绕过 users 表的 RLS 限制
-- 这是一个 SECURITY DEFINER 函数，意味着它将以创建该函数的用户的权限运行（通常是 postgres/admin）
-- 从而可以读取 users 表的所有行，即使 RLS 限制了当前用户的访问

CREATE OR REPLACE FUNCTION login_user(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user JSON;
BEGIN
  -- 查找匹配的用户
  SELECT row_to_json(u) INTO v_user
  FROM users u
  WHERE u.username = p_username 
  AND (u.password = p_password OR u.password = trim(p_password) OR trim(u.password) = trim(p_password));

  -- 如果没找到，返回 null
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- 如果找到了，返回用户信息
  RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION login_user IS '用于登录验证的函数，绕过 RLS 检查用户名和密码';
