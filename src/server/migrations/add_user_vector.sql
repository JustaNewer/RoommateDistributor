-- 为 Users 表添加 user_vector 列，用于存储问卷测试的9维性格向量
-- 格式为 JSON 数组，例如 [3,4,5,2,4,3,4,1,5]
ALTER TABLE Users ADD COLUMN user_vector VARCHAR(100) DEFAULT NULL;

-- 为 Users 表添加睡眠时间段相关列
ALTER TABLE Users ADD COLUMN sleep_time_start VARCHAR(5) DEFAULT NULL;  -- 晚间入睡时间，格式 HH:MM
ALTER TABLE Users ADD COLUMN sleep_time_end   VARCHAR(5) DEFAULT NULL;  -- 晚间起床时间，格式 HH:MM
ALTER TABLE Users ADD COLUMN has_nap          TINYINT(1) DEFAULT 0;    -- 是否午睡
ALTER TABLE Users ADD COLUMN nap_time_start   VARCHAR(5) DEFAULT NULL;  -- 午睡开始时间，格式 HH:MM
ALTER TABLE Users ADD COLUMN nap_time_end     VARCHAR(5) DEFAULT NULL;  -- 午睡结束时间，格式 HH:MM

-- 如果之前已执行过旧版迁移，需要先删除旧列再执行上面的 ADD：
-- ALTER TABLE Users DROP COLUMN sleep_time;
-- ALTER TABLE Users DROP COLUMN wake_time;
-- ALTER TABLE Users DROP COLUMN nap_start;
-- ALTER TABLE Users DROP COLUMN nap_end;
-- ALTER TABLE Users DROP COLUMN nap_time;
