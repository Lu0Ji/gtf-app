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
