-- GTF (Gelecek Tahmin Fonu) — Phase 1 schema: profiles + predictions
-- Applied via Supabase SQL Editor. Keep this file as the source of truth;
-- future changes should be added as new migration files in this folder.

-- PROFILES: one row per authenticated user, auto-created on signup.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  points integer not null default 1000,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Yeni Kullanıcı')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PREDICTIONS: the core content type of the app.
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'genel',
  -- Public teaser, always visible (shown before the seal opens).
  title text not null,
  -- The actual prediction text, hidden from everyone (including the author)
  -- until event_date passes / status moves to verified_*.
  sealed_content text not null,
  image_url text,
  stake_points integer not null default 0,
  status text not null default 'open'
    check (status in ('open', 'sealed', 'verified_correct', 'verified_incorrect')),
  event_date timestamptz,
  sealed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.predictions enable row level security;

create policy "Predictions are viewable by everyone"
  on public.predictions for select
  using (true);

create policy "Users can create own predictions"
  on public.predictions for insert
  with check (auth.uid() = author_id);

create policy "Users can update own predictions"
  on public.predictions for update
  using (auth.uid() = author_id);

create index predictions_author_id_idx on public.predictions (author_id);
create index predictions_category_idx on public.predictions (category);
create index predictions_created_at_idx on public.predictions (created_at desc);

-- MESSAGES — simple 1:1 direct messaging (no separate conversations table;
-- a "conversation" is just the set of messages between two users).
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

create policy "Users can view their own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on public.messages for update
  using (auth.uid() = recipient_id);

create index messages_sender_recipient_idx on public.messages (sender_id, recipient_id, created_at desc);
create index messages_recipient_sender_idx on public.messages (recipient_id, sender_id, created_at desc);

alter publication supabase_realtime add table public.messages;

-- AVATARS storage bucket — public read, owner-scoped write.
-- Files are stored at {user_id}/{filename}.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- IMPORTANT: tables created directly via the SQL Editor do NOT automatically
-- get PostgREST role grants (unlike tables created through the Table Editor
-- UI). Without these, every request fails with "permission denied for table
-- ..." even though RLS policies are correct. Always run this after creating
-- new tables.
grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.predictions to anon, authenticated;
grant insert, update on public.predictions to authenticated;

grant select, insert, update on public.messages to authenticated;

-- GROUPS
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'genel',
  cover_image_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;
create policy "Groups are viewable by everyone" on public.groups for select using (true);
create policy "Authenticated users can create groups" on public.groups for insert with check (auth.uid() = created_by);
create policy "Owners can update their groups" on public.groups for update using (auth.uid() = created_by);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;
create policy "Memberships are viewable by everyone" on public.group_members for select using (true);
create policy "Users can join groups" on public.group_members for insert with check (auth.uid() = user_id);
create policy "Users can leave groups" on public.group_members for delete using (auth.uid() = user_id);

grant select on public.groups to anon, authenticated;
grant insert, update on public.groups to authenticated;
grant select on public.group_members to anon, authenticated;
grant insert, delete on public.group_members to authenticated;

-- FOLLOWS
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;
create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

-- Time-capsule predictions: private, personal-only, excluded from public feed.
alter table public.predictions add column is_private boolean not null default false;

-- LIKES
create table public.prediction_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prediction_id)
);

alter table public.prediction_likes enable row level security;
create policy "Likes are viewable by everyone" on public.prediction_likes for select using (true);
create policy "Users can like" on public.prediction_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.prediction_likes for delete using (auth.uid() = user_id);

grant select on public.prediction_likes to anon, authenticated;
grant insert, delete on public.prediction_likes to authenticated;

-- SAVES (bookmarks)
create table public.prediction_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, prediction_id)
);

alter table public.prediction_saves enable row level security;
create policy "Users can view their own saves" on public.prediction_saves for select using (auth.uid() = user_id);
create policy "Users can save" on public.prediction_saves for insert with check (auth.uid() = user_id);
create policy "Users can unsave" on public.prediction_saves for delete using (auth.uid() = user_id);

