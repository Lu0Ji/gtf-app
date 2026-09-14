-- GTF (Guess the Future) — Phase 1 schema: profiles + predictions
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

-- WEB PUSH BİLDİRİMLERİ — the app was only ever "live" while a tab was open;
-- this is what pulls people back in (new follower, comment, DM, tahmin
-- sonucu). Chose Web Push over native FCM/APNs: no external account signup,
-- works for the web app + installed PWA + Android's Chrome-based WebView,
-- and is fully testable by re-running this file + the edge function — see
-- supabase/functions/send-push. (Not reachable from the plain Capacitor iOS
-- shell — that needs APNs separately, out of scope here.)
-- Not added to config.toml's exposed `schemas` list on purpose — these
-- helper functions are only ever called from other security definer
-- function bodies or as trigger functions, never through PostgREST.
create schema if not exists private;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy "Users manage their own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- The edge function reads across users (it's told a user_id, not scoped to
-- a single caller) via its service-role admin client — same base-table-grant
-- lesson as real_world_events above: RLS bypass alone isn't enough.
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- Trigger-to-edge-function plumbing. The edge function is deployed with
-- --no-verify-jwt (see send-push/index.ts) and checks a shared secret
-- header instead of a Supabase JWT — deliberately NOT the project's real
-- service_role key, so a leak of this secret can only ever be used to ask
-- "send this one push", never to read/write any table. Both values live in
-- Vault (encrypted at rest), readable only from inside a security definer
-- function body — never exposed through PostgREST.
select vault.create_secret(
  'https://xkxvyljothmxdwzpgyps.supabase.co/functions/v1/send-push',
  'push_edge_function_url',
  'send-push edge function URL, called from DB triggers via pg_net'
);
select vault.create_secret(
  'M6C4yK-tPMky0X-XNi141AFfxEYXggp9u40fr9zMRvg',
  'push_trigger_secret',
  'Shared secret the send-push edge function checks instead of a Supabase JWT'
);

-- pg_net is not relocatable — it always installs into its own `net` schema
-- regardless of any WITH SCHEMA clause, so none is given here.
create extension if not exists pg_net;

-- Fire-and-forget: pg_net.http_post queues the request and returns
-- immediately (async), so a slow or failing push never blocks the write
-- that triggered it. Missing Vault config (not set up yet, e.g. locally)
-- is swallowed rather than raised — a notification is never worth failing
-- someone's follow/comment/message over.
create or replace function private.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text default '/'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_edge_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-trigger-secret', v_secret),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'url', p_url)
  );
exception when others then
  null;
end;
$$;

