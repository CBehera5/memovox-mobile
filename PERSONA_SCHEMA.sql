-- Create table for storing deep user personas
create table if not exists public.user_personas (
  user_id uuid references auth.users not null primary key,
  bio text, -- Narrative description of the user
  traits jsonb default '[]'::jsonb, -- Array of personality traits
  goals jsonb default '[]'::jsonb, -- Long-term goals inferred from memos
  communication_style text, -- Description of how user communicates
  interests jsonb default '[]'::jsonb, -- Array of interests/topics
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_personas enable row level security;

-- Policies
create policy "Users can view their own persona"
  on public.user_personas for select
  using ( auth.uid() = user_id );

create policy "Users can update their own persona"
  on public.user_personas for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own persona update"
  on public.user_personas for update
  using ( auth.uid() = user_id );

-- Function to handle timestamp update
create or replace function public.handle_persona_updated_at()
returns trigger as $$
begin
  new.last_updated = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_user_personas_updated_at
  before update on public.user_personas
  for each row
  execute procedure public.handle_persona_updated_at();
