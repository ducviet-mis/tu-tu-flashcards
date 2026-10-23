-- TỪ TỪ — Cấu trúc dữ liệu cá nhân, phiên bản 1.
-- Supabase SQL Editor > New query > dán TOÀN BỘ file > Run.
-- Dùng PostgreSQL 15 trở lên. Tên bảng/cột tiếng Việt không dấu.
-- Chỉ tạo cấu trúc nền; chạy tiếp dong_bo_tai_khoan.sql và triển khai web mới để bật lưu theo tài khoản.
-- Không đưa kho từ điển/WordNet chung vào database.
-- Không xóa bảng hoặc dữ liệu của cơ chế đồng bộ bằng mã cũ (schema.sql).
-- Có thể chạy lại: các bản ghi hiện có không bị ghi đè.

begin;

-- Các hàm trigger nội bộ không được mở qua Data API.
create schema if not exists tu_tu_noi_bo;
revoke all on schema tu_tu_noi_bo from public, anon, authenticated;

-- 1. HỒ SƠ: email, mật khẩu và phiên đăng nhập do Supabase Auth quản lý.
create table if not exists public.ho_so_nguoi_dung (
  nguoi_dung_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  ten_hien_thi text not null default '' check (char_length(ten_hien_thi) <= 100),
  anh_dai_dien_url text check (char_length(anh_dai_dien_url) <= 2048),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0)
);

-- 2. CÀI ĐẶT: một hàng cho mỗi tài khoản.
create table if not exists public.cai_dat_nguoi_dung (
  nguoi_dung_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  muc_tieu_moi_ngay smallint not null default 10 check (muc_tieu_moi_ngay between 1 and 200),
  toc_do_doc numeric(3,2) not null default 0.85 check (toc_do_doc between 0.5 and 1.5),
  tu_dong_doc boolean not null default false,
  hien_tieng_viet_truoc boolean not null default false,
  giao_dien text not null default 'toi' check (giao_dien in ('toi', 'sang', 'he_thong')),
  mui_gio text not null default 'Asia/Ho_Chi_Minh' check (char_length(mui_gio) between 1 and 80),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0)
);

-- 3. SỔ TỪ: đúng với cách app hiện chia sổ theo ngày.
create table if not exists public.so_tu (
  nguoi_dung_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ngay_so date not null check (ngay_so between date '1900-01-01' and date '9999-12-31'),
  ghi_chu text not null default '' check (char_length(ghi_chu) <= 1000),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0),
  primary key (nguoi_dung_id, ngay_so)
);

-- 4. TỪ VỰNG: chỉ lưu thẻ người dùng chọn hoặc tự nhập.
-- ID dạng text giữ được cả UUID và ID dự phòng w-... của app hiện tại.
create table if not exists public.tu_vung (
  nguoi_dung_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tu_vung_id text not null default gen_random_uuid()::text
    check (char_length(btrim(tu_vung_id)) between 1 and 160),
  ngay_so date not null,
  tu_tieng_anh text not null check (char_length(btrim(tu_tieng_anh)) between 1 and 200),
  nghia_tieng_viet text not null check (char_length(btrim(nghia_tieng_viet)) between 1 and 1000),
  vi_du_tieng_anh text not null default '' check (char_length(vi_du_tieng_anh) <= 1000),
  dich_vi_du text not null default '' check (char_length(dich_vi_du) <= 1000),
  ma_nghia_wordnet text check (char_length(ma_nghia_wordnet) <= 200),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0),
  primary key (nguoi_dung_id, tu_vung_id),
  foreign key (nguoi_dung_id, ngay_so)
    references public.so_tu(nguoi_dung_id, ngay_so) on delete cascade
);

-- Không trùng từ trong cùng sổ; vẫn cho phép một từ xuất hiện ở những ngày khác nhau.
create unique index if not exists tu_vung_khong_trung_trong_so
  on public.tu_vung (nguoi_dung_id, ngay_so,
    (lower(regexp_replace(btrim(normalize(tu_tieng_anh, NFC)), '\s+', ' ', 'g'))));

