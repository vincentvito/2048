-- Better Auth tables (user, session, account, verification).
-- Generated from: npx @better-auth/cli migrate --config src/lib/auth.ts

create table if not exists public."user" (
  id                text        primary key,
  name              text        not null,
  email             text        not null unique,
  "emailVerified"   boolean     not null,
  image             text,
  "createdAt"       timestamptz not null default current_timestamp,
  "updatedAt"       timestamptz not null default current_timestamp,
  username          text
);

create table if not exists public.session (
  id                text        primary key,
  "expiresAt"       timestamptz not null,
  token             text        not null unique,
  "createdAt"       timestamptz not null default current_timestamp,
  "updatedAt"       timestamptz not null,
  "ipAddress"       text,
  "userAgent"       text,
  "userId"          text        not null references public."user"(id)
);

create table if not exists public.account (
  id                        text        primary key,
  "accountId"               text        not null,
  "providerId"              text        not null,
  "userId"                  text        not null references public."user"(id),
  "accessToken"             text,
  "refreshToken"            text,
  "idToken"                 text,
  "accessTokenExpiresAt"    timestamptz,
  "refreshTokenExpiresAt"   timestamptz,
  scope                     text,
  password                  text,
  "createdAt"               timestamptz not null default current_timestamp,
  "updatedAt"               timestamptz not null
);

create table if not exists public.verification (
  id                text        primary key,
  identifier        text        not null,
  value             text        not null,
  "expiresAt"       timestamptz not null,
  "createdAt"       timestamptz not null default current_timestamp,
  "updatedAt"       timestamptz not null default current_timestamp
);
