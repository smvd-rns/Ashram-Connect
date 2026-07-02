-- =========================================================
-- MIGRATION: HIDE SHORTS FOR SPECIFIC YOUTUBE CHANNELS
-- Run this in BOTH your Main Supabase DB AND your YouTube DB
-- =========================================================

-- 1. Add hide_shorts column if it does not exist
ALTER TABLE youtube_channels ADD COLUMN IF NOT EXISTS hide_shorts BOOLEAN DEFAULT false;

-- 2. Mark the specified channels to hide their shorts
UPDATE youtube_channels 
SET hide_shorts = true 
WHERE channel_id IN (
  'UCt2eU9pu09RHURRefjDURng',
  'UCKsPhfStsvK9NKPjXj0DLvg',
  'UCuyNwFU3fCEhRi3OPk3WvXw',
  'UCAA6IsLVfbHrP1I_lzxv09Q',
  'UCypj9Vvizo4cCERfDFIG3zw',
  'UC4mjwXdDLZ_iDysNToElEtw',
  'UCdYy78yFUqU8XmbgoMqQeyA',
  'UCZ8S3qwowiFztAQBRTawWfA',
  'UChiomcuXXZmT03WudnQ3n0g',
  'UCDpm6pbxFJdJBpEkyeCHQow',
  'UCMN65IIp2v_BQbKbeKF-FmQ',
  'UCupgMMx2C9G6F6Lvv4EXSbg'
);
