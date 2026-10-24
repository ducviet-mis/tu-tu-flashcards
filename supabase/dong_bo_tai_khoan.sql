-- Cập nhật 24/10/2026: chạy lại TOÀN BỘ file để bổ sung lịch ôn Chủ đề.
-- Từ Từ: bật lưu dữ liệu học theo tài khoản và đồng bộ nhiều thiết bị.
-- Chạy tu_tu_supabase.sql trước nếu dự án chưa có 7 bảng dữ liệu cá nhân.
-- Sau đó chạy TOÀN BỘ file này trong Supabase SQL Editor. Có thể chạy lại.
-- Không xóa dữ liệu hiện có, không tải kho từ điển lên Supabase.
begin;

alter table public.tu_vung add column if not exists noi_dung_bo_sung jsonb not null default '{}'::jsonb;
alter table public.lich_su_on_tap add column if not exists chu_de_id text;

create table if not exists public.trang_thai_dong_bo (
 nguoi_dung_id uuid primary key references auth.users(id) on delete cascade,
 phien_ban bigint not null default 0 check (phien_ban >= 0),
 tra_cuu_gan_day jsonb not null default '[]'::jsonb check (jsonb_typeof(tra_cuu_gan_day) = 'array'),
 cap_nhat_luc timestamptz not null default now()
);
create table if not exists public.tien_trinh_chu_de (
 nguoi_dung_id uuid not null references auth.users(id) on delete cascade,
 chu_de_id text not null check (chu_de_id ~ '^[a-z0-9-]+$' and length(chu_de_id) <= 120),
 tu_trong_bo_id text not null check (tu_trong_bo_id ~ '^tw-[a-z0-9-]+$' and length(tu_trong_bo_id) <= 120),
 da_nho boolean not null default false,
 cap_nhat_luc timestamptz not null default now(),
 primary key (nguoi_dung_id,chu_de_id,tu_trong_bo_id)
);

-- Lịch ôn của từ chủ đề; không đưa kho từ cố định vào cơ sở dữ liệu.
alter table public.tien_trinh_chu_de add column if not exists cap_do_on smallint not null default 0 check (cap_do_on between 0 and 5);
alter table public.tien_trinh_chu_de add column if not exists so_lan_on integer not null default 0 check (so_lan_on >= 0);
alter table public.tien_trinh_chu_de add column if not exists ngay_on_gan_nhat date;
alter table public.tien_trinh_chu_de add column if not exists ngay_on_tiep date;

do $rls$
declare bang text;
begin
 foreach bang in array array['trang_thai_dong_bo','tien_trinh_chu_de'] loop
  execute format('alter table public.%I enable row level security',bang);
  execute format('revoke all on table public.%I from public,anon,authenticated',bang);
  execute format('grant select on table public.%I to authenticated',bang);
  execute format('drop policy if exists chi_du_lieu_cua_minh on public.%I',bang);
  execute format('create policy chi_du_lieu_cua_minh on public.%I for select to authenticated using ((select auth.uid())=nguoi_dung_id)',bang);
 end loop;
 -- Mọi thay đổi dữ liệu học phải đi qua giao dịch có kiểm tra phiên bản.
 foreach bang in array array['cai_dat_nguoi_dung','so_tu','tu_vung','tien_trinh_hoc','lich_su_on_tap','thong_ke_hoc_cu'] loop
  execute format('revoke insert,update,delete on table public.%I from authenticated',bang);
 end loop;
end;
$rls$;

