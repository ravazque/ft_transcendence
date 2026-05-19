-- Database initialisation
-- Runs only once when the container is first created (the docker volume
-- yoga_db_data must be empty). After bootstrap, schema drift is reconciled
-- by `prisma db push` on every fullstack container start, so this file and
-- fullstack/prisma/schema.prisma must stay aligned.

-- UUID generation for primary keys (users, sessions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Column-level encryption (AES-256 via pgp_sym_encrypt/decrypt) — used when
-- storing encrypted personal data (phone, address, etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- Enums
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'editor',
    'user'
);

CREATE TYPE public.discount_scope_types AS ENUM (
    'all',
    'modules'
);

CREATE TYPE public.discount_types AS ENUM (
    'percent',
    'amount'
);

CREATE TYPE public.locale_code AS ENUM (
    'en_en',
    'es_es',
    'fr_fr'
);

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'failed'
);

CREATE TYPE public.calendar_event_kind AS ENUM (
    'live',
    'in_person'
);

CREATE TYPE public.resource_types AS ENUM (
    'external_url',
    'bibliography_entry',
    'aditional_note',
    'pdf'
);

--
-- Tables
--

-- Users use UUID as primary key — IDs are referenced from JWT payloads and
-- public URLs, where exposing a sequential integer would leak user counts.
-- password stores an Argon2id hash (~95-100 chars), so VARCHAR(255).
CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username character varying(16) NOT NULL UNIQUE,
    email character varying(255) NOT NULL UNIQUE,
    password character varying(255) NOT NULL,
    full_name character varying(255),
    avatar_url character varying(255),
    preferred_locale public.locale_code NOT NULL DEFAULT 'en_en',
    role public.user_role NOT NULL DEFAULT 'user',
    totp_secret character varying(255),
    totp_enabled boolean NOT NULL DEFAULT false,
    email_verified boolean NOT NULL DEFAULT false,
    stripe_customer_id character varying(255),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW()
);

-- Reserved for refresh-token rotation. Today the JWT cookie is the only
-- active token; this table is unused at runtime but kept for the upcoming
-- rotation flow.
CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    token character varying(512) NOT NULL UNIQUE,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE public.modules (
    id serial PRIMARY KEY,
    locale public.locale_code NOT NULL,
    slug character varying(255) NOT NULL,
    cover character varying(255),
    title character varying(255) NOT NULL,
    short_description character varying(255),
    full_description text,
    key_concepts text,
    is_full_course boolean NOT NULL DEFAULT false,
    price numeric(6,2) NOT NULL,
    published boolean NOT NULL DEFAULT true,
    stripe_product_id character varying(255),
    stripe_price_id character varying(255),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    UNIQUE (locale, slug)
);

-- vimeo_video_id is the canonical source for premium class playback.
-- video_url is kept as a fallback (legacy seeds, free preview clips
-- hosted outside Vimeo); it will be dropped once every class is on
-- Vimeo. Classes must have either vimeo_video_id or video_url set.
CREATE TABLE public.classes (
    id serial PRIMARY KEY,
    module_id integer NOT NULL,
    locale public.locale_code NOT NULL,
    module_level integer NOT NULL,
    title character varying(255) NOT NULL,
    cover character varying(255),
    short_description character varying(255),
    full_description text,
    key_concepts text,
    video_url character varying(255),
    vimeo_video_id character varying(64),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    UNIQUE (module_id, module_level, locale)
);

CREATE TABLE public.resources (
    id serial PRIMARY KEY,
    type public.resource_types NOT NULL,
    contents text NOT NULL
);

-- Composite PK so the same resource can be attached to several classes.
CREATE TABLE public.class_resources (
    class_id integer NOT NULL,
    resource_id integer NOT NULL,
    PRIMARY KEY (class_id, resource_id)
);

CREATE TABLE public.discounts (
    id serial PRIMARY KEY,
    code character varying(255) NOT NULL UNIQUE,
    type public.discount_types NOT NULL,
    value integer NOT NULL,
    scope public.discount_scope_types NOT NULL,
    module_ids integer[] NOT NULL,
    max_redemptions integer,
    redeem_by timestamp without time zone,
    active boolean NOT NULL DEFAULT true,
    stripe_coupon_id character varying(255),
    stripe_promotion_code_id character varying(255),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW()
);