grant select on public.prediction_saves to authenticated;
grant insert, delete on public.prediction_saves to authenticated;

-- COMMENTS
create table public.prediction_comments (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.prediction_comments enable row level security;
create policy "Comments are viewable by everyone" on public.prediction_comments for select using (true);
create policy "Users can comment" on public.prediction_comments for insert with check (auth.uid() = author_id);
create policy "Users can delete own comments" on public.prediction_comments for delete using (auth.uid() = author_id);

grant select on public.prediction_comments to anon, authenticated;
grant insert, delete on public.prediction_comments to authenticated;

create index prediction_comments_prediction_id_idx on public.prediction_comments (prediction_id, created_at);

-- SECURITY FIX: private (time-capsule) predictions were only hidden from the
-- public feed by a client-side filter; the RLS policy still let anyone read
-- them directly via the API. Restrict at the database level.
drop policy "Predictions are viewable by everyone" on public.predictions;
create policy "Predictions are viewable by everyone or owner" on public.predictions
  for select using (is_private = false or auth.uid() = author_id);

-- COVER PHOTOS (profile cover + group cover, shared bucket).
alter table public.profiles add column cover_photo_url text;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "Cover images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'covers');

-- Path convention: profile/{user_id}/... — only the owning user may write.
create policy "Users can upload their own profile cover"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'profile'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
create policy "Users can update their own profile cover"
  on storage.objects for update
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'profile'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Path convention: group/{group_id}/... — only that group's creator may write.
create policy "Group creators can upload group cover"
  on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and exists (
      select 1 from public.groups g
      where g.id::text = (storage.foldername(name))[2] and g.created_by = auth.uid()
    )
  );
create policy "Group creators can update group cover"
  on storage.objects for update
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and exists (
      select 1 from public.groups g
      where g.id::text = (storage.foldername(name))[2] and g.created_by = auth.uid()
    )
  );

-- BLOCKS
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;
create policy "Users can view their own blocks" on public.blocks for select using (auth.uid() = blocker_id);
create policy "Users can block others" on public.blocks for insert with check (auth.uid() = blocker_id);
create policy "Users can unblock" on public.blocks for delete using (auth.uid() = blocker_id);

grant select on public.blocks to authenticated;
grant insert, delete on public.blocks to authenticated;

-- Security-definer check so either side of a block can be detected (e.g. to
-- stop messaging) without exposing the underlying block list to either user.
create or replace function public.is_blocked(other_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = auth.uid() and blocked_id = other_user_id)
       or (blocker_id = other_user_id and blocked_id = auth.uid())
  );
$$;

grant execute on function public.is_blocked(uuid) to authenticated;

-- Also stop message inserts to/from a blocked party at the DB level, not
-- just the client UI.
drop policy "Users can send messages" on public.messages;
create policy "Users can send messages" on public.messages for insert
  with check (auth.uid() = sender_id and not public.is_blocked(recipient_id));

-- Lets a viewer exclude both directions of blocking (people I blocked, and
-- people who blocked me) from feeds/suggestions without exposing the raw
-- blocks table to them.
create or replace function public.blocked_user_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$$;

grant execute on function public.blocked_user_ids() to authenticated;

-- PRIVATE ACCOUNTS: follow requests require approval, server-enforced (the
-- trigger sets status regardless of what the client sends, so a client can't
-- force-follow a private account).
alter table public.profiles add column is_private boolean not null default false;

alter table public.follows add column status text not null default 'accepted' check (status in ('pending','accepted'));

create or replace function public.set_follow_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.following_id and is_private = true) then
    new.status := 'pending';
  else
    new.status := 'accepted';
  end if;
  return new;
end;
$$;

drop trigger if exists follows_set_status on public.follows;
create trigger follows_set_status
before insert on public.follows
for each row execute function public.set_follow_status();

create policy "Recipients can respond to follow requests" on public.follows
  for update using (auth.uid() = following_id) with check (auth.uid() = following_id);

grant update on public.follows to authenticated;

