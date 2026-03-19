-- 将 user_tags 列类型改为 TEXT，以容纳完整的自然语言性格画像描述
-- 原先存储空格分隔的短标签，现在存储确定性生成的性格画像文本
ALTER TABLE Users MODIFY COLUMN user_tags TEXT DEFAULT NULL;

-- 同时更新 DormApplication 表中的 user_tags 列（申请时会复制用户画像）
ALTER TABLE DormApplication MODIFY COLUMN user_tags TEXT DEFAULT NULL;