-- 5. TIẾN TRÌNH: một hàng cho mỗi thẻ từ vựng.
create table if not exists public.tien_trinh_hoc (
  nguoi_dung_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tu_vung_id text not null,
  da_nho boolean not null default false,
  cap_do_on smallint not null default 0 check (cap_do_on between 0 and 5),
  ngay_on_gan_nhat date check (ngay_on_gan_nhat between date '1900-01-01' and date '9999-12-31'),
  ngay_on_tiep date check (ngay_on_tiep between date '1900-01-01' and date '9999-12-31'),
  so_lan_on integer not null default 0 check (so_lan_on >= 0),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0),
  primary key (nguoi_dung_id, tu_vung_id),
  foreign key (nguoi_dung_id, tu_vung_id)
    references public.tu_vung(nguoi_dung_id, tu_vung_id) on delete cascade,
  check (da_nho or cap_do_on = 0)
);
create index if not exists tien_trinh_hoc_theo_lich
  on public.tien_trinh_hoc (nguoi_dung_id, ngay_on_tiep);

-- 6. LỊCH SỬ ÔN: mỗi hàng là một lần đánh giá một từ trong buổi học thật.
-- Client tạo ID một lần, giữ nguyên khi thử đồng bộ lại để tránh đếm trùng.
-- Chỉ đánh dấu trạng thái trong sổ KHÔNG thêm bản ghi vào bảng này.
create table if not exists public.lich_su_on_tap (
  nguoi_dung_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  luot_on_id uuid not null default gen_random_uuid(),
  tu_vung_id text,
  tu_da_on text check (char_length(tu_da_on) <= 200),
  che_do text not null check (che_do in ('lat_the', 'ghep_cap')),
  da_nho boolean not null,
  on_luc timestamptz not null default now(),
  -- Ngày học theo múi giờ tài khoản, do app gửi cả khi đồng bộ ngoại tuyến muộn.
  ngay_hoc date not null check (ngay_hoc between date '1900-01-01' and date '9999-12-31'),
  dong_bo_luc timestamptz not null default now(),
  primary key (nguoi_dung_id, luot_on_id),
  foreign key (nguoi_dung_id, tu_vung_id)
    references public.tu_vung(nguoi_dung_id, tu_vung_id)
    on delete set null (tu_vung_id)
);
-- Xóa thẻ không xóa mất thống kê các lượt học đã thực hiện.
create index if not exists lich_su_on_tap_theo_ngay
  on public.lich_su_on_tap (nguoi_dung_id, ngay_hoc);
create index if not exists lich_su_on_tap_theo_tu
  on public.lich_su_on_tap (nguoi_dung_id, tu_vung_id);

-- 7. THỐNG KÊ CŨ: chỉ dùng lúc chuyển activity đang có trên máy vào tài khoản.
-- Một ngày chỉ có một bản tổng cũ. Nhập lại dùng UPSERT thay thế, không cộng dồn.
-- Các lượt học mới được ghi vào lich_su_on_tap, không ghi trùng vào bảng này.
create table if not exists public.thong_ke_hoc_cu (
  nguoi_dung_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ngay_hoc date not null check (ngay_hoc between date '1900-01-01' and date '9999-12-31'),
  so_luot_on integer not null default 0 check (so_luot_on >= 0),
  so_luot_da_nho integer not null default 0
    check (so_luot_da_nho >= 0 and so_luot_da_nho <= so_luot_on),
  tao_luc timestamptz not null default now(),
  cap_nhat_luc timestamptz not null default now(),
  phien_ban bigint not null default 1 check (phien_ban > 0),
  primary key (nguoi_dung_id, ngay_hoc)
);

-- Khóa ngoại ghép (nguoi_dung_id, ...) ngăn liên kết tới thẻ/sổ của tài khoản khác.
-- Bật RLS và cấp quyền tường minh, kể cả khi đã bỏ Automatically expose new tables.
do $rls$
declare
  bang text;