drop policy "Predictions are viewable by everyone or owner" on public.predictions;
create policy "Predictions respect private accounts" on public.predictions
  for select using (
    (is_private = false or auth.uid() = author_id)
    and (
      auth.uid() = author_id
      or not exists (select 1 from public.profiles pr where pr.id = predictions.author_id and pr.is_private = true)
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = predictions.author_id and f.status = 'accepted'
      )
    )
  );

-- USER SETTINGS: single jsonb blob per user for notification/content prefs
-- (Ayarlar screen). Kept separate from profiles.is_private since that field
-- needs to be readable cross-user; this blob is private to its owner.
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "Users can view their own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.user_settings to authenticated;

-- PROFILE ACCENT COLOR: null = use the app's default theme primary. Applied
-- app-wide (overrides --color-primary) via a small effect in App.jsx, not
-- just previewed on the profile-edit screen.
alter table public.profiles add column profile_color text;

-- Blocking now enforced at the predictions SELECT level too, so it applies
-- everywhere (Kesfet, TahminKaydi direct links, search) not just the one
-- screen that happened to filter client-side.
drop policy "Predictions respect private accounts" on public.predictions;
create policy "Predictions respect private accounts and blocks" on public.predictions
  for select using (
    (is_private = false or auth.uid() = author_id)
    and (
      auth.uid() = author_id
      or not exists (select 1 from public.profiles pr where pr.id = predictions.author_id and pr.is_private = true)
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = predictions.author_id and f.status = 'accepted'
      )
    )
    and not public.is_blocked(predictions.author_id)
  );

-- Also stop a blocked relationship from liking/commenting on each other's
-- predictions.
drop policy "Users can like" on public.prediction_likes;
create policy "Users can like" on public.prediction_likes for insert
  with check (
    auth.uid() = user_id
    and not public.is_blocked((select author_id from public.predictions where id = prediction_id))
  );

drop policy "Users can comment" on public.prediction_comments;
create policy "Users can comment" on public.prediction_comments for insert
  with check (
    auth.uid() = author_id
    and not public.is_blocked((select author_id from public.predictions where id = prediction_id))
  );

-- GROUP-SCOPED PREDICTIONS: a "Tahmin" created from inside a group (Grup
-- Detayı > Tahmin oluştur) is tagged with that group so members see it in
-- the group's own feed instead of (or in addition to) the public one.
-- Null = unchanged existing behavior (personal/public prediction, or a
-- private time-capsule — the client never sets group_id on those, so a
-- capsule's "stays only mine" guarantee is untouched by the policy below).
alter table public.predictions add column group_id uuid references public.groups(id) on delete cascade;
create index predictions_group_id_idx on public.predictions (group_id, created_at);

drop policy "Predictions respect private accounts and blocks" on public.predictions;
create policy "Predictions respect private accounts, blocks and groups" on public.predictions
  for select using (
    (
      (is_private = false or auth.uid() = author_id)
      and (
        auth.uid() = author_id
        or not exists (select 1 from public.profiles pr where pr.id = predictions.author_id and pr.is_private = true)
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = predictions.author_id and f.status = 'accepted'
        )
      )
      and not public.is_blocked(predictions.author_id)
    )
    or (
      predictions.group_id is not null
      and exists (
        select 1 from public.group_members gm
        where gm.group_id = predictions.group_id and gm.user_id = auth.uid()
      )
    )
  );

-- ENGAGEMENT MECHANICS (5-7 of 7): daily streak, referrals, dispute flags.

-- 5) Daily streak. last_active_date is the last calendar day (UTC) a
-- session loaded this profile; streak_count is consecutive days including
-- today. Bumped client-side on every session start — see bumpStreak() in
-- src/contexts/AuthContext.jsx. Purely motivational, not anti-cheat, so a
-- client-side update is fine here (unlike the verification mechanic).
alter table public.profiles add column last_active_date date;
alter table public.profiles add column streak_count integer not null default 0;