-- Yeni takipçi — fires on a direct follow (public account, insert lands
-- accepted) and on a follow request being approved (private account,
-- pending -> accepted). Never on the pending request itself — that would
-- tip off the target before they've decided whether to approve it.
create or replace function private.notify_new_follower() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    select coalesce(display_name, username) into v_name from public.profiles where id = new.follower_id;
    perform private.send_push_notification(
      new.following_id,
      'Yeni takipçi',
      coalesce(v_name, 'Biri') || ' seni takip etmeye başladı.',
      '/kullanici/' || new.follower_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists push_new_follower on public.follows;
create trigger push_new_follower
  after insert or update on public.follows
  for each row execute function private.notify_new_follower();

-- Tahmine yorum — only pings the prediction's author, and never for their
-- own comment on their own prediction.
create or replace function private.notify_prediction_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_author_id uuid;
  v_name text;
  v_title text;
begin
  select author_id, title into v_author_id, v_title from public.predictions where id = new.prediction_id;
  if v_author_id is not null and v_author_id <> new.author_id then
    select coalesce(display_name, username) into v_name from public.profiles where id = new.author_id;
    perform private.send_push_notification(
      v_author_id,
      'Yeni yorum',
      coalesce(v_name, 'Biri') || ' tahminine yorum yaptı: ' || left(coalesce(v_title, ''), 60),
      '/tahmin-kaydi?id=' || new.prediction_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists push_prediction_comment on public.prediction_comments;
create trigger push_prediction_comment
  after insert on public.prediction_comments
  for each row execute function private.notify_prediction_comment();

-- Yeni mesaj — DMs only (group chat is a live thread people check while
-- they're in the group, not a push-worthy 1:1 ping).
create or replace function private.notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select coalesce(display_name, username) into v_name from public.profiles where id = new.sender_id;
  perform private.send_push_notification(
    new.recipient_id,
    coalesce(v_name, 'Biri') || ' sana mesaj gönderdi',
    left(new.content, 100),
    '/sohbet?userId=' || new.sender_id
  );
  return new;
end;
$$;

drop trigger if exists push_new_message on public.messages;
create trigger push_new_message
  after insert on public.messages
  for each row execute function private.notify_new_message();
-- ─────────────────────────────────────────────────────────────────────────

-- Tahmin sonucu belirlendi — pings the author once their sealed prediction
-- is resolved, whether by their own verify_prediction() call or by the
-- community voting it to quorum in cast_prediction_vote(). Re-declaring
-- both functions in full (schema.sql is append-only) with one added
-- `perform private.send_push_notification(...)` line each at the end.
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
  v_title text;
begin
  if p_result not in ('correct', 'incorrect') then
    raise exception 'Geçersiz sonuç.';
  end if;

  select author_id, status, event_date, difficulty_tier, title
    into v_author_id, v_status, v_event_date, v_tier, v_title
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

  perform private.send_push_notification(
    v_author_id,
    case when p_result = 'correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
    left(coalesce(v_title, ''), 60) || ' — ' || (case when p_result = 'correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
    '/tahmin-kaydi?id=' || p_prediction_id
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.verify_prediction(uuid, text, text, text) to authenticated;

-- Same re-declaration for the community-vote path (quorum resolves a
-- 'sealed' prediction, or enough opposing votes flip an already-verified
-- one) — only pushes when a status change actually happened this call.
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
  v_title text;
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

  select author_id, status, event_date, difficulty_tier, title
    into v_author_id, v_status, v_event_date, v_tier, v_title
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

    perform private.send_push_notification(
      v_author_id,
      case when v_new_status = 'verified_correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
      left(coalesce(v_title, ''), 60) || ' — topluluk oyuyla ' ||
        (case when v_new_status = 'verified_correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
      '/tahmin-kaydi?id=' || p_prediction_id
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cast_prediction_vote(uuid, text) to authenticated;
-- ─────────────────────────────────────────────────────────────────────────

-- PREDICTION MEDIA — VİDEO DESTEĞİ: the existing "Görsel" attach (image
-- only, see the PREDICTION MEDIA section above) now also accepts a short
-- video clip. media_type tells the client which element to render;
-- existing rows with media_url but no media_type predate this and were
-- always images (video wasn't possible before), so the client treats a
-- null media_type as 'image'.
alter table public.predictions add column media_type text check (media_type in ('image', 'video'));

-- Server-side enforcement, not just the client's <input accept> + size
-- check — a raw API call could otherwise upload anything of any size to
-- this public bucket. 25MB covers a several-second clip without this
-- becoming a video-hosting bill.
update storage.buckets
set file_size_limit = 25 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
where id = 'prediction-media';

-- media_url/media_type were missed when protect_prediction_immutability
-- was first written (before the prediction-media bucket existed) — the
-- same class of gap the SECURITY REVIEW comment above already called out
-- for other columns: an RLS UPDATE policy alone doesn't stop a raw client
-- update from silently swapping a prediction's attached media after the
-- fact. Re-declaring the same trigger function (no need to re-create the
-- trigger itself — it already points at this function by name).
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
    or old.media_url is distinct from new.media_url
    or old.media_type is distinct from new.media_type
  then
    raise exception 'Bu alanlar oluşturulduktan sonra değiştirilemez.';
  end if;
  if old.status in ('verified_correct', 'verified_incorrect') and new.status is distinct from old.status then
    raise exception 'Doğrulanmış bir tahminin sonucu değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────

-- GRUP SOHBETİ — MESAJ SAKLAMA SÜRESİ: gruplar zamanla eski mesajlarla
-- kalabalıklaşıyor (özellikle canlı/anlık tartışma için kullanılan
-- gruplarda) — bir yönetici artık sohbetin ne kadar geriye gösterileceğini
-- seçebilir. null = sınırsız (mevcut davranış, varsayılan). Bilinçli olarak
-- bir GÖRÜNÜRLÜK penceresi, gerçek bir silme değil: eski mesajlar
-- group_messages'ta kalmaya devam eder (kayıt/denetim amaçlı), istemci
-- sadece bu pencerenin dışındakileri sorgulamaz/göstermez — bu yüzden ayrı
-- bir zamanlanmış temizleme işine gerek yok ve ayar geri alınabilir
-- (Tümü'ne dönünce geçmiş mesajlar hemen geri görünür).
alter table public.groups add column message_retention_minutes integer
  check (message_retention_minutes is null or message_retention_minutes > 0);

-- ─────────────────────────────────────────────────────────────────────────

-- TAHMİN DOĞRULAMA — TOPLULUK EŞİĞİ 3 → 10, YAZAR AĞIRLIĞI KALDIRILDI:
-- iki gerçek sorun tespit edildi ve ikisi de bu blokta düzeltiliyor.
--
-- (1) İçerik açığa çıkmadan oy: TahminKaydi.jsx tarafında zamanlanmış bir
--     tahminin açılış zamanı geçtiğinde mühürlü içerik artık yazarın kendi
--     işaretlemesini beklemeden doğrudan gösteriliyor (bkz. isRevealed).
--     Bu bloğun kendisi client-side, burada DB tarafında yapılacak bir şey
--     yok — ama onu mümkün kılan eşik/ağırlık kuralı burada değişiyor.
--
-- (2) Eşik 3 → 10 ve AUTHOR_WEIGHT (3) kaldırıldı: artık ne "sealed"
--     durumundan ilk karar ne de zaten doğrulanmış bir sonucun tersine
--     çevrilmesi yazara hiçbir ağırlık bonusu tanımıyor — tek kural: en az
--     10 toplam oy VE oylar eşit değilse, hangi taraf fazlaysa sonuç o
--     olur. Bu kural mevcut durumdan (sealed / verified_correct /
--     verified_incorrect) bağımsız olarak aynı şekilde uygulanıyor, yani
--     doğrulanmış bir tahmin de topluluk oyu değiştikçe sürekli yeniden
--     değerlendirilebilir (kalıcı "kilit" yok). Bu, ürün tarafında
--     bilinçli olarak basit tutulan bir ilk kural — sayı gerektiğinde
--     tekrar ayarlanabilir.
--
-- (3) protect_prediction_immutability() zaten doğrulanmış bir tahminin
--     status'unu HER durumda engelliyordu (old.status in
--     ('verified_correct','verified_incorrect') and new.status is distinct
--     from old.status → exception) — bu, verify_prediction()'ın kendisini
--     hiç etkilemiyordu (o sadece 'sealed'dan çıkış yapıyor) ama
--     cast_prediction_vote()'un yukarıdaki "zaten doğrulanmışı tersine
--     çevirme" yolunu HER ZAMAN bloke ediyordu — yani topluluk oyuyla flip
--     özelliği hiç çalışmamış olabilirdi. Düzeltme: tetikleyici artık
--     yalnızca gtf.allow_status_flip session ayarı 'on' değilken bu
--     kontrolü uyguluyor; cast_prediction_vote() kendi flip update'inin
--     etrafında bu ayarı açıp kapatıyor (gtf.allow_points_write'ta
--     kullanılan aynı desen). Ham bir client update bu ayarı hiç
--     ayarlamayacağından tamamen korumasız kalmıyor.
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
    or old.media_url is distinct from new.media_url
    or old.media_type is distinct from new.media_type
  then
    raise exception 'Bu alanlar oluşturulduktan sonra değiştirilemez.';
  end if;
  if old.status in ('verified_correct', 'verified_incorrect')
    and new.status is distinct from old.status
    and coalesce(current_setting('gtf.allow_status_flip', true), 'off') <> 'on'
  then
    raise exception 'Doğrulanmış bir tahminin sonucu değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

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
  v_title text;
  v_correct_votes integer;
  v_incorrect_votes integer;
  v_new_status text;
  v_multiplier numeric;
  v_old_reward integer;
  v_new_reward integer;
begin
  if p_vote not in ('correct', 'incorrect') then
    raise exception 'Geçersiz oy.';
  end if;

  select author_id, status, event_date, difficulty_tier, title
    into v_author_id, v_status, v_event_date, v_tier, v_title
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
    into v_correct_votes, v_incorrect_votes
    from public.prediction_votes where prediction_id = p_prediction_id;

  -- Tek kural, mevcut durumdan bağımsız: en az 10 toplam oy ve net bir
  -- çoğunluk varsa (eşitlik yok), sonuç o çoğunluğa göre belirlenir/
  -- yeniden belirlenir. Yazar ağırlığı yok — kayıt zaten doğrulanmış olsa
  -- bile salt oy çoğunluğu değişince sonuç onunla birlikte değişir.
  v_new_status := null;
  if (v_correct_votes + v_incorrect_votes) >= 10 and v_correct_votes <> v_incorrect_votes then
    v_new_status := case when v_correct_votes > v_incorrect_votes then 'verified_correct' else 'verified_incorrect' end;
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

    perform set_config('gtf.allow_status_flip', 'on', true);
    update public.predictions
    set status = v_new_status,
        verified_at = coalesce(verified_at, now()),
        disputed = true,
        resolved_by = 'community'
    where id = p_prediction_id;
    perform set_config('gtf.allow_status_flip', 'off', true);

    perform private.send_push_notification(
      v_author_id,
      case when v_new_status = 'verified_correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
      left(coalesce(v_title, ''), 60) || ' — topluluk oyuyla ' ||
        (case when v_new_status = 'verified_correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
      '/tahmin-kaydi?id=' || p_prediction_id
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cast_prediction_vote(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────

-- PUAN SİSTEMİNİN TAMAMEN KALDIRILMASI: kullanıcı isteği — "puan sistemini
-- kaldıralım tamamen liderlik tablosu filan bunlar tuttuğumuz istatistiklere
-- göre belirlensin." Puan artık hiçbir şekilde kazanılmıyor/harcanmıyor;
-- Liderlik Tablosu doğrudan predictions'tan hesaplanan gerçek isabet
-- oranına dayanıyor (kategori × vade kırılımıyla — bkz. src/lib/
-- leaderboard.js, tamamen client-side hesaplanıyor, bunun için ayrı bir
-- view/RPC'ye gerek yok, predictions zaten herkese açık okunabilir).
--
-- Sıra: önce points'e yazan/okuyan her fonksiyonu ödül mantığı olmadan
-- yeniden bildir, SONRA sütunları sil.

-- 1) verify_prediction(): ödül/çarpan hesaplaması tamamen kaldırıldı,
--    geri kalan her şey (yetki/durum kontrolleri, kanıt kaydı, push
--    bildirimi) aynı.
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
  v_title text;
begin
  if p_result not in ('correct', 'incorrect') then
    raise exception 'Geçersiz sonuç.';
  end if;

  select author_id, status, event_date, title
    into v_author_id, v_status, v_event_date, v_title
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

  update public.predictions
  set status = case when p_result = 'correct' then 'verified_correct' else 'verified_incorrect' end,
      verified_at = now(),
      resolved_by = 'author',
      evidence_note = nullif(trim(coalesce(p_evidence_note, '')), ''),
      evidence_url = nullif(trim(coalesce(p_evidence_url, '')), '')
  where id = p_prediction_id;

  perform private.send_push_notification(
    v_author_id,
    case when p_result = 'correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
    left(coalesce(v_title, ''), 60) || ' — ' || (case when p_result = 'correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
    '/tahmin-kaydi?id=' || p_prediction_id
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.verify_prediction(uuid, text, text, text) to authenticated;

-- 2) cast_prediction_vote(): aynı şekilde — çoğunluk kuralı (eşik 10, yazar
--    ağırlığı yok) ve gtf.allow_status_flip bypass'ı aynen kalıyor, yalnızca
--    puan ödül/geri alma bloğu tamamen kaldırıldı.
create or replace function public.cast_prediction_vote(
  p_prediction_id uuid,
  p_vote text
)
returns void as $$
declare
  v_author_id uuid;
  v_status text;
  v_event_date timestamptz;
  v_title text;
  v_correct_votes integer;
  v_incorrect_votes integer;
  v_new_status text;
begin
  if p_vote not in ('correct', 'incorrect') then
    raise exception 'Geçersiz oy.';
  end if;

  select author_id, status, event_date, title
    into v_author_id, v_status, v_event_date, v_title
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
    into v_correct_votes, v_incorrect_votes
    from public.prediction_votes where prediction_id = p_prediction_id;

  v_new_status := null;
  if (v_correct_votes + v_incorrect_votes) >= 10 and v_correct_votes <> v_incorrect_votes then
    v_new_status := case when v_correct_votes > v_incorrect_votes then 'verified_correct' else 'verified_incorrect' end;
  end if;

  if v_new_status is not null and v_new_status <> v_status then
    perform set_config('gtf.allow_status_flip', 'on', true);
    update public.predictions
    set status = v_new_status,
        verified_at = coalesce(verified_at, now()),
        disputed = true,
        resolved_by = 'community'
    where id = p_prediction_id;
    perform set_config('gtf.allow_status_flip', 'off', true);

    perform private.send_push_notification(
      v_author_id,
      case when v_new_status = 'verified_correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
      left(coalesce(v_title, ''), 60) || ' — topluluk oyuyla ' ||
        (case when v_new_status = 'verified_correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
      '/tahmin-kaydi?id=' || p_prediction_id
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cast_prediction_vote(uuid, text) to authenticated;

-- 3) handle_new_user(): referral ilişkisi (referred_by) kalıyor — hâlâ
--    anlamlı bir sosyal bağ — yalnızca +100/+100 puan bonusu kaldırıldı.
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4) protect_profile_integrity(): points koruması kaldırıldı (sütun hemen
--    aşağıda tamamen siliniyor), id/created_at koruması aynı kalıyor.
create or replace function public.protect_profile_integrity()
returns trigger as $$
begin
  if old.id is distinct from new.id or old.created_at is distinct from new.created_at then
    raise exception 'Bu alanlar değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;

-- 5) Artık hiçbir yerden yazılmayan/okunmayan sütunları kaldır. stake_points
--    hiç kullanılmamış ölü bir Faz 1 alanıydı (bir "bahis" özelliği hiç inşa
--    edilmedi); points ise yukarıdaki değişikliklerle tamamen yetim kaldı.
alter table public.profiles drop column points;
alter table public.predictions drop column stake_points;
-- ─────────────────────────────────────────────────────────────────────────

-- GRUP SOHBETİ: OKUNMAMIŞ SAYACI ────────────────────────────────────────
-- Beta geri bildirimi: sohbet butonu artık her grup ekranında sağ altta
-- sabit bir buton (bkz. GroupChatFab.jsx) ve "insanlar mesaj attıkça
-- kırmızı sayı bildirimi" istendi — bunun için group_members'ta hiç
-- okuma takibi yoktu (yalnızca 1:1 messages.read_at vardı). not null
-- default now() burada bilinçli bir seçim: var olan satırlar bu migrasyon
-- anında "okunmuş" sayılır (aniden herkese eski mesajlar için kırmızı
-- rozet çıkmaz), yeni bir üyelik satırı da her zaman "şu an" ile başlar
-- (katılan biri katılmadan önceki mesajlar için "okunmamış" görmemeli).
alter table public.group_members add column last_read_at timestamptz not null default now();

-- Var olan "Admins can change member roles" politikası yalnızca
-- yöneticilere güncelleme izni veriyor — sıradan bir üye kendi
-- last_read_at'ini işaretleyemiyordu. Bu yeni politika herkese kendi
-- satırını güncelleme izni açıyor; group_id/user_id zaten
-- protect_group_membership_identity tetikleyicisiyle korunuyordu, ama
-- role bu ana kadar yalnızca RLS'in (yöneticiyseniz) izin vermesiyle
-- korunuyordu — bu yeni politika role'ü de dolaylı olarak açığa
-- çıkarabilirdi, o yüzden aynı tetikleyici aşağıda role'ü de kontrol
-- edecek şekilde genişletildi (bir üye kendini yönetici yapamaz).
create policy "Users can mark their own membership read" on public.group_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.protect_group_membership_identity()
returns trigger as $$
begin
  if old.group_id is distinct from new.group_id or old.user_id is distinct from new.user_id then
    raise exception 'Bir üyeliğin grubu veya kullanıcısı değiştirilemez, sadece rolü.';
  end if;
  if old.role is distinct from new.role and not exists (
    select 1 from public.group_members admin_check
    where admin_check.group_id = new.group_id
      and admin_check.user_id = auth.uid()
      and admin_check.role = 'admin'
  ) then
    raise exception 'Sadece grup yöneticileri rol değiştirebilir.';
  end if;
  return new;
end;
$$ language plpgsql;
-- ─────────────────────────────────────────────────────────────────────────

-- ADMIN PANEL: platformdaki toplam kullanıcı sayısı, anlık online, tahmin
-- itirazları gibi metrikleri yalnızca uygulamanın sahibinin görebileceği
-- bir panel (src/screens/AdminPanel.jsx). Bilinçli olarak global bir bayrak
-- — group_members.role='admin' ile karışmasın, o yalnızca TEK bir grubun
-- içinde geçerli, bu ise tüm platform için.
alter table public.profiles add column is_admin boolean not null default false;

-- İlk (ve şu an tek) platform admin'i — protect_profile_integrity is_admin'i
-- kilitlemeden ÖNCE çalışmalı, yoksa bu UPDATE'in kendisi de birazdan
-- eklenecek tetikleyici tarafından reddedilir (aşağıdaki create or replace
-- attığı anda o tetikleyici zaten devrede olur).
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'aliyusufbusiness1@gmail.com');

-- Var olan "Users can update own profile" politikası (using (auth.uid() =
-- id), with check yok) herkese kendi satırının HER sütununu güncelleme
-- izni veriyordu — is_admin eklenince bu, herkesin kendini admin
-- yapabilmesi anlamına gelirdi. protect_profile_integrity zaten
-- id/created_at'i koruyordu; is_admin'i de aynı şekilde koruyacak şekilde
-- genişletildi — artık bu sütun hiçbir normal profil güncellemesiyle
-- (adminin kendisininki dahil) değiştirilemez, yalnızca doğrudan SQL ile.
create or replace function public.protect_profile_integrity()
returns trigger as $$
begin
  if old.id is distinct from new.id or old.created_at is distinct from new.created_at then
    raise exception 'Bu alanlar değiştirilemez.';
  end if;
  if old.is_admin is distinct from new.is_admin then
    raise exception 'is_admin bu şekilde değiştirilemez.';
  end if;
  return new;
end;
$$ language plpgsql;
-- ─────────────────────────────────────────────────────────────────────────

-- KULLANICI ŞİKAYETLERİ (docs/designs/verified-badge-strategy.md, Approach A):
-- GTF'de şu ana kadar hiçbir kullanıcı-seviyesi şikayet/taklit bildirme
-- mekanizması yoktu, sadece engelleme (blocks) vardı. Bu tur BİLİNÇLİ
-- olarak sadece GÖRÜNÜRLÜK sağlıyor — biri bir hesabı bildirebiliyor,
-- admin görebiliyor. Hesap askıya alma/adını değiştirtme gibi bir
-- YAPTIRIM mekanizması şemada yok ve bu turun kapsamı dışında; "işlem
-- yapıldı" durumu şu an hiçbir gerçek işlemi garanti etmiyor, sadece
-- admin'in raporu kapalı saydığını işaretliyor.
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('impersonation', 'harassment', 'spam')),
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'action_taken')),
  created_at timestamptz not null default now(),
  check (reporter_id <> target_id)
);

-- Tek açık rapor kısıtı: reporter+target başına en fazla bir 'open'/
-- 'reviewed' kayıt. Kısmi (partial) bir index olması bilinçli — düz bir
-- unique(reporter_id, target_id) kullanılsaydı, bir rapor 'action_taken'a
-- ulaştıktan sonra aynı kişi aynı hedefi bir daha hiç raporlayamazdı.
create unique index user_reports_one_open_per_pair
  on public.user_reports (reporter_id, target_id)
  where status != 'action_taken';

alter table public.user_reports enable row level security;

-- is_admin(): profiles.is_admin kontrolünü tek yerden yapan security-
-- definer helper — is_blocked()/blocked_user_ids() ile aynı kalıp,
-- birden fazla RLS politikasında aynı exists() sorgusunu tekrarlamamak
-- için. Sadece bu tabloda değil, ileride admin kontrolü gereken her
-- yeni tabloda yeniden kullanılabilir.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Raporu sadece raporlayan + admin görebilir — prediction_disputes'ın
-- "herkese açık okuma" politikası buraya BİLİNÇLİ olarak taşınmadı, bu
-- tablo kullanıcılar hakkında suçlama içeriyor.
create policy "Reporters and admins can view reports" on public.user_reports
  for select using (auth.uid() = reporter_id or public.is_admin());
create policy "Users can report others" on public.user_reports
  for insert with check (auth.uid() = reporter_id and reporter_id <> target_id);
create policy "Admins can update report status" on public.user_reports
  for update using (public.is_admin()) with check (public.is_admin());
-- prediction_disputes'ın "Users can retract their own dispute" politikasıyla
-- aynı mantık — ama sadece rapor henüz incelenmemişken.
create policy "Reporters can retract their own open report" on public.user_reports
  for delete using (auth.uid() = reporter_id and status = 'open');

grant select, insert, update, delete on public.user_reports to authenticated;
-- ─────────────────────────────────────────────────────────────────────────

-- REKLAM KILL SWITCH (docs/designs/ad-monetization-strategy.md, Approach A):
-- genel amaçlı bir "app_config" tablosu, tek satırı reklamların açık/kapalı
-- olduğunu tutuyor. Kod deploy'u gerektirmeden anında kapatılabilmesi
-- Success Criteria'nın şartıydı — bir Supabase satırı bu yüzden bilinçli
-- olarak yeterli, ayrı bir remote-config servisi değil. Varsayılan `false`:
-- gerçek bir AdMob hesabı onaylanana ve rıza/ATT akışı kurulana kadar
-- reklamlar kapalı kalmalı (bkz. dokümanın Gating bağımlılığı).
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
-- Herkese açık okuma: istemci tarafında (src/lib/ads.js) auth gerektirmeden
-- kontrol edilebilmesi lazım, hassas bir veri değil.
create policy "Config is viewable by everyone" on public.app_config for select using (true);
create policy "Admins can insert config" on public.app_config
  for insert with check (public.is_admin());
create policy "Admins can update config" on public.app_config
  for update using (public.is_admin()) with check (public.is_admin());

grant select on public.app_config to anon, authenticated;
grant insert, update on public.app_config to authenticated;

insert into public.app_config (key, value) values ('ads_enabled', 'false'::jsonb);
-- ─────────────────────────────────────────────────────────────────────────

-- MÜHÜR KOSTÜMÜ (docs/designs/seal-customization-strategy.md, Approach A):
-- src/lib/seal-styles.js kataloğunun ikizi — check constraint'i kataloğu DB
-- seviyesinde kilitliyor (mention_permission/showcase_badges_max_3 ile aynı
-- emsal). GİZLİ BAKIM MALİYETİ: seal-styles.js'e ileride yeni bir kostüm
-- eklendiğinde, bu constraint'i genişleten İKİNCİ bir migrasyon da gerekir
-- (bkz. tasarım dokümanının Dependencies bölümü) — unutulursa kullanıcı
-- equipped_seal_style'ı güncellemeye çalışınca açık bir constraint-ihlali
-- hatası alır.
alter table public.profiles add column equipped_seal_style text not null default 'basic';
alter table public.profiles add constraint equipped_seal_style_known_value
  check (equipped_seal_style in ('basic', 'ferman'));
-- RLS: protect_profile_integrity'nin genel "kendi profilini
-- güncelleyebilirsin" kapsamına giriyor, is_admin gibi ekstra bir korumaya
-- ihtiyacı yok. Kilit açma kontrolü showcase_badges ile aynı güven
-- modelinde: tamamen istemci tarafında, sunucu tarafında "bu rozeti
-- gerçekten kazandı mı" yeniden doğrulaması yok.
-- ─────────────────────────────────────────────────────────────────────────

-- GRUP ROLÜ: KURUCU HER ZAMAN YÖNETİCİ (2026-09-10 kullanıcı bildirimi):
-- Kurucu üye gruptan çıkıp tekrar girince "member" olarak görünüyordu —
-- istemci (GrupDetayi.jsx) yeniden katılırken role hiç göndermiyor, sütun
-- varsayılanı 'member'. Bunu istemci tarafında "eğer kurucuysan role:
-- 'admin' gönder" diye düzeltmek yerine sunucuda kilitliyoruz: aşağıdaki
-- trigger her INSERT'te NEW.role'u YOK SAYIP grubun created_by'ı ise
-- 'admin', değilse 'member' olarak zorluyor. Bunun ikinci, daha önemli bir
-- nedeni var: "Users can join groups" insert policy'si (satır ~175)
-- sadece auth.uid() = user_id kontrol ediyor, role'e hiç bakmıyor — yani
-- bu trigger olmadan HERHANGİ bir istemci, herhangi bir gruba role: 'admin'
-- göndererek kendini direkt yönetici yapabilirdi. Trigger hem kurucu-tekrar-
-- katılma hatasını çözüyor hem de bu açığı kapatıyor.
create or replace function public.set_group_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id = (select created_by from public.groups where id = new.group_id) then
    new.role := 'admin';
  else
    new.role := 'member';
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_role_on_insert on public.group_members;
create trigger group_members_role_on_insert
  before insert on public.group_members
  for each row execute function public.set_group_member_role();
-- ─────────────────────────────────────────────────────────────────────────

-- GRUP AYARLARI: kapak fotoğrafı artık kuruluştan SONRA da değiştirilebiliyor
-- (GrupDetayi.jsx'in yeni GroupSettingsSheet'i), ve "Admins can update their
-- groups" (satır ~675) zaten kurucu dışındaki yöneticilere de grup satırını
-- düzenleme hakkı veriyor — ama storage.objects üzerindeki "Group creators
-- can upload/update group cover" politikaları (satır ~287) hâlâ SADECE
-- g.created_by = auth.uid() diyordu. Yani kurucu olmayan bir yönetici ismi/
-- açıklamayı değiştirebiliyor ama kapak fotoğrafını değiştiremiyordu —
-- sessiz bir tutarsızlık. group_members.role = 'admin' kontrolüne çevirerek
-- groups tablosundaki yetkiyle eşitliyoruz.
drop policy "Group creators can upload group cover" on storage.objects;
create policy "Group admins can upload group cover" on storage.objects for insert
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and exists (
      select 1 from public.group_members gm
      where gm.group_id::text = (storage.foldername(name))[2] and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );
drop policy "Group creators can update group cover" on storage.objects;
create policy "Group admins can update group cover" on storage.objects for update
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = 'group'
    and exists (
      select 1 from public.group_members gm
      where gm.group_id::text = (storage.foldername(name))[2] and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  );
-- ─────────────────────────────────────────────────────────────────────────

-- GÜNDEM: ÇOK DİLLİ HABER KAYNAKLARI (2026-09-10 kullanıcı bildirimi):
-- "sadece Türkiye için düşünmemek lazım" — GÜNDEM bölümü (yukarı bakın)
-- her dilde aynı Türkçe Hürriyet/BBC Türkçe/DW Türkçe üçlüsünü gösteriyordu.
-- Uygulamanın zaten "bölge" sinyali olarak kullandığı tek şey seçili dil
-- (bkz. UserSettingsContext.jsx'in region.language'ı, lib/format.js'in
-- locale()'ı) — gerçek GPS/IP konumu değil, yeni bir izin/servis gerektirir,
-- kapsam dışı bırakıldı. `language` sütunu bu yüzden i18next'in 8 dilini
-- (tr/en/de/zh/ja/ru/es/ar) sınırlayan bir check constraint ile ekleniyor.
-- Var olan tüm satırlar (sports + bugüne kadarki news) 'tr' varsayılanına
-- düşüyor — hepsi zaten Türkçe/Türkiye bağlamlı kaynaklardan geldiği için
-- bu doğru bir varsayılan, geriye dönük veri bozulmuyor.
alter table public.real_world_events add column language text not null default 'tr';
alter table public.real_world_events add constraint real_world_events_language_known_value
  check (language in ('tr', 'en', 'de', 'zh', 'ja', 'ru', 'es', 'ar'));
create index real_world_events_language_idx on public.real_world_events (language);
-- ─────────────────────────────────────────────────────────────────────────

-- MÜHÜR KOSTÜMÜ — İKİ YENİ KOSTÜM (2026-09-10 kullanıcı bildirimi:
-- "kişiselleştirmeyi arttıralım, birkaç tane daha mühürleme kostümü
-- ekleyelim"): tam olarak yukarıdaki MÜHÜR KOSTÜMÜ bölümünün kendi
-- öngördüğü "gizli bakım maliyeti" — seal-styles.js'e 'noter' ve 'altin'
-- eklendi, bu constraint'i genişleten ikinci migrasyon bu.
alter table public.profiles drop constraint equipped_seal_style_known_value;
alter table public.profiles add constraint equipped_seal_style_known_value
  check (equipped_seal_style in ('basic', 'ferman', 'noter', 'altin'));
-- ─────────────────────────────────────────────────────────────────────────

-- ROZET KAZANMA BİLDİRİMİ (2026-09-11 kullanıcı bildirimi: "kişiselleştirmeyi
-- arttıralım" tavsiyesinden #3 — rozet kazanınca hiçbir bildirim yoktu,
-- kullanıcı Rozetler.jsx'e tekrar girip fark etmedikçe hiç görmüyordu).
-- earned_badges satırı Rozetler.jsx'te SADECE gerçekten yeni kazanılan
-- rozetler için insert ediliyor (bkz. o dosyadaki !known.has(b.slug) filtresi
-- ve primary key (user_id, badge_slug) — aynı rozet ikinci kez insert
-- edilemez), yani bu tablodaki her INSERT gerçek bir "az önce kazanıldı"
-- anı — plain bir AFTER INSERT trigger, push_new_follower/
-- push_prediction_comment/push_new_message ile aynı desen, private.
-- send_push_notification zaten var olan aynı fire-and-forget fonksiyonu.
--
-- badges.js kataloğunun 160 rozetinin başlığını burada tekrarlamak (Türkçe
-- adları SQL'de ikinci bir kopya olarak tutmak) tam da seal-styles.js'in
-- kendi check constraint'i için yukarıda belgelenen "gizli bakım maliyeti"
-- tuzağı — bunun yerine bildirim metni kasıtlı olarak jenerik: "hangisini
-- kazandığını görmek için dokun", rozet adını SQL'e hiç taşımadan. Tek
-- istisna: onay-damgasi/surec-muhru (mühür kostümü açan iki rozet, bkz.
-- seal-styles.js) — bunlar sadece 2 slug, tüm kataloğu değil, o yüzden
-- özel bir mesajı hak ediyor ve bakım maliyeti ihmal edilebilir düzeyde.
--
-- Var olan diğer push trigger'ları gibi (follows/comments/messages) bu da
-- Uygulama Ayarları'ndaki bildirim tercihi anahtarlarına bakmıyor — hiçbiri
-- bakmıyor (user_settings hiçbir trigger fonksiyonunda okunmuyor), o
-- tutarlılığı bu migrasyonla değiştirmek kapsam dışı.
create or replace function private.notify_badge_earned() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body text;
begin
  if new.badge_slug in ('onay-damgasi', 'surec-muhru') then
    v_title := 'Yeni bir mühür kostümü açıldı! 🎉';
    v_body := 'Az önce kazandığın rozetle birlikte yeni bir mühür kostümünün kilidi açıldı.';
  else
    v_title := 'Yeni bir rozet kazandın! 🎉';
    v_body := 'Hangisi olduğunu görmek için dokun.';
  end if;
  perform private.send_push_notification(new.user_id, v_title, v_body, '/rozetler');
  return new;
end;
$$;

drop trigger if exists push_badge_earned on public.earned_badges;
create trigger push_badge_earned
  after insert on public.earned_badges
  for each row execute function private.notify_badge_earned();
-- ─────────────────────────────────────────────────────────────────────────

-- MÜHÜR KOSTÜMÜ — İSTİKRAR KATMANI (2026-09-11 kullanıcı bildirimi:
-- "kişiselleştirmeyi arttıralım" tavsiyesinden #5): seal-styles.js'e
-- 'sadakat' eklendi, yine aynı öngörülen "gizli bakım maliyeti" — bu
-- constraint'i genişleten üçüncü migrasyon.
alter table public.profiles drop constraint equipped_seal_style_known_value;
alter table public.profiles add constraint equipped_seal_style_known_value
  check (equipped_seal_style in ('basic', 'ferman', 'sadakat', 'noter', 'altin'));
-- ─────────────────────────────────────────────────────────────────────────

-- "O GÜN NE DEMİŞTİN" HATIRLATMASI (2026-09-12 kullanıcı bildirimi:
-- "kullanıcıları içerde tutup zaman geçirtmek için ne yapabiliriz...
-- diğer sosyal medya araçlarından esinlenebiliriz" — Facebook/Snapchat'in
-- "anılar" özelliği, ama GTF için ödünç alınmış hissi vermiyor çünkü
-- uygulamanın kendi teması zaten "zaman kapsülü").
--
-- ÖNEMLİ KEŞİF: pending-supabase-migration.md ve fetch-sports-fixtures/
-- fetch-news-headlines'ın kendi yorumları, bu ortamda gerçek bir
-- zamanlanmış görev (cron) kurulamayacağını, sadece "refresh-on-view"
-- yapılabileceğini varsayıyordu ("Dashboard access this session doesn't
-- have"). Bu varsayım YANLIŞ çıktı — `create extension pg_cron` ve
-- `cron.schedule(...)` doğrudan bir db query bağlantısından çalıştı,
-- Dashboard'a hiç gerek kalmadan. Bu, bu turdan itibaren gerçek bir
-- arka plan görevi kurabileceğimiz anlamına geliyor (bkz. aşağıdaki
-- cron.schedule çağrısı) — ileride push_new_follower gibi anlık
-- trigger'lara ek olarak, zamana dayalı bildirimler de mümkün.
--
-- Her gün bir kez: created_at'ın ay/günü bugünkü ay/güne denk gelen (ve
-- en az 1 yıl geçmiş) her tahmin için yazara bir hatırlatma push'u
-- gönderiliyor. Aynı tahmin birden fazla yılda tetiklenebilir (1. yıl,
-- 2. yıl, ...) — her biri gerçek bir "o gün ne demiştin" anı. Idempotency:
-- memory_notifications_sent (prediction_id, anniversary_date) — aynı gün
-- cron ikinci kez çalışsa bile (ör. bir redeploy sonrası) ON CONFLICT DO
-- NOTHING tekrar göndermeyi engelliyor.
create extension if not exists pg_cron;

create table private.memory_notifications_sent (
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  anniversary_date date not null,
  primary key (prediction_id, anniversary_date)
);

create or replace function private.send_memory_notifications() returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_years_ago integer;
  v_title text;
  v_body text;
begin
  for r in
    select p.id, p.author_id, p.title, p.status, p.created_at
    from public.predictions p
    where extract(month from p.created_at) = extract(month from current_date)
      and extract(day from p.created_at) = extract(day from current_date)
      and extract(year from p.created_at) < extract(year from current_date)
  loop
    insert into private.memory_notifications_sent (prediction_id, anniversary_date)
    values (r.id, current_date)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    v_years_ago := extract(year from current_date) - extract(year from r.created_at);
    v_title := case
      when v_years_ago = 1 then 'Tam 1 yıl önce bugün...'
      else 'Tam ' || v_years_ago || ' yıl önce bugün...'
    end;
    v_body := case
      when r.status = 'verified_correct' then 'Bunu tahmin etmiştin ve haklı çıkmışsın: ' || left(r.title, 80)
      when r.status = 'verified_incorrect' then 'Bunu tahmin etmiştin. Sonucu şimdi hatırlıyor musun: ' || left(r.title, 80)
      else 'Bunu mühürlemiştin, hâlâ duruyor: ' || left(r.title, 80)
    end;

    perform private.send_push_notification(r.author_id, v_title, v_body, '/tahmin-kaydi?id=' || r.id);
  end loop;
end;
$$;

-- 07:00 UTC ≈ Türkiye saatiyle sabah 10:00 — "günün başında yakala" için
-- makul bir zaman, uyku saatlerinin ortasına denk gelmiyor.
select cron.schedule('send-memory-notifications', '0 7 * * *', $$select private.send_memory_notifications()$$);
-- ─────────────────────────────────────────────────────────────────────────

-- STREAK KAYBETME HATIRLATMASI (2026-09-12, öneri #3 — Duolingo'nun en
-- meşhur retention mekaniği). StreakFlame.jsx + streak_count/
-- last_active_date altyapısı zaten vardı (bkz. "ENGAGEMENT MECHANICS"
-- bölümü, satır ~501) ama günün sonuna doğru hiç dürtmüyorduk — biri
-- serisini SessizCE kaybediyordu, ancak bir sonraki girişinde fark
-- ediyordu. Artık pg_cron kullanılabildiği doğrulandığı için (bkz. "O GÜN
-- NE DEMİŞTİN" bölümündeki not) bu artık gerçek, zamanlanmış bir görev.
--
-- Hedef: last_active_date TAM OLARAK dün olan (bugün henüz hiç açılmamış
-- ama seri hâlâ kurtarılabilir durumda — last_active_date bundan daha eski
-- olan biri için seri zaten bumpStreak()'in bir sonraki girişte sıfırlayacağı
-- şekilde fiilen bitmiş demektir, "kaybetme!" demek yanlış/kafa karıştırıcı
-- olurdu) ve streak_count >= 2 olan (1 günlük bir seriyi "kaybetme"
-- demek gereksiz erken bir dürtme). streak_reminders_sent aynı gün
-- tekrar göndermeyi engelliyor (memory_notifications_sent ile aynı desen).
create table private.streak_reminders_sent (
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_date date not null,
  primary key (user_id, reminder_date)
);

create or replace function private.send_streak_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  for r in
    select id, streak_count
    from public.profiles
    where last_active_date = current_date - interval '1 day'
      and streak_count >= 2
  loop
    insert into private.streak_reminders_sent (user_id, reminder_date)
    values (r.id, current_date)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    perform private.send_push_notification(
      r.id,
      r.streak_count || ' günlük serin bitmek üzere! 🔥',
      'Bugün henüz açılmadın — seni kaybetmeden uygulamayı aç.',
      '/'
    );
  end loop;
end;
$$;

-- 17:00 UTC ≈ Türkiye saatiyle akşam 20:00 — Duolingo'nun kendi zamanlaması
-- da aynı mantıkla akşam saatleri: gün bitmeden önce ama hâlâ "bu akşam
-- açarım" için gerçek bir pencere bırakarak.
select cron.schedule('send-streak-reminders', '0 17 * * *', $$select private.send_streak_reminders()$$);
-- ─────────────────────────────────────────────────────────────────────────

-- "BİRAZDAN AÇILIYOR" BİLDİRİMİ (2026-09-12, öneri #5): "takip ettiğin/
-- beğendiğin bir tahmin birazdan açılacaksa push" — şu ana kadar sadece
-- ekranda bir geri sayım vardı, uygulamayı kapatmış birine "şimdi dön"
-- diyen anlık bir tetikleyici yoktu.
--
-- Hedef kitle: tahminin yazarı + beğenenler (prediction_likes) + kaydedenler
-- (prediction_saves) — "ilgi göstermiş" sinyali zaten var olan iki
-- tablodan geliyor, yeni bir "takip listesi" kavramı icat edilmedi.
-- Sadece event_date'i olan (manuel mühürlerin "Ben açarım" modunda sabit
-- bir açılış saati yok, "birazdan açılıyor" onlar için anlamsız) ve hâlâ
-- 'sealed' durumunda olan tahminler için. Her 10 dakikada bir çalışıyor
-- (diğer görevlerden çok daha sık — "birazdan" dakika hassasiyeti
-- gerektiriyor), event_date'i şu andan sonraki 15 dakika içinde olanları
-- yakalıyor. opening_soon_notifications_sent (prediction_id tek başına
-- primary key, tarih yok) — bu bildirim bir tahmin için EN FAZLA bir kez
-- gönderilir, günlük tekrar eden diğer görevlerden farklı.
create table private.opening_soon_notifications_sent (
  prediction_id uuid primary key references public.predictions(id) on delete cascade
);

create or replace function private.send_opening_soon_notifications() returns void
language plpgsql security definer set search_path = public as $$
declare
  p record;
  liker record;
begin
  for p in
    select id, title, author_id
    from public.predictions
    where status = 'sealed'
      and event_date is not null
      and event_date between now() and now() + interval '15 minutes'
  loop
    insert into private.opening_soon_notifications_sent (prediction_id)
    values (p.id)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    perform private.send_push_notification(
      p.author_id,
      'Tahminin birazdan açılıyor! ⏳',
      left(p.title, 80) || ' — sonucu merakla bekleniyor.',
      '/tahmin-kaydi?id=' || p.id
    );

    for liker in
      select user_id from public.prediction_likes where prediction_id = p.id
      union
      select user_id from public.prediction_saves where prediction_id = p.id
    loop
      if liker.user_id <> p.author_id then
        perform private.send_push_notification(
          liker.user_id,
          'Birazdan açılıyor! ⏳',
          left(p.title, 80),
          '/tahmin-kaydi?id=' || p.id
        );
      end if;
    end loop;
  end loop;
end;
$$;

select cron.schedule('send-opening-soon-notifications', '*/10 * * * *', $$select private.send_opening_soon_notifications()$$);
-- ─────────────────────────────────────────────────────────────────────────

-- DAVET AKIŞINI ÖDÜLLENDİRMEK (2026-09-12, öneri #6 — davet linki kopyalama
-- zaten vardı (UygulamaAyarlari.jsx) ama karşılığında hiçbir şey yoktu,
-- sadece 1/10/20 davette sessizce açılan rozetler (davetiye/acik-miras/
-- buyuk-elci, bkz. badges.js). En ucuz, en somut iyileştirme: birisi
-- gerçekten SENİN linkinle katıldığında anında haber almak — şu an bu
-- sessizce oluyor, davet eden biri ancak Rozetler.jsx'e girip rozet
-- sayısına bakarsa fark ediyordu.
--
-- handle_new_user() (append-only — yeniden tam tanımlanıyor, en son hâli
-- satır ~2213) tek eklenen satır: referrer_id doluysa bir push.
-- security definer olduğu için private.send_push_notification'ı
-- çağırabiliyor (fonksiyon zaten public şemada, search_path public'i
-- kapsıyor — private.send_push_notification de security definer, iç içe
-- security definer çağrısı schema.sql'de zaten cast_prediction_vote'un
-- kendi push çağrılarında kullanılan aynı desen).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
  v_name text;
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
    v_name := coalesce(new.raw_user_meta_data->>'display_name', 'Yeni bir kullanıcı');
    perform private.send_push_notification(
      referrer_id,
      'Davetin kabul edildi! 🎉',
      v_name || ' senin davetinle GTF''e katıldı.',
      '/uygulama-ayarlari'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- ─────────────────────────────────────────────────────────────────────────

-- KİTLE BOYUTUNA GÖRE UYARLANAN TOPLULUK EŞİĞİ (2026-09-14, öneri #2 —
-- "10 oyluk eşik grup büyüklüğünden bağımsız, sabit"). Eskiden her tahmin,
-- popülerliği ne olursa olsun, aynı sabit 10 oya ulaşana kadar asla
-- topluluk denetiminden geçmiyordu — grup içi veya az beğenilen bir tahmin
-- için bu sayı pratikte hiç yakalanmıyor, tek denetim mekanizması fiilen
-- devre dışı kalıyordu (canlı veride doğrulandı: tüm mevcut tahminler yeni
-- taban olan 3'e düşüyor, eskiden hiçbiri 10'a asla ulaşamazdı). Artık eşik
-- "ilgili kitle" büyüklüğüne göre 3 ile 10 arasında ölçekleniyor:
--   - Grup içi bir tahminse (group_id dolu): kitle = o grubun üye sayısı.
--   - Herkese açık bir tahminse: kitle = beğenen ∪ kaydedenlerin birleşimi
--     (aynı "kim ilgileniyor" sinyali private.send_opening_soon_notifications
--     içinde zaten kullanılıyor — burada da aynı union deseni tekrarlanıyor).
-- Taban 3: tek bir kişi ya da iki arkadaşın oyuyla sonuç çevrilemesin diye.
-- Tavan 10: büyük/popüler tahminlerde eski davranış aynen korunuyor.
--
-- Tek bir fonksiyonda toplanmasının sebebi: hem cast_prediction_vote()
-- sunucu tarafında karar verirken, hem de istemci tarafı (TahminKaydi.jsx)
-- "en az N kişi oy verince açılır" metnini gösterirken AYNI sayıyı
-- kullansın — iki ayrı yerde aynı formülün yazılıp zamanla birbirinden
-- sapması riskini (bu oturumda useTotpEnrollment.js'te olduğu gibi)
-- baştan kapatıyor.
create or replace function public.prediction_vote_quorum(p_prediction_id uuid)
returns integer as $$
declare
  v_group_id uuid;
  v_audience integer;
begin
  select group_id into v_group_id from public.predictions where id = p_prediction_id;

  if v_group_id is not null then
    select count(*) into v_audience from public.group_members where group_id = v_group_id;
  else
    select count(*) into v_audience from (
      select user_id from public.prediction_likes where prediction_id = p_prediction_id
      union
      select user_id from public.prediction_saves where prediction_id = p_prediction_id
    ) s;
  end if;

  return least(10, greatest(3, ceil(coalesce(v_audience, 0) / 2.0)::integer));
end;
$$ language plpgsql security definer set search_path = public stable;

grant execute on function public.prediction_vote_quorum(uuid) to authenticated, anon;

-- cast_prediction_vote(): tek fark, sabit ">= 10" yerine artık yukarıdaki
-- fonksiyonu çağırıyor. Geri kalan her şey (yazar oy veremez, mühürsüz oy
-- olmaz, açılış zamanı geçmemişse oy olmaz, disputed/resolved_by/bildirim
-- mantığı) birebir aynı kalıyor.
create or replace function public.cast_prediction_vote(
  p_prediction_id uuid,
  p_vote text
)
returns void as $$
declare
  v_author_id uuid;
  v_status text;
  v_event_date timestamptz;
  v_title text;
  v_correct_votes integer;
  v_incorrect_votes integer;
  v_new_status text;
  v_quorum integer;
begin
  if p_vote not in ('correct', 'incorrect') then
    raise exception 'Geçersiz oy.';
  end if;

  select author_id, status, event_date, title
    into v_author_id, v_status, v_event_date, v_title
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
    into v_correct_votes, v_incorrect_votes
    from public.prediction_votes where prediction_id = p_prediction_id;

  v_quorum := public.prediction_vote_quorum(p_prediction_id);

  v_new_status := null;
  if (v_correct_votes + v_incorrect_votes) >= v_quorum and v_correct_votes <> v_incorrect_votes then
    v_new_status := case when v_correct_votes > v_incorrect_votes then 'verified_correct' else 'verified_incorrect' end;
  end if;

  if v_new_status is not null and v_new_status <> v_status then
    perform set_config('gtf.allow_status_flip', 'on', true);
    update public.predictions
    set status = v_new_status,
        verified_at = coalesce(verified_at, now()),
        disputed = true,
        resolved_by = 'community'
    where id = p_prediction_id;
    perform set_config('gtf.allow_status_flip', 'off', true);

    perform private.send_push_notification(
      v_author_id,
      case when v_new_status = 'verified_correct' then 'Tahmin doğrulandı!' else 'Tahmin sonuçlandı' end,
      left(coalesce(v_title, ''), 60) || ' — topluluk oyuyla ' ||
        (case when v_new_status = 'verified_correct' then 'gerçekleşti' else 'gerçekleşmedi' end),
      '/tahmin-kaydi?id=' || p_prediction_id
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.cast_prediction_vote(uuid, text) to authenticated;
-- ─────────────────────────────────────────────────────────────────────────