begin
  foreach bang in array array[
    'ho_so_nguoi_dung', 'cai_dat_nguoi_dung', 'so_tu', 'tu_vung',
    'tien_trinh_hoc', 'lich_su_on_tap', 'thong_ke_hoc_cu'
  ] loop
    execute format('alter table public.%I enable row level security', bang);
    execute format('revoke all on table public.%I from public, anon, authenticated', bang);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', bang);
    execute format('drop policy if exists chi_du_lieu_cua_minh on public.%I', bang);
    execute format(
      'create policy chi_du_lieu_cua_minh on public.%I for all to authenticated '
      'using ((select auth.uid()) = nguoi_dung_id) '
      'with check ((select auth.uid()) = nguoi_dung_id)', bang);
  end loop;
end;
$rls$;

-- Lượt ôn đã ghi là bất biến. Đồng bộ lại cùng ID dùng ON CONFLICT DO NOTHING.
revoke update on table public.lich_su_on_tap from authenticated;
grant usage on schema public to authenticated;

-- Tự cập nhật mốc sửa/phien_ban, hỗ trợ app kiểm tra xung đột khi đồng bộ.
create or replace function tu_tu_noi_bo.ghi_nhan_cap_nhat()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  new.tao_luc := old.tao_luc;
  new.cap_nhat_luc := pg_catalog.clock_timestamp();
  new.phien_ban := old.phien_ban + 1;
  return new;
end;
$fn$;
revoke all on function tu_tu_noi_bo.ghi_nhan_cap_nhat() from public, anon, authenticated;

do $triggers$
declare bang text;
begin
  foreach bang in array array[
    'ho_so_nguoi_dung', 'cai_dat_nguoi_dung', 'so_tu',
    'tu_vung', 'tien_trinh_hoc', 'thong_ke_hoc_cu'
  ] loop
    execute format('drop trigger if exists truoc_khi_cap_nhat on public.%I', bang);
    execute format('create trigger truoc_khi_cap_nhat before update on public.%I '
      'for each row execute function tu_tu_noi_bo.ghi_nhan_cap_nhat()', bang);
  end loop;
end;
$triggers$;

create or replace function tu_tu_noi_bo.kiem_tra_mui_gio()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  -- PostgreSQL từ chối tên múi giờ không hợp lệ.
  perform pg_catalog.timezone(new.mui_gio, pg_catalog.now());
  return new;
end;
$fn$;
revoke all on function tu_tu_noi_bo.kiem_tra_mui_gio() from public, anon, authenticated;
drop trigger if exists kiem_tra_mui_gio on public.cai_dat_nguoi_dung;
create trigger kiem_tra_mui_gio before insert or update on public.cai_dat_nguoi_dung
  for each row execute function tu_tu_noi_bo.kiem_tra_mui_gio();

-- Tạo tiến trình mặc định khi thêm thẻ. Chưa có ngày hẹn vẫn được xem là cần ôn.
create or replace function tu_tu_noi_bo.tao_tien_trinh_cho_tu()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  insert into public.tien_trinh_hoc (nguoi_dung_id, tu_vung_id)
    values (new.nguoi_dung_id, new.tu_vung_id) on conflict do nothing;
  return new;
end;
$fn$;
revoke all on function tu_tu_noi_bo.tao_tien_trinh_cho_tu() from public, anon, authenticated;
drop trigger if exists sau_khi_them_tu on public.tu_vung;
create trigger sau_khi_them_tu after insert on public.tu_vung
  for each row execute function tu_tu_noi_bo.tao_tien_trinh_cho_tu();

-- Tài khoản mới có hồ sơ/cài đặt mặc định. Không phụ thuộc nội dung metadata người dùng.
create or replace function tu_tu_noi_bo.tao_ho_so_mac_dinh()
returns trigger language plpgsql security definer set search_path = ''
as $fn$
begin
  insert into public.ho_so_nguoi_dung (nguoi_dung_id) values (new.id) on conflict do nothing;
  insert into public.cai_dat_nguoi_dung (nguoi_dung_id) values (new.id) on conflict do nothing;
  return new;