-- 6) Referrals. Invite links pass along a plain username (never a raw id —
-- see src/screens/Giris.jsx), resolved to a profile id here so the trigger
-- stays a single lookup. Unknown/empty username just resolves to no
-- referrer; signup is never blocked by a bad invite code.
alter table public.profiles add column referred_by uuid references public.profiles(id) on delete set null;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
begin
  select id into referrer_id from public.profiles
  where username = new.raw_user_meta_data->>'referred_by_username';

  insert into public.profiles (id, username, display_name, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Yeni Kullanıcı'),
    referrer_id
  );

  -- +100 to both sides, once, at signup.
  if referrer_id is not null then
    update public.profiles set points = points + 100 where id = referrer_id;
    update public.profiles set points = points + 100 where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 7) Disputes: anyone but the author can flag a resolved prediction. No
-- auto-resolution or moderation queue yet — the count is shown plainly next
-- to the result (src/screens/TahminKaydi.jsx) so viewers judge for
-- themselves. This is a reputational signal, not an enforcement mechanism —
-- see the verification-mechanic plan discussion (Option A, near-term step;
-- Option B — real independent verification — is separate, larger scope).
create table public.prediction_disputes (
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prediction_id, user_id)
);

alter table public.prediction_disputes enable row level security;
create policy "Disputes are viewable by everyone" on public.prediction_disputes for select using (true);
create policy "Users can dispute others' resolved predictions" on public.prediction_disputes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.predictions p
      where p.id = prediction_id
        and p.author_id <> auth.uid()
        and p.status in ('verified_correct', 'verified_incorrect')
    )
  );
create policy "Users can retract their own dispute" on public.prediction_disputes for delete using (auth.uid() = user_id);

grant select on public.prediction_disputes to anon, authenticated;
grant insert, delete on public.prediction_disputes to authenticated;

-- FIREVIBE SCREEN COVERAGE: the remaining columns/tables needed for the
-- newly-built settings screens (E-posta ve Telefon, Hesabı Dondur, Mesaj
-- İstekleri, Etiketleme ve Bahsetmeler, Hassas İçerik Kontrolü). Every
-- other FireVibe screen this pass added (Yardım Merkezi, Topluluk
-- Kuralları, İlk Kullanım Rehberi, Arama Geçmişi, Aktif Oturumlar, Şifre
-- Değiştir, İki Aşamalı Doğrulama, Beğeniler, Tahmin Görünürlüğü, Bölge ve
-- Tarih Biçimi) works entirely off columns/tables that already exist —
-- nothing else to run for those.

-- E-posta ve Telefon: a plain contact field, not SMS-verified (no SMS
-- provider configured on this project).
alter table public.profiles add column phone text;

-- Hesabı Dondur: logging back in is the reactivation action (see
-- AuthContext's unfreezeIfNeeded), so frozen_until is cleared automatically
-- on next session load rather than needing its own "reactivate" flow.
alter table public.profiles add column frozen_until timestamptz;
alter table public.profiles add column freeze_reason text;

drop policy "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone unless frozen" on public.profiles
  for select using (frozen_until is null or frozen_until < now() or auth.uid() = id);

-- Mesaj İstekleri: who can message you. Enforced at the RLS level (not
-- just a cosmetic setting) — see the messages insert policy below.
alter table public.profiles add column message_permission text not null default 'following'
  check (message_permission in ('everyone', 'following', 'none'));

drop policy "Users can send messages" on public.messages;
create policy "Users can send messages respecting recipient preference" on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and (
      auth.uid() = recipient_id
      or exists (
        select 1 from public.profiles r
        where r.id = recipient_id
          and (
            r.message_permission = 'everyone'
            or (
              r.message_permission = 'following'
              and exists (
                select 1 from public.follows f
                where f.follower_id = recipient_id and f.following_id = auth.uid() and f.status = 'accepted'
              )
            )
          )
      )
    )
  );