-- One row per Stripe Checkout session. user_id is uuid (matches users.id);
-- a user can have many orders, so it is NOT unique here. user_id is
-- nullable so account erasure (GDPR RTBF) can null it via ON DELETE
-- SET NULL — paid orders must be retained for fiscal obligations
-- (10 years in France).
CREATE TABLE public.orders (
    id serial PRIMARY KEY,
    user_id uuid,
    status public.order_status NOT NULL,
    currency character varying(3) NOT NULL DEFAULT 'EUR',
    subtotal_cents integer NOT NULL,
    vat_cents integer NOT NULL,
    discount_cents integer NOT NULL DEFAULT 0,
    total_cents integer NOT NULL,
    vat_country character varying(2),
    promotion_code character varying(255),
    customer_snapshot jsonb,
    stripe_checkout_session_id character varying(255) UNIQUE,
    stripe_payment_intent_id character varying(255) UNIQUE,
    stripe_invoice_id character varying(255),
    stripe_invoice_pdf_url character varying(255),
    stripe_receipt_url character varying(255),
    paid_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE public.purchases (
    id serial PRIMARY KEY,
    order_id integer NOT NULL,
    user_id uuid NOT NULL,
    module_id integer NOT NULL,
    module_level integer NOT NULL DEFAULT 1,
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, module_id)
);

CREATE TABLE public.faqs (
    id serial PRIMARY KEY,
    question character varying(255) NOT NULL,
    answer text NOT NULL,
    locale public.locale_code NOT NULL
);

CREATE TABLE public.home_reviews (
    id serial PRIMARY KEY,
    locale public.locale_code NOT NULL,
    name character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    image_url character varying(255) NOT NULL,
    description character varying(255) NOT NULL
);

-- Hitos de la trayectoria mostrados en la página "About". El cliente los
-- edita desde el CMS. Lleva un id serial como PK porque Directus no
-- soporta primary keys compuestas; la unicidad funcional sigue siendo
-- (milestone_date, locale).
CREATE TABLE public.career_milestones (
    id serial PRIMARY KEY,
    milestone_date date NOT NULL,
    locale public.locale_code NOT NULL,
    title character varying(255) NOT NULL,
    description character varying(255) NOT NULL,
    UNIQUE (milestone_date, locale)
);

-- Localised free-form content blocks (hero text, footer copy, etc.)
-- referenced from the frontend by tag. El backend consulta por
-- (tag, locale) — se mantiene como UNIQUE. La PK es un id serial para
-- que Directus pueda gestionar las filas (no admite PKs compuestas).
CREATE TABLE public.tagged_info (
    id serial PRIMARY KEY,
    tag character varying(64) NOT NULL,
    locale public.locale_code NOT NULL,
    value text NOT NULL,
    UNIQUE (tag, locale)
);

-- Reseñas escritas por usuarios reales que ya tienen cuenta. Distintas
-- de `home_reviews` (lista curada por la admin desde el CMS). Una
-- reseña por usuario y locale para que la home no se llene de copias
-- del mismo autor.
CREATE TABLE public.user_reviews (
    id serial PRIMARY KEY,
    user_id uuid NOT NULL,
    locale public.locale_code NOT NULL,
    rating smallint,
    content character varying(600) NOT NULL,
    published boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, locale)
);

CREATE TABLE public.user_comments (
    class_id integer NOT NULL,
    user_id uuid NOT NULL,
    comment character varying(1024) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, user_id)
);

-- Pre-issued one-shot tokens used by email verification and password reset.
-- Each row is consumed once and then deleted by the worker that handles it.
CREATE TABLE public.user_registrations (
    user_id uuid NOT NULL,
    registration_id uuid PRIMARY KEY,
    expiry_date timestamp without time zone NOT NULL
);

-- Bloques de la página /privacy gestionados por el admin desde el CMS.
-- Uno por (locale, position): `position` ordena los items del acordeón
-- y `title`/`body` son el contenido localizado.
CREATE TABLE public.privacy_sections (
    id serial PRIMARY KEY,
    locale public.locale_code NOT NULL,
    position integer NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW(),
    UNIQUE (locale, position)
);
CREATE INDEX privacy_sections_locale_position_idx ON public.privacy_sections (locale, position);

-- Eventos del calendario compartido (clases en directo + presenciales).
-- Fecha concreta por evento — no recurrente — para que el equipo pueda
-- editar la programación de cada semana de forma independiente.
CREATE TABLE public.calendar_events (
    id serial PRIMARY KEY,
    locale public.locale_code NOT NULL,
    date date NOT NULL,
    start_time character varying(5) NOT NULL,
    end_time character varying(5) NOT NULL,
    title character varying(255) NOT NULL,
    kind public.calendar_event_kind NOT NULL,
    location character varying(255),
    created_at timestamp without time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp without time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX calendar_events_locale_date_idx ON public.calendar_events (locale, date);

--
-- Foreign keys
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.class_resources
    ADD CONSTRAINT class_resources_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.class_resources
    ADD CONSTRAINT class_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_comments
    ADD CONSTRAINT user_comments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_comments
    ADD CONSTRAINT user_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_reviews
    ADD CONSTRAINT user_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_registrations
    ADD CONSTRAINT user_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
