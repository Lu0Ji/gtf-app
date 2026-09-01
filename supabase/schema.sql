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

-- BUGFIX: group cover photo upload has apparently never actually worked —
-- "Group creators can upload group cover" (COVER PHOTOS section, near the
-- top of this file) rejects every real upload attempt with a bare RLS
-- denial (confirmed live tonight: 403 "new row violates row-level
-- security policy", no more specific detail available without direct DB
-- access to inspect further). The policy read correctly and mirrors the
-- proven-working profile-cover policy right above it in structure, so the
-- exact root cause is unclear — replacing the created_by-only check with
-- one via group_members (role = 'admin'), the same pattern already
-- confirmed working tonight for the admin-tooling policies below, kept
-- alongside the original creator check rather than instead of it.
drop policy if exists "Group creators can upload group cover" on storage.objects;
create policy "Group admins can upload group cover" on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and (
      exists (
        select 1 from public.group_members gm
        where gm.group_id::text = (storage.foldername(name))[2]
          and gm.user_id = auth.uid()
          and gm.role = 'admin'
      )
      or exists (
        select 1 from public.groups g
        where g.id::text = (storage.foldername(name))[2] and g.created_by = auth.uid()
      )
    )
  );

drop policy if exists "Group creators can update group cover" on storage.objects;
create policy "Group admins can update group cover" on storage.objects for update
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and (
      exists (
        select 1 from public.group_members gm
        where gm.group_id::text = (storage.foldername(name))[2]
          and gm.user_id = auth.uid()
          and gm.role = 'admin'
      )
      or exists (
        select 1 from public.groups g
        where g.id::text = (storage.foldername(name))[2] and g.created_by = auth.uid()
      )
    )
  );

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

-- ROZETLER v2: FireVibe's badge catalog was hand-expanded to 120 badges
-- across 4 tiers (Başlangıç/İstikrar/Ustalık/Efsane) — see
-- src/lib/badges.js for the full catalog and its criteria, all derived
-- from real, already-tracked activity (no new stats needed for the
-- criteria themselves). Two small additions needed for the parts of the
-- redesign that need real persistence:
--
-- 1) Real earn dates + "bu ay kazanılan" count. Badge status itself stays
--    computed live client-side (same as before) — this table just records
--    the first moment each badge was OBSERVED as earned, written
--    client-side the first time Rozetler notices a badge crossed its
--    threshold (see Rozetler.jsx). Honest limitation: a badge you already
--    qualified for before this shipped gets today's date as its "earned"
--    date, not your true historical achievement date — there's no
--    retroactive data to backfill from.
create table public.earned_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_slug text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_slug)
);

alter table public.earned_badges enable row level security;
create policy "Earned badges are viewable by everyone" on public.earned_badges for select using (true);
create policy "Users can record their own earned badges" on public.earned_badges for insert with check (auth.uid() = user_id);

grant select on public.earned_badges to anon, authenticated;
grant insert on public.earned_badges to authenticated;

-- "Profil vitrini" (pinning up to 3 badges to feature) is deliberately
-- NOT backed by a DB column — it's a per-device display preference (same
-- localStorage pattern as Arama Geçmişi), not something other users need
-- to see, so it doesn't need a migration at all.

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

-- ZORLUK PUANI + TOPLULUK OYLAMASI — the core-mechanic pass: (1) a rule-
-- based "is this actually a prediction" check happens client-side (see
-- lib/predictionCheck.js — no DB change needed for that piece), (2) every
-- prediction now gets a computed difficulty score/tier, whose multiplier
-- feeds into (3) a weighted community vote that can resolve a still-sealed
-- prediction the author never showed up for, or overturn one they got
-- wrong, instead of the pure self-report honor system this shipped with.

alter table public.predictions add column difficulty_score integer;
alter table public.predictions add column difficulty_tier text
  check (difficulty_tier in ('baslangic', 'istikrar', 'ustalik', 'efsane'));
alter table public.predictions add column disputed boolean not null default false;
alter table public.predictions add column resolved_by text check (resolved_by in ('author', 'community'));