-- Etiketleme ve Bahsetmeler: @username mentions in comments only (no
-- mention parsing in prediction text or group content yet — see
-- TahminKaydi.jsx's createMentions()).
alter table public.profiles add column mention_permission text not null default 'everyone'
  check (mention_permission in ('everyone', 'following', 'none'));

create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid references public.prediction_comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.mentions enable row level security;
create policy "Mentions are viewable by everyone" on public.mentions for select using (true);
create policy "Users can create mentions when commenting" on public.mentions for insert with check (auth.uid() = author_id);

grant select on public.mentions to anon, authenticated;
grant insert on public.mentions to authenticated;

-- Hassas İçerik Kontrolü: self-declared by the author at creation time (no
-- automated moderation/image analysis exists), filtered client-side in
-- Anasayfa's feed query based on the viewer's own content_filter_level.
alter table public.predictions add column is_sensitive boolean not null default false;
alter table public.profiles add column content_filter_level text not null default 'standard'
  check (content_filter_level in ('less', 'standard', 'more'));

-- VERIFICATION MECHANIC, next step ("Option B-lite"): a real independent
-- AI/official-source check (full "Option B") needs a server-side function
-- calling an outside data source — this project has no Supabase CLI access
-- to deploy an Edge Function yet, so it can't be wired up today (see the
-- deployment-ready notes at the very end of this file for when it can be).
-- What ships now instead: the author can optionally cite a source (link
-- and/or a short note) at the moment they mark a sealed prediction
-- correct/incorrect. It's still self-reported, but a bare claim next to a
-- checkable citation is a real accountability improvement, and it gives
-- disputers (see prediction_disputes above) something concrete to weigh.
alter table public.predictions add column evidence_note text;
alter table public.predictions add column evidence_url text;

-- GROUP ADMIN TOOLING: a group's creator is seeded as its first admin (see
-- Gruplar.jsx's CreateGroupModal), but until now no one — not even that
-- admin — could remove a member, promote/demote roles, or edit the group's
-- name/description/category after creation. All three are real gaps for
-- "a working social product": a spam member or a stale description had no
-- fix. This grants any current admin of a group (which always includes at
-- least its creator) those three abilities.
drop policy "Owners can update their groups" on public.groups;
create policy "Admins can update their groups" on public.groups for update
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );

create policy "Admins can remove other members" on public.group_members for delete
  using (
    exists (
      select 1 from public.group_members admin_check
      where admin_check.group_id = group_members.group_id
        and admin_check.user_id = auth.uid()
        and admin_check.role = 'admin'
    )
  );

create policy "Admins can change member roles" on public.group_members for update
  using (
    exists (
      select 1 from public.group_members admin_check
      where admin_check.group_id = group_members.group_id
        and admin_check.user_id = auth.uid()
        and admin_check.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.group_members admin_check
      where admin_check.group_id = group_members.group_id
        and admin_check.user_id = auth.uid()
        and admin_check.role = 'admin'
    )
  );

grant update on public.group_members to authenticated;