end;
$fn$;
revoke all on function tu_tu_noi_bo.tao_ho_so_mac_dinh() from public, anon, authenticated;
drop trigger if exists tu_tu_sau_khi_tao_tai_khoan on auth.users;
create trigger tu_tu_sau_khi_tao_tai_khoan after insert on auth.users
  for each row execute function tu_tu_noi_bo.tao_ho_so_mac_dinh();

-- Khởi tạo cho tài khoản/thẻ đã có nếu script được chạy lại.
insert into public.ho_so_nguoi_dung (nguoi_dung_id)
  select id from auth.users on conflict do nothing;
insert into public.cai_dat_nguoi_dung (nguoi_dung_id)
  select id from auth.users on conflict do nothing;
insert into public.tien_trinh_hoc (nguoi_dung_id, tu_vung_id)
  select nguoi_dung_id, tu_vung_id from public.tu_vung on conflict do nothing;

-- BẢNG XEM: tính biểu đồ, mục tiêu và chuỗi ngày từ lịch sử + thống kê trước khi chuyển.
-- security_invoker bắt buộc để người xem vẫn chịu RLS của các bảng gốc.
create or replace view public.thong_ke_hoc_theo_ngay
with (security_invoker = true)
as
select nguoi_dung_id, ngay_hoc,
  sum(so_luot_on)::bigint as so_luot_on,
  sum(so_luot_da_nho)::bigint as so_luot_da_nho
from (
  select nguoi_dung_id, ngay_hoc,
    count(*) as so_luot_on,
    count(*) filter (where da_nho) as so_luot_da_nho
  from public.lich_su_on_tap group by nguoi_dung_id, ngay_hoc
  union all
  select nguoi_dung_id, ngay_hoc, so_luot_on::bigint, so_luot_da_nho::bigint
  from public.thong_ke_hoc_cu
) as nguon
group by nguoi_dung_id, ngay_hoc;
revoke all on table public.thong_ke_hoc_theo_ngay from public, anon, authenticated;
grant select on table public.thong_ke_hoc_theo_ngay to authenticated;

comment on table public.ho_so_nguoi_dung is 'Hồ sơ hiển thị; thông tin đăng nhập nằm trong Supabase Auth.';
comment on table public.cai_dat_nguoi_dung is 'Cài đặt và mục tiêu học riêng của tài khoản.';
comment on table public.so_tu is 'Sổ từ cá nhân chia theo ngày.';
comment on table public.tu_vung is 'Các thẻ cá nhân đã lưu; không chứa toàn bộ kho từ điển.';
comment on table public.tien_trinh_hoc is 'Trạng thái nhớ và lịch ôn của từng thẻ.';
comment on table public.lich_su_on_tap is 'Các lượt đánh giá khi học; ID cố định ngăn đồng bộ trùng.';
comment on table public.thong_ke_hoc_cu is 'Số liệu tổng hợp cũ từ localStorage, chỉ nhập một lần theo ngày.';
comment on view public.thong_ke_hoc_theo_ngay is 'Tổng hợp theo ngày, tôn trọng RLS, không lưu bản sao số liệu.';

notify pgrst, 'reload schema';
commit;

-- Kết quả chạy: 7 bảng đều phải có rls_dang_bat = true và khach_co_quyen_doc = false.
select c.relname as ten_bang, c.relrowsecurity as rls_dang_bat,
  has_table_privilege('anon', c.oid, 'SELECT') as khach_co_quyen_doc
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (
  'ho_so_nguoi_dung', 'cai_dat_nguoi_dung', 'so_tu', 'tu_vung',
  'tien_trinh_hoc', 'lich_su_on_tap', 'thong_ke_hoc_cu'
)
order by c.relname;