-- Computed once, at insert, from two real signals — never recomputed
-- later, so a prediction's difficulty (and the multiplier it already paid
-- out at) can't drift after the fact:
--   1. Time horizon: the further out event_date is, the harder to call.
--      Saturates at 90 days (anything 3+ months out maxes this half).
--   2. This category's own accuracy rate so far, across all users: a
--      category people are historically often wrong about counts as
--      harder. Fewer than 5 resolved predictions in the category yet ->
--      not enough signal, use a neutral 50%.
-- Score 0-100, bucketed into the same 4 tiers Rozetler already uses
-- (Başlangıç/İstikrar/Ustalık/Efsane — see lib/badges.js's TIERS) so the
-- vocabulary stays one system instead of two parallel tier scales.
create or replace function public.compute_prediction_difficulty()
returns trigger as $$
declare
  v_days numeric;
  v_time_score numeric;
  v_cat_total integer;
  v_cat_correct integer;
  v_cat_accuracy numeric;
  v_cat_score numeric;
  v_score integer;
begin
  v_days := greatest(0, extract(epoch from (coalesce(new.event_date, new.created_at) - new.created_at)) / 86400.0);
  v_time_score := least(v_days / 90.0, 1) * 50;

  select count(*) filter (where status = 'verified_correct'),
         count(*) filter (where status in ('verified_correct', 'verified_incorrect'))
    into v_cat_correct, v_cat_total
    from public.predictions
    where category = new.category;

  if coalesce(v_cat_total, 0) < 5 then
    v_cat_accuracy := 50;
  else
    v_cat_accuracy := (v_cat_correct::numeric / v_cat_total) * 100;
  end if;
  v_cat_score := (100 - v_cat_accuracy) * 0.5;

  v_score := round(v_time_score + v_cat_score);
  new.difficulty_score := v_score;
  new.difficulty_tier := case
    when v_score <= 25 then 'baslangic'
    when v_score <= 50 then 'istikrar'
    when v_score <= 75 then 'ustalik'
    else 'efsane'
  end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists predictions_difficulty on public.predictions;
create trigger predictions_difficulty
  before insert on public.predictions
  for each row execute function public.compute_prediction_difficulty();

-- verify_prediction() replaced in place (same signature/grant) — same
-- ownership/state checks as before, just the reward is now
-- difficulty-weighted instead of a flat 50/5, and it records who resolved
-- it (matters once cast_prediction_vote() below can also resolve one).
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
  v_tier text;
  v_new_status text;
  v_multiplier numeric;
  v_reward integer;
begin
  if p_result not in ('correct', 'incorrect') then
    raise exception 'Geçersiz sonuç.';
  end if;

  select author_id, status, event_date, difficulty_tier
    into v_author_id, v_status, v_event_date, v_tier
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
  v_multiplier := case v_tier
    when 'istikrar' then 1.25
    when 'ustalik' then 1.75
    when 'efsane' then 2.5
    else 1.0
  end;
  v_reward := round((case when p_result = 'correct' then 50 else 5 end) * v_multiplier);

  update public.predictions
  set status = v_new_status,
      verified_at = now(),
      resolved_by = 'author',
      evidence_note = nullif(trim(coalesce(p_evidence_note, '')), ''),
      evidence_url = nullif(trim(coalesce(p_evidence_url, '')), '')
  where id = p_prediction_id;

  perform set_config('gtf.allow_points_write', 'on', true);
  update public.profiles set points = points + v_reward where id = auth.uid();
  perform set_config('gtf.allow_points_write', 'off', true);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.verify_prediction(uuid, text, text, text) to authenticated;

-- One vote per (prediction, voter) — re-voting updates it (see the RPC's
-- upsert) rather than stacking duplicate rows.
create table public.prediction_votes (
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('correct', 'incorrect')),
  created_at timestamptz not null default now(),
  primary key (prediction_id, voter_id)
);

alter table public.prediction_votes enable row level security;
create policy "Votes are viewable by everyone" on public.prediction_votes for select using (true);
-- No insert/update grant here on purpose — every write goes through
-- cast_prediction_vote() (security definer), which validates event_date/
-- author/state server-side the same way verify_prediction() does. A
-- direct table insert would skip all of that.
grant select on public.prediction_votes to anon, authenticated;

