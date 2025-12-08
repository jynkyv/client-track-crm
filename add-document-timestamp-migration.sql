-- 文件上传时间功能迁移脚本
-- 将 companies 表中的文档字段从 TEXT[] (字符串数组) 转换为 JSONB (对象数组)
-- 新结构: [{"url": "...", "uploadedAt": "..."}]

-- 迁移步骤：
-- 1. 添加临时 JSONB 列
-- 2. 将数据从旧列转换并复制到临时列
-- 3. 删除旧列
-- 4. 重命名临时列为原列名

-- 定义要迁移的列
DO $$
DECLARE
    cols TEXT[] := ARRAY['teihon', 'financial_report', 'industry_license', 'gmo_contract', 'otit_materials', 'central_materials', 'instructor_license', 'visa_application'];
    col_name TEXT;
    temp_col TEXT;
BEGIN
    FOREACH col_name IN ARRAY cols
    LOOP
        temp_col := col_name || '_new';
        
        -- 检查原列是否存在
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = col_name
        ) THEN
            -- 1. 添加临时 JSONB 列
            EXECUTE format('ALTER TABLE companies ADD COLUMN IF NOT EXISTS %I JSONB', temp_col);
            
            -- 2. 将数据从旧列转换并复制到临时列
            EXECUTE format(
                'UPDATE companies SET %I = (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            ''url'', elem,
                            ''uploadedAt'', to_char(now(), ''YYYY-MM-DD"T"HH24:MI:SS"Z"'')
                        )
                    )
                    FROM unnest(%I) AS elem
                )
                WHERE %I IS NOT NULL',
                temp_col, col_name, col_name
            );
            
            -- 3. 删除旧列
            EXECUTE format('ALTER TABLE companies DROP COLUMN %I', col_name);
            
            -- 4. 重命名临时列为原列名
            EXECUTE format('ALTER TABLE companies RENAME COLUMN %I TO %I', temp_col, col_name);
            
            RAISE NOTICE 'Migrated column: %', col_name;
        ELSE
            RAISE NOTICE 'Column % does not exist, skipping', col_name;
        END IF;
    END LOOP;
END $$;

-- 验证列类型
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN (
    'teihon', 
    'financial_report', 
    'industry_license',
    'gmo_contract',
    'otit_materials',
    'central_materials',
    'instructor_license',
    'visa_application'
);
