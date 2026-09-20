create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  asterisk_uid text unique,
  biz text not null,
  caller text,
  started_at timestamptz default now(),
  duration_sec int,
  transcript jsonb,
  summary text,
  intent text,
  followup text,
  outcome text,
  recording_path text
);
create index if not exists calls_biz_idx on calls (biz, started_at desc);
create table if not exists callbacks (
  id bigserial primary key, biz text, caller text, name text, phone text, topic text,
  created_at timestamptz default now(), done boolean default false
);
create table if not exists orders (
  id bigserial primary key, biz text, order_id text, customer_phone text, status text, eta text, items text
);
create unique index if not exists orders_biz_order_idx on orders (biz, order_id);
insert into orders (biz, order_id, customer_phone, status, eta, items) values
 ('biz1','1001','01700000001','শিপিংয়ে আছে','আগামীকাল','টি শার্ট ২টি'),
 ('biz1','1002','01700000002','প্যাকিং হচ্ছে','২ দিন','জুতা ১ জোড়া'),
 ('biz1','1003','01700000003','ডেলিভারি হয়েছে','','ব্যাগ ১টি')
on conflict do nothing;
