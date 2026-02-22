-- Migration: Add soft delete / deactivation to project_documents
-- This allows drawings to be marked as inactive while preserving history.

alter table "public"."project_documents"
add column if not exists "is_active" boolean default true,
add column if not exists "deactivated_at" timestamp with time zone,
add column if not exists "deactivated_by" uuid references auth.users(id),
add column if not exists "deactivation_reason" text;

-- Index for filtering out inactive documents quickly
create index if not exists "idx_project_documents_is_active" on "public"."project_documents"("is_active");
