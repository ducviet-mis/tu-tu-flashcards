-- TỪNG NGÀY — chạy toàn bộ trong Supabase > SQL Editor > New query > Run.
-- Không cần Auth / tài khoản trong app. Không dùng service_role ở trình duyệt.
-- Mã đồng bộ ngẫu nhiên 256 bit là quyền truy cập kho. Ai có mã có quyền đọc/ghi.
-- Chỉ lưu SHA-256 của mã. Không ghi mã thô vào bảng hoặc URL.
-- Từ vựng không mã hóa đầu cuối; chủ dự án DB vẫn có thể đọc nội dung.
-- Script không xóa dữ liệu hiện có và có thể chạy lại.

begin;

create schema if not exists flashcard_private;
revoke all on schema flashcard_private from public, anon, authenticated;

create table if not exists flashcard_private.vaults (
  key_hash text primary key check (length(key_hash) = 64),
  days jsonb not null check (jsonb_typeof(days) = 'array'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table flashcard_private.vaults enable row level security;
-- Không có policy công khai: chỉ hàm kiểm tra mã bên dưới được phép đọc/ghi.
revoke all on table flashcard_private.vaults from public, anon, authenticated;

create or replace function public.flashcard_load(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_hash text;
  v_row flashcard_private.vaults%rowtype;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_SYNC_KEY' using errcode = '22023';
  end if;
  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_key, 'UTF8')), 'hex');
  select * into v_row from flashcard_private.vaults where key_hash = v_hash;
  if not found then
    return pg_catalog.jsonb_build_object('days', null, 'revision', 0);
  end if;
  return pg_catalog.jsonb_build_object('days', v_row.days, 'revision', v_row.revision, 'updated_at', v_row.updated_at);
end;
$function$;

create or replace function public.flashcard_save(
  p_key text,
  p_days jsonb,
  p_expected_revision bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_hash text;
  v_revision bigint;
  v_day jsonb;
  v_word jsonb;
  v_date text;
  v_dates text[] := array[]::text[];
  v_ids text[] := array[]::text[];
  v_words text[];
  v_key text;
  v_count integer := 0;
begin
  if p_key is null or p_key !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_SYNC_KEY' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_REVISION' using errcode = '22023';
  end if;
  if p_days is null or pg_catalog.jsonb_typeof(p_days) <> 'array' then
    raise exception 'INVALID_DAYS' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_array_length(p_days) > 5000
     or pg_catalog.octet_length(p_days::text) > 10485760 then
    raise exception 'PAYLOAD_TOO_LARGE' using errcode = '22023';
  end if;

  for v_day in select value from pg_catalog.jsonb_array_elements(p_days) loop
    if pg_catalog.jsonb_typeof(v_day) is distinct from 'object'
       or pg_catalog.jsonb_typeof(v_day->'date') is distinct from 'string'
       or pg_catalog.jsonb_typeof(v_day->'words') is distinct from 'array' then
      raise exception 'INVALID_DAY' using errcode = '22023';
    end if;
    v_date := v_day->>'date';
    if v_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or v_date < '1900-01-01' or v_date > '9999-12-31'
       or pg_catalog.to_char(v_date::date, 'YYYY-MM-DD') <> v_date
       or v_date = any(v_dates) then
      raise exception 'INVALID_OR_DUPLICATE_DATE' using errcode = '22023';
    end if;
    v_dates := pg_catalog.array_append(v_dates, v_date);
    v_words := array[]::text[];
    for v_word in select value from pg_catalog.jsonb_array_elements(v_day->'words') loop
      v_count := v_count + 1;
      if v_count > 50000 then
        raise exception 'TOO_MANY_WORDS' using errcode = '22023';
      end if;
      if pg_catalog.jsonb_typeof(v_word) is distinct from 'object'
         or pg_catalog.jsonb_typeof(v_word->'id') is distinct from 'string'
         or pg_catalog.jsonb_typeof(v_word->'en') is distinct from 'string'
         or pg_catalog.jsonb_typeof(v_word->'vi') is distinct from 'string'
         or pg_catalog.jsonb_typeof(v_word->'remembered') is distinct from 'boolean'
         or pg_catalog.length(pg_catalog.btrim(v_word->>'id')) not between 1 and 160
         or pg_catalog.length(pg_catalog.btrim(v_word->>'en')) not between 1 and 200
         or pg_catalog.length(pg_catalog.btrim(v_word->>'vi')) not between 1 and 1000 then
        raise exception 'INVALID_WORD' using errcode = '22023';
      end if;
      v_key := pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(v_word->>'en'), '\s+', ' ', 'g'));
      if (v_word->>'id') = any(v_ids) or v_key = any(v_words) then
        raise exception 'DUPLICATE_WORD' using errcode = '22023';
      end if;
      v_ids := pg_catalog.array_append(v_ids, v_word->>'id');
      v_words := pg_catalog.array_append(v_words, v_key);
    end loop;
  end loop;

  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_key, 'UTF8')), 'hex');
  -- Khóa theo mã kho: bảo vệ cả trường hợp hai thiết bị tạo kho cùng lúc.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_hash, 0));
  select revision into v_revision from flashcard_private.vaults where key_hash = v_hash for update;
  if not found then
    if p_expected_revision <> 0 then
      raise exception 'REVISION_CONFLICT' using errcode = '40001';
    end if;
    insert into flashcard_private.vaults(key_hash, days, revision)
      values (v_hash, p_days, 1);
    v_revision := 1;
  else
    if p_expected_revision <> v_revision then
      raise exception 'REVISION_CONFLICT' using errcode = '40001';
    end if;
    v_revision := v_revision + 1;
    update flashcard_private.vaults
      set days = p_days, revision = v_revision, updated_at = pg_catalog.now()
      where key_hash = v_hash;
  end if;
  return pg_catalog.jsonb_build_object('revision', v_revision);
end;
$function$;

-- PostgreSQL mặc định cấp EXECUTE cho PUBLIC: thu hồi rõ ràng trước khi cấp lại.
revoke all on function public.flashcard_load(text) from public, anon, authenticated;
revoke all on function public.flashcard_save(text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.flashcard_load(text) to anon, authenticated;
grant execute on function public.flashcard_save(text, jsonb, bigint) to anon, authenticated;
grant usage on schema public to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Tự kiểm tra sau khi chạy (SQL Editor, không cần sửa các hàm):
-- select has_schema_privilege('anon', 'flashcard_private', 'USAGE'); -- false
-- select has_table_privilege('anon', 'flashcard_private.vaults', 'SELECT'); -- false
-- select has_function_privilege('anon', 'public.flashcard_load(text)', 'EXECUTE'); -- true
-- Không dùng mã thật trong ví dụ chia sẻ hoặc ảnh chụp màn hình.