-- Quyền truy cập luôn lấy từ auth.uid(). ID client chỉ dùng để chặn đổi
-- phiên đăng nhập giữa lúc tạo yêu cầu và lúc request lấy JWT; không cấp quyền.
drop function if exists public.tu_tu_luu_du_lieu(bigint,jsonb,jsonb,jsonb);
drop function if exists public.tu_tu_tai_du_lieu();
create or replace function public.tu_tu_tai_du_lieu(p_revision bigint default null,p_event_ids uuid[] default '{}'::uuid[],p_nguoi_dung_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare uid uuid := auth.uid(); result jsonb; revision bigint; acknowledged jsonb;
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if p_nguoi_dung_id is not null and p_nguoi_dung_id<>uid then raise exception 'AUTH_ACCOUNT_CHANGED' using errcode='42501'; end if;
 insert into public.trang_thai_dong_bo(nguoi_dung_id) values(uid) on conflict do nothing;
 select phien_ban into revision from public.trang_thai_dong_bo where nguoi_dung_id=uid;
 select coalesce(jsonb_agg(luot_on_id),'[]'::jsonb) into acknowledged from public.lich_su_on_tap where nguoi_dung_id=uid and luot_on_id=any(p_event_ids);
 if p_revision is not null and p_revision=revision then return jsonb_build_object('revision',revision,'unchanged',true,'acknowledged',acknowledged); end if;
 select jsonb_build_object(
  'acknowledged',acknowledged,
  'revision',m.phien_ban,
  'data',jsonb_build_object(
   'days',coalesce((select jsonb_agg(jsonb_build_object('date',s.ngay_so::text,'words',coalesce((
    select jsonb_agg(t.noi_dung_bo_sung || jsonb_build_object(
     'id',t.tu_vung_id,'en',t.tu_tieng_anh,'vi',t.nghia_tieng_viet,
     'example',t.vi_du_tieng_anh,'exampleVi',t.dich_vi_du,
     'remembered',coalesce(p.da_nho,false),'reviewLevel',coalesce(p.cap_do_on,0),'reviewCount',coalesce(p.so_lan_on,0)
    ) || jsonb_strip_nulls(jsonb_build_object('lastReviewed',p.ngay_on_gan_nhat::text,'nextReview',p.ngay_on_tiep::text)) order by t.tao_luc,t.tu_vung_id)
    from public.tu_vung t left join public.tien_trinh_hoc p on p.nguoi_dung_id=t.nguoi_dung_id and p.tu_vung_id=t.tu_vung_id
    where t.nguoi_dung_id=uid and t.ngay_so=s.ngay_so
   ),'[]'::jsonb)) order by s.ngay_so desc) from public.so_tu s where s.nguoi_dung_id=uid),'[]'::jsonb),
   'preferences',coalesce((select jsonb_build_object('goal',c.muc_tieu_moi_ngay,'rate',c.toc_do_doc,'autoSpeak',c.tu_dong_doc,'reverse',c.hien_tieng_viet_truoc,'theme',case c.giao_dien when 'sang' then 'light' when 'he_thong' then 'system' else 'dark' end) from public.cai_dat_nguoi_dung c where c.nguoi_dung_id=uid),'{"goal":10,"rate":0.85,"autoSpeak":false,"reverse":false,"theme":"dark"}'::jsonb),
   'topics',coalesce((select jsonb_object_agg(p.chu_de_id||':'||p.tu_trong_bo_id,case when p.ngay_on_gan_nhat is null and p.so_lan_on=0 then to_jsonb(p.da_nho) else jsonb_build_object('remembered',p.da_nho,'reviewLevel',p.cap_do_on,'reviewCount',p.so_lan_on)||jsonb_strip_nulls(jsonb_build_object('lastReviewed',p.ngay_on_gan_nhat::text,'nextReview',p.ngay_on_tiep::text)) end) from public.tien_trinh_chu_de p where p.nguoi_dung_id=uid),'{}'::jsonb),
   'history',m.tra_cuu_gan_day
  ),
  'activity',coalesce((select jsonb_object_agg(a.ngay_hoc::text,jsonb_build_object('reviewed',a.so_luot_on,'correct',a.so_luot_da_nho)) from public.thong_ke_hoc_theo_ngay a where a.nguoi_dung_id=uid),'{}'::jsonb),
  'baseline',coalesce((select jsonb_object_agg(a.ngay_hoc::text,jsonb_build_object('reviewed',a.so_luot_on,'correct',a.so_luot_da_nho)) from public.thong_ke_hoc_cu a where a.nguoi_dung_id=uid),'{}'::jsonb)
 ) into result from public.trang_thai_dong_bo m where m.nguoi_dung_id=uid;
 return result;
end;
$fn$;

create or replace function public.tu_tu_luu_du_lieu(p_revision bigint,p_data jsonb,p_baseline jsonb default '{}'::jsonb,p_events jsonb default '[]'::jsonb,p_nguoi_dung_id uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
 uid uuid := auth.uid(); revision bigint; d jsonb; w jsonb; e jsonb; pref jsonb;
 ids text[] := array[]::text[]; dates date[] := array[]::date[]; item record; target_word text; total integer := 0; previous_count integer; new_events integer;
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if p_nguoi_dung_id is not null and p_nguoi_dung_id<>uid then raise exception 'AUTH_ACCOUNT_CHANGED' using errcode='42501'; end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_data) is distinct from 'object'
  or jsonb_typeof(p_data->'days') is distinct from 'array' or jsonb_array_length(p_data->'days')>5000
  or jsonb_typeof(p_data->'preferences') is distinct from 'object'
  or jsonb_typeof(p_data->'topics') is distinct from 'object'
  or jsonb_typeof(p_data->'history') is distinct from 'array' or jsonb_array_length(p_data->'history')>8
  or jsonb_typeof(p_baseline) is distinct from 'object' or jsonb_typeof(p_events) is distinct from 'array'
  or jsonb_array_length(p_events)>50000 or pg_column_size(p_data)>20000000
 then raise exception 'INVALID_SYNC_DATA' using errcode='22023'; end if;
 insert into public.trang_thai_dong_bo(nguoi_dung_id) values(uid) on conflict do nothing;
 select phien_ban into revision from public.trang_thai_dong_bo where nguoi_dung_id=uid for update;
 if revision<>p_revision then return jsonb_build_object('conflict',true); end if;

 for d in select value from jsonb_array_elements(p_data->'days') loop
  if jsonb_typeof(d->'words') is distinct from 'array' or (d->>'date') is null then raise exception 'INVALID_DAY'; end if;
  if (d->>'date')::date=any(dates) then raise exception 'DUPLICATE_DAY'; end if;
  dates:=array_append(dates,(d->>'date')::date);
  for w in select value from jsonb_array_elements(d->'words') loop
   total:=total+1;
   if total>50000 or (w->>'id') is null or w->>'id'=any(ids) or jsonb_typeof(w->'remembered') is distinct from 'boolean' then raise exception 'INVALID_WORD'; end if;
   ids:=array_append(ids,w->>'id');
  end loop;
 end loop;
 -- Xóa thành viên đã bị xóa ở client, trước khi chèn để không vướng tên trùng.
 -- Lịch sử ôn vẫn giữ nguyên và khóa ngoại được đặt NULL khi xóa thẻ.
 delete from public.tu_vung where nguoi_dung_id=uid and not(tu_vung_id=any(ids));
 delete from public.so_tu where nguoi_dung_id=uid and not(ngay_so=any(dates));
 for d in select value from jsonb_array_elements(p_data->'days') loop
  insert into public.so_tu(nguoi_dung_id,ngay_so) values(uid,(d->>'date')::date) on conflict do nothing;
  for w in select value from jsonb_array_elements(d->'words') loop
   insert into public.tu_vung(nguoi_dung_id,tu_vung_id,ngay_so,tu_tieng_anh,nghia_tieng_viet,vi_du_tieng_anh,dich_vi_du,noi_dung_bo_sung)
   values(uid,w->>'id',(d->>'date')::date,w->>'en',w->>'vi',coalesce(w->>'example',''),coalesce(w->>'exampleVi',''),w-array['id','en','vi','example','exampleVi','remembered','reviewLevel','reviewCount','lastReviewed','nextReview'])
   on conflict(nguoi_dung_id,tu_vung_id) do update set ngay_so=excluded.ngay_so,tu_tieng_anh=excluded.tu_tieng_anh,nghia_tieng_viet=excluded.nghia_tieng_viet,vi_du_tieng_anh=excluded.vi_du_tieng_anh,dich_vi_du=excluded.dich_vi_du,noi_dung_bo_sung=excluded.noi_dung_bo_sung;
   select coalesce(so_lan_on,0) into previous_count from public.tien_trinh_hoc where nguoi_dung_id=uid and tu_vung_id=w->>'id';
   select count(distinct ev.value->>'id')::integer into new_events from jsonb_array_elements(p_events) as ev(value)
    where ev.value->>'topic' is null and ev.value->>'wordId'=w->>'id'
    and not exists(select 1 from public.lich_su_on_tap h where h.nguoi_dung_id=uid and h.luot_on_id=(ev.value->>'id')::uuid);
   insert into public.tien_trinh_hoc(nguoi_dung_id,tu_vung_id,da_nho,cap_do_on,ngay_on_gan_nhat,ngay_on_tiep,so_lan_on)
   values(uid,w->>'id',(w->>'remembered')::boolean,case when (w->>'remembered')::boolean then coalesce((w->>'reviewLevel')::smallint,0) else 0 end,(w->>'lastReviewed')::date,(w->>'nextReview')::date,greatest(coalesce(previous_count,0)+new_events,coalesce((w->>'reviewCount')::integer,0)))
   on conflict(nguoi_dung_id,tu_vung_id) do update set da_nho=excluded.da_nho,cap_do_on=excluded.cap_do_on,ngay_on_gan_nhat=excluded.ngay_on_gan_nhat,ngay_on_tiep=excluded.ngay_on_tiep,so_lan_on=excluded.so_lan_on;
  end loop;
 end loop;
 pref:=p_data->'preferences';
 if pref->>'theme' not in ('dark','light','system') then raise exception 'INVALID_THEME'; end if;
 insert into public.cai_dat_nguoi_dung(nguoi_dung_id,muc_tieu_moi_ngay,toc_do_doc,tu_dong_doc,hien_tieng_viet_truoc,giao_dien)
 values(uid,(pref->>'goal')::smallint,(pref->>'rate')::numeric,(pref->>'autoSpeak')::boolean,(pref->>'reverse')::boolean,case pref->>'theme' when 'light' then 'sang' when 'system' then 'he_thong' else 'toi' end)
 on conflict(nguoi_dung_id) do update set muc_tieu_moi_ngay=excluded.muc_tieu_moi_ngay,toc_do_doc=excluded.toc_do_doc,tu_dong_doc=excluded.tu_dong_doc,hien_tieng_viet_truoc=excluded.hien_tieng_viet_truoc,giao_dien=excluded.giao_dien;
 delete from public.tien_trinh_chu_de where nguoi_dung_id=uid and not(p_data->'topics' ? (chu_de_id||':'||tu_trong_bo_id));
 for item in select key,value from jsonb_each(p_data->'topics') loop
  if item.key !~ '^[a-z0-9-]+:tw-[a-z0-9-]+$' or jsonb_typeof(item.value) not in ('boolean','object') then raise exception 'INVALID_TOPIC'; end if;
  if jsonb_typeof(item.value)='boolean' then
   insert into public.tien_trinh_chu_de(nguoi_dung_id,chu_de_id,tu_trong_bo_id,da_nho)
   values(uid,split_part(item.key,':',1),split_part(item.key,':',2),item.value::text::boolean)
   on conflict(nguoi_dung_id,chu_de_id,tu_trong_bo_id) do update set da_nho=excluded.da_nho,
    cap_do_on=case when excluded.da_nho then public.tien_trinh_chu_de.cap_do_on else 0 end,
    ngay_on_tiep=case when excluded.da_nho then public.tien_trinh_chu_de.ngay_on_tiep else null end,
    cap_nhat_luc=now();
  else
   if jsonb_typeof(item.value->'remembered') is distinct from 'boolean' or jsonb_typeof(item.value->'reviewLevel') is distinct from 'number' or jsonb_typeof(item.value->'reviewCount') is distinct from 'number'
    or (item.value->>'reviewLevel')::integer not between 0 and 5 or (item.value->>'reviewCount')::integer<0
    or not (item.value->>'remembered')::boolean and (item.value->>'reviewLevel')::integer<>0
   then raise exception 'INVALID_TOPIC_SCHEDULE'; end if;
   select so_lan_on into previous_count from public.tien_trinh_chu_de where nguoi_dung_id=uid and chu_de_id=split_part(item.key,':',1) and tu_trong_bo_id=split_part(item.key,':',2);
   select count(distinct ev.value->>'id')::integer into new_events from jsonb_array_elements(p_events) as ev(value)
    where ev.value->>'topic'=split_part(item.key,':',1) and ev.value->>'wordId'=split_part(item.key,':',2)
    and not exists(select 1 from public.lich_su_on_tap h where h.nguoi_dung_id=uid and h.luot_on_id=(ev.value->>'id')::uuid);
   insert into public.tien_trinh_chu_de(nguoi_dung_id,chu_de_id,tu_trong_bo_id,da_nho,cap_do_on,so_lan_on,ngay_on_gan_nhat,ngay_on_tiep)
   values(uid,split_part(item.key,':',1),split_part(item.key,':',2),(item.value->>'remembered')::boolean,(item.value->>'reviewLevel')::smallint,greatest(coalesce(previous_count,0)+new_events,(item.value->>'reviewCount')::integer),(item.value->>'lastReviewed')::date,(item.value->>'nextReview')::date)
   on conflict(nguoi_dung_id,chu_de_id,tu_trong_bo_id) do update set da_nho=excluded.da_nho,cap_do_on=excluded.cap_do_on,so_lan_on=excluded.so_lan_on,ngay_on_gan_nhat=excluded.ngay_on_gan_nhat,ngay_on_tiep=excluded.ngay_on_tiep,cap_nhat_luc=now();
  end if;
 end loop;
 for item in select key,value from jsonb_each(p_baseline) loop
  insert into public.thong_ke_hoc_cu(nguoi_dung_id,ngay_hoc,so_luot_on,so_luot_da_nho)
  values(uid,item.key::date,(item.value->>'reviewed')::integer,(item.value->>'correct')::integer)
  on conflict(nguoi_dung_id,ngay_hoc) do update set so_luot_on=greatest(public.thong_ke_hoc_cu.so_luot_on,excluded.so_luot_on),so_luot_da_nho=greatest(public.thong_ke_hoc_cu.so_luot_da_nho,excluded.so_luot_da_nho);
 end loop;
 for e in select value from jsonb_array_elements(p_events) loop
  target_word:=null;
  if e->>'topic' is null then select tu_vung_id into target_word from public.tu_vung where nguoi_dung_id=uid and tu_vung_id=e->>'wordId'; end if;
  insert into public.lich_su_on_tap(nguoi_dung_id,luot_on_id,tu_vung_id,tu_da_on,che_do,da_nho,on_luc,ngay_hoc,chu_de_id)
  values(uid,(e->>'id')::uuid,target_word,e->>'word',e->>'mode',(e->>'known')::boolean,(e->>'at')::timestamptz,(e->>'date')::date,e->>'topic')
  on conflict(nguoi_dung_id,luot_on_id) do nothing;
 end loop;
 update public.trang_thai_dong_bo set phien_ban=revision+1,tra_cuu_gan_day=p_data->'history',cap_nhat_luc=now() where nguoi_dung_id=uid;
 return public.tu_tu_tai_du_lieu();
end;
$fn$;

revoke all on function public.tu_tu_tai_du_lieu(bigint,uuid[],uuid) from public,anon,authenticated;
revoke all on function public.tu_tu_luu_du_lieu(bigint,jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.tu_tu_tai_du_lieu(bigint,uuid[],uuid) to authenticated;
grant execute on function public.tu_tu_luu_du_lieu(bigint,jsonb,jsonb,jsonb,uuid) to authenticated;
comment on function public.tu_tu_luu_du_lieu(bigint,jsonb,jsonb,jsonb,uuid) is 'Giao dịch dữ liệu học của auth.uid(); kiểm tra phiên bản để ngăn ghi đè từ thiết bị cũ.';
notify pgrst,'reload schema';
commit;