-- PREDICTION MEDIA: one optional image attached at creation time (before
-- the prediction is sealed — like the title, it's then immutable). Same
-- public-bucket-with-owner-scoped-path pattern as the existing `covers`
-- bucket above.
alter table public.predictions add column media_url text;

insert into storage.buckets (id, name, public)
values ('prediction-media', 'prediction-media', true)
on conflict (id) do nothing;

create policy "Prediction media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'prediction-media');

-- Path convention: {author_id}/... — only the uploading user may write.
create policy "Users can upload their own prediction media"
  on storage.objects for insert
  with check (
    bucket_id = 'prediction-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SECURITY REVIEW: several UPDATE policies above have no WITH CHECK, which
-- only restricts which ROWS an update can touch, not which COLUMNS change
-- within an allowed row. Worst finding: "Users can update own profile"
-- (very top of this file) lets any signed-in user set their OWN `points`
-- to any value via a raw REST call — e.g.
-- `supabase.from('profiles').update({points: 999999999})` — trivially
-- topping Liderlik Tablosu, since nothing ever validated that points only
-- change via a correct/honest-close verification or a referral. Second
-- finding: predictions/messages UPDATE policies let an author rewrite a
-- sealed prediction's title/content/status or a recipient rewrite a
-- message's content after the fact, directly contradicting the
-- immutability TahminKaydi.jsx's UI prominently promises ("İçerik
-- kaydedildi ve değiştirilemez"). RLS can't express "this column may
-- never change" — that needs a trigger, so all of this is doable with
-- what already exists (no new infra, unlike the Edge Function items
-- below).

-- Points can now ONLY change through verify_prediction() below, which
-- itself checks caller/state server-side instead of trusting the client's
-- claimed reward. Legitimate points writes (this function, and the
-- referral bonus in handle_new_user() below) set a transaction-local flag
-- to get past the trigger; a raw client update never sets it.
create or replace function public.protect_profile_integrity()
returns trigger as $$
begin
  if old.id is distinct from new.id or old.created_at is distinct from new.created_at then
    raise exception 'Bu alanlar değiştirilemez.';
  end if;
  if old.points is distinct from new.points
     and coalesce(current_setting('gtf.allow_points_write', true), 'off') <> 'on' then
    raise exception 'Puan doğrudan değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_integrity on public.profiles;
create trigger profiles_integrity
  before update on public.profiles
  for each row execute function public.protect_profile_integrity();

-- Re-run with the same referral logic as before, just wrapping both
-- points writes in the new flag so profiles_integrity lets them through.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
begin
  select id into referrer_id from public.profiles
  where username = new.raw_user_meta_data->>'referred_by_username';

  insert into public.profiles (id, username, display_name, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Yeni Kullanıcı'),
    referrer_id
  );

  if referrer_id is not null then
    perform set_config('gtf.allow_points_write', 'on', true);
    update public.profiles set points = points + 100 where id = referrer_id;
    update public.profiles set points = points + 100 where id = new.id;
    perform set_config('gtf.allow_points_write', 'off', true);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- The only server-validated way to resolve a sealed prediction: checks
-- ownership, current status, and that the reveal date has actually
-- passed itself (rather than trusting the client's canVerify check), then
-- awards the reward and records the optional evidence atomically. See
-- handleVerify() in src/screens/TahminKaydi.jsx — it calls this first and
-- only falls back to the old direct-update path if this function doesn't
-- exist yet (migration not run).
create or replace function public.verify_prediction(
  p_prediction_id uuid,
  p_result text,
  p_evidence_note text default null,
  p_evidence_url text default null
)
returns void as $$
declare
  v_author_id uuid;
  v_status text;
  v_event_date timestamptz;
  v_reward integer;
  v_new_status text;
begin
  if p_result not in ('correct', 'incorrect') then
    raise exception 'Geçersiz sonuç.';
  end if;

  select author_id, status, event_date into v_author_id, v_status, v_event_date
  from public.predictions where id = p_prediction_id for update;

  if v_author_id is null then
    raise exception 'Tahmin bulunamadı.';
  end if;
  if v_author_id <> auth.uid() then
    raise exception 'Sadece tahminin sahibi sonucu işaretleyebilir.';
  end if;
  if v_status <> 'sealed' then
    raise exception 'Bu tahmin zaten sonuçlandırılmış veya henüz mühürlenmemiş.';
  end if;
  if v_event_date is not null and v_event_date > now() then
    raise exception 'Açılış zamanı henüz gelmedi.';
  end if;

  v_new_status := case when p_result = 'correct' then 'verified_correct' else 'verified_incorrect' end;
  v_reward := case when p_result = 'correct' then 50 else 5 end;

  update public.predictions
  set status = v_new_status,
      verified_at = now(),
      evidence_note = nullif(trim(coalesce(p_evidence_note, '')), ''),
      evidence_url = nullif(trim(coalesce(p_evidence_url, '')), '')
  where id = p_prediction_id;

  perform set_config('gtf.allow_points_write', 'on', true);
  update public.profiles set points = points + v_reward where id = auth.uid();
  perform set_config('gtf.allow_points_write', 'off', true);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.verify_prediction(uuid, text, text, text) to authenticated;

-- Content immutability: title/sealed_content/category/author_id/event_date
-- never change after a prediction exists (sealed or not), and a verified
-- result can't be re-marked. evidence_note/evidence_url are deliberately
-- excluded — verify_prediction() above is the only path that sets status
-- anyway, so this is redundant-but-cheap defense in depth for that path
-- and a hard block against a raw client update bypassing it entirely.
create or replace function public.protect_prediction_immutability()
returns trigger as $$
begin
  if old.title is distinct from new.title
    or old.sealed_content is distinct from new.sealed_content
    or old.category is distinct from new.category
    or old.author_id is distinct from new.author_id
    or old.event_date is distinct from new.event_date
    or old.is_private is distinct from new.is_private
    or old.created_at is distinct from new.created_at
  then
    raise exception 'Bu alanlar oluşturulduktan sonra değiştirilemez.';
  end if;
  if old.status in ('verified_correct', 'verified_incorrect') and new.status is distinct from old.status then
    raise exception 'Doğrulanmış bir tahminin sonucu değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists predictions_immutability on public.predictions;
create trigger predictions_immutability
  before update on public.predictions
  for each row execute function public.protect_prediction_immutability();

-- A message recipient could only ever legitimately set read_at.
create or replace function public.protect_message_immutability()
returns trigger as $$
begin
  if old.content is distinct from new.content
    or old.sender_id is distinct from new.sender_id
    or old.recipient_id is distinct from new.recipient_id
    or old.created_at is distinct from new.created_at
  then
    raise exception 'Bir mesajın içeriği değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_immutability on public.messages;
create trigger messages_immutability
  before update on public.messages
  for each row execute function public.protect_message_immutability();

-- A group's founder identity shouldn't be reassignable via a raw update
-- (the "Admins can update their groups" policy above only restricts which
-- ROWS an admin can touch, not which columns — without this, an admin
-- could rewrite created_by to hijack founder status).
create or replace function public.protect_group_ownership()
returns trigger as $$
begin
  if old.created_by is distinct from new.created_by
    or old.id is distinct from new.id
    or old.created_at is distinct from new.created_at
  then
    raise exception 'Bir grubun kurucusu değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists groups_ownership_immutable on public.groups;
create trigger groups_ownership_immutable
  before update on public.groups
  for each row execute function public.protect_group_ownership();

-- Same gap in this session's own new "Admins can change member roles"
-- policy: it restricts which membership rows an admin can update, but not
-- which columns — an admin of two groups could otherwise reassign a
-- member's group_id to transplant them into their other group without
-- that member's consent, or reassign user_id to hand the row to someone
-- else entirely. Only `role` (and joined_at) should ever be updatable.
create or replace function public.protect_group_membership_identity()
returns trigger as $$
begin
  if old.group_id is distinct from new.group_id or old.user_id is distinct from new.user_id then
    raise exception 'Bir üyeliğin grubu veya kullanıcısı değiştirilemez, sadece rolü.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists group_members_identity_immutable on public.group_members;
create trigger group_members_identity_immutable
  before update on public.group_members
  for each row execute function public.protect_group_membership_identity();

-- ─────────────────────────────────────────────────────────────────────────
-- NOT YET DEPLOYABLE FROM HERE: real independent verification (full
-- "Option B") and push notifications both need a Supabase Edge Function
-- (to safely hold an API key server-side / call FCM), which requires the
-- Supabase CLI logged in with a personal access token or Dashboard access
-- neither of which this environment has. When that access exists, the
-- concrete next steps are:
--   1. `supabase functions new verify-prediction` — calls an external
--      real-world data API (sports scores, election results, etc. depend
--      on the category) plus an LLM to compare it against sealed_content;
--      never call an LLM for this client-side (it would need to embed a
--      secret key in the bundle) or trust an LLM's own "knowledge" without
--      a live external source (hallucination risk on anything after its
--      training cutoff).
--   2. `supabase functions new send-push` + a `push_tokens` table (user_id,
--      token, platform) + `@capacitor/push-notifications` on the client +
--      a Postgres trigger (or a scheduled function) that calls it on new
--      follower/mention/comment/message/prediction-opened events. Needs a
--      Firebase project (Android) and an APNs key (iOS) first.
-- ─────────────────────────────────────────────────────────────────────────