-- Weighted community verification. The author's own claim (via
-- verify_prediction above) counts as AUTHOR_WEIGHT votes on its side —
-- strong enough that a couple of stray disagreeing votes can't flip a
-- correctly-reported result, but not so strong that real consensus
-- against it never can:
--   - Still 'sealed' past its event_date (author hasn't shown up): once
--     total votes reach quorum (3) with a clear (non-tied) leader, the
--     crowd resolves it on its own. resolved_by = 'community'.
--   - Already verified by the author: only flips if the OPPOSING side's
--     community votes alone exceed AUTHOR_WEIGHT (4+ people saying the
--     author got it wrong). On flip: disputed = true, resolved_by =
--     'community', and points are corrected — the author's original
--     (wrong) reward is clawed back, the right one is paid instead.
-- A vote against whatever the CURRENT resolved status is also feeds the
-- existing prediction_disputes table (already wired into Rozetler's
-- badge stats) — one user action, not two separate "I disagree" buttons
-- in the UI.
create or replace function public.cast_prediction_vote(
  p_prediction_id uuid,
  p_vote text
)
returns void as $$
declare
  v_author_id uuid;
  v_status text;
  v_event_date timestamptz;
  v_tier text;
  v_correct_weight integer;
  v_incorrect_weight integer;
  v_author_weight constant integer := 3;
  v_new_status text;
  v_multiplier numeric;
  v_old_reward integer;
  v_new_reward integer;
begin
  if p_vote not in ('correct', 'incorrect') then
    raise exception 'Geçersiz oy.';
  end if;

  select author_id, status, event_date, difficulty_tier
    into v_author_id, v_status, v_event_date, v_tier
    from public.predictions where id = p_prediction_id for update;

  if v_author_id is null then
    raise exception 'Tahmin bulunamadı.';
  end if;
  if v_author_id = auth.uid() then
    raise exception 'Kendi tahminine oy veremezsin, sonucu doğrudan işaretle.';
  end if;
  if v_status = 'open' then
    raise exception 'Bu tahmin henüz mühürlenmemiş.';
  end if;
  if v_event_date is not null and v_event_date > now() then
    raise exception 'Açılış zamanı henüz gelmedi.';
  end if;

  insert into public.prediction_votes (prediction_id, voter_id, vote)
  values (p_prediction_id, auth.uid(), p_vote)
  on conflict (prediction_id, voter_id) do update set vote = excluded.vote, created_at = now();

  if v_status in ('verified_correct', 'verified_incorrect') then
    if (p_vote = 'correct' and v_status = 'verified_incorrect')
       or (p_vote = 'incorrect' and v_status = 'verified_correct') then
      insert into public.prediction_disputes (prediction_id, user_id)
      values (p_prediction_id, auth.uid())
      on conflict (prediction_id, user_id) do nothing;
    else
      delete from public.prediction_disputes where prediction_id = p_prediction_id and user_id = auth.uid();
    end if;
  end if;

  select count(*) filter (where vote = 'correct'), count(*) filter (where vote = 'incorrect')
    into v_correct_weight, v_incorrect_weight
    from public.prediction_votes where prediction_id = p_prediction_id;

  if v_status = 'verified_correct' then
    v_correct_weight := v_correct_weight + v_author_weight;
  elsif v_status = 'verified_incorrect' then
    v_incorrect_weight := v_incorrect_weight + v_author_weight;
  end if;

  v_new_status := null;

  if v_status = 'sealed' then
    if (v_correct_weight + v_incorrect_weight) >= 3 and v_correct_weight <> v_incorrect_weight then
      v_new_status := case when v_correct_weight > v_incorrect_weight then 'verified_correct' else 'verified_incorrect' end;
    end if;
  elsif v_status = 'verified_correct' and v_incorrect_weight > v_author_weight then
    v_new_status := 'verified_incorrect';
  elsif v_status = 'verified_incorrect' and v_correct_weight > v_author_weight then
    v_new_status := 'verified_correct';
  end if;

  if v_new_status is not null and v_new_status <> v_status then
    v_multiplier := case v_tier
      when 'istikrar' then 1.25
      when 'ustalik' then 1.75
      when 'efsane' then 2.5
      else 1.0
    end;

    perform set_config('gtf.allow_points_write', 'on', true);

    if v_status in ('verified_correct', 'verified_incorrect') then
      v_old_reward := round((case when v_status = 'verified_correct' then 50 else 5 end) * v_multiplier);
      update public.profiles set points = points - v_old_reward where id = v_author_id;
    end if;

    v_new_reward := round((case when v_new_status = 'verified_correct' then 50 else 5 end) * v_multiplier);
    update public.profiles set points = points + v_new_reward where id = v_author_id;

    perform set_config('gtf.allow_points_write', 'off', true);

    update public.predictions
    set status = v_new_status,
        verified_at = coalesce(verified_at, now()),
        disputed = true,
        resolved_by = 'community'
    where id = p_prediction_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cast_prediction_vote(uuid, text) to authenticated;
-- ─────────────────────────────────────────────────────────────────────────

-- ROZET VİTRİNİ, server-side — the "vitrin" picks used to live in
-- localStorage only, which meant they were invisible to anyone but the
-- owner on that one device: a profile someone else views could never show
-- them. Moved to a real column so Profil/KullaniciProfili can actually
-- showcase it. No extra RLS policy needed (the existing "Users can update
-- own profile" policy already covers this column), and no integrity
-- trigger exception needed either — protect_profile_integrity only guards
-- id/created_at/points, everything else already passes through freely.
-- Client-side (Rozetler.jsx) already only lets you add a badge you've
-- actually earned, so no server-side re-check of earned status is needed
-- when *displaying* a showcased slug elsewhere — the badge catalog lookup
-- alone is enough.
alter table public.profiles add column showcase_badges text[] not null default '{}';
alter table public.profiles add constraint showcase_badges_max_3
  check (array_length(showcase_badges, 1) is null or array_length(showcase_badges, 1) <= 3);
-- ─────────────────────────────────────────────────────────────────────────

-- YAKLAŞAN ETKİNLİKLER — real-world events (starting with football
-- fixtures from football-data.org) to give people something concrete to
-- make a prediction about, not just what other users already posted.
-- Populated by the fetch-sports-fixtures Edge Function (supabase/functions/),
-- called from the client with a staleness check (see Kesfet.jsx) rather
-- than a true cron job — this environment can set an Edge Function secret
-- and deploy the function, but scheduling one (pg_cron / Dashboard cron)
-- needs Dashboard access this session doesn't have, so "sürekli güncellenen"
-- means "refreshes itself the next time someone opens the screen and the
-- cached data is stale", not a background job ticking on its own.
create table public.real_world_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  kind text not null check (kind in ('sports', 'city_event')),
  category text not null default 'spor',
  title text not null,
  subtitle text,
  event_date timestamptz not null,
  location text,
  metadata jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  unique (source, external_id)
);

alter table public.real_world_events enable row level security;
create policy "Real world events are viewable by everyone"
  on public.real_world_events for select using (true);
-- The select policy alone 403s without this — same lesson as the
-- service_role grant below, just the other direction (PostgREST needs the
-- base table grant in addition to the RLS policy, for every role, not just
-- the one that writes).
grant select on public.real_world_events to anon, authenticated;
-- No insert/update grant to anon/authenticated — only the Edge Function
-- (via its service-role admin client, which bypasses RLS entirely) writes
-- here. A regular client could otherwise plant a fake "event" to promote
-- their own prediction.
create index real_world_events_event_date_idx on public.real_world_events (event_date);
create index real_world_events_category_idx on public.real_world_events (category);
-- Unlike every other table in this file, this one is written by an Edge
-- Function's admin client, not by an authenticated user through PostgREST —
-- service_role bypasses RLS but still needs an actual table grant, which
-- (unlike on Supabase-managed migrations) isn't applied automatically when
-- a table is created via a raw db query connection the way this one was.
-- Learned by hitting "permission denied for table real_world_events" first.
grant select, insert, update on public.real_world_events to service_role;
-- ─────────────────────────────────────────────────────────────────────────

-- GÜNDEM (news headlines) — Ticketmaster/SeatGeek both turned out to have
-- zero Turkey coverage (verified live: querying SeatGeek for Istanbul,
-- Ankara, and country=TR each returned total:0 — a real coverage gap, not
-- a signup problem), so "şehir etkinlikleri" is on hold. Turkish news RSS
-- feeds, by contrast, need no API key/signup and are genuinely Turkey-
-- relevant — added as a second real_world_events `kind` alongside sports.
--
-- Reused the same table rather than a new one since the shape mostly
-- matches, but `event_date` means something different per kind: for
-- 'sports' it's the future kickoff you're predicting the outcome of; for
-- 'news' there's no future decision point at all, so it's repurposed as
-- the article's publish time (recency, not countdown) — the client (see
-- Kesfet.jsx) renders "X önce" for news and "X sonra" for sports off the
-- same column, and only sports prefills an event date into Tahmin
-- Oluştur — a news card leaves that for the user to pick themselves.
alter table public.real_world_events drop constraint real_world_events_kind_check;
alter table public.real_world_events add constraint real_world_events_kind_check
  check (kind in ('sports', 'city_event', 'news'));
-- ─────────────────────────────────────────────────────────────────────────

-- GRUP SOHBETİ — a live group chat, one thread per group (not per pair —
-- see public.messages for 1:1 DMs). Reuses the same shared presence
-- channel (PresenceContext.jsx) other members already track themselves in
-- for "kim şu an çevrimiçi", and the same postgres_changes INSERT
-- subscribe-per-open-thread pattern Sohbet.jsx already uses for 1:1, just
-- filtered by group_id instead of a (sender,recipient) pair.
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.group_messages enable row level security;

create policy "Group members can view group messages" on public.group_messages for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group members can send group messages" on public.group_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
  );

grant select, insert on public.group_messages to authenticated;

create index group_messages_group_id_idx on public.group_messages (group_id, created_at);

alter publication supabase_realtime add table public.group_messages;
