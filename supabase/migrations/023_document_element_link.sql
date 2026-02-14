-- Migration: Link documents directly to elements
-- This allows drawings to be associated with specific elements for quick factory floor access

-- Add element_id FK to project_documents
alter table project_documents
  add column element_id uuid references elements(id) on delete set null;

-- Index for quick lookup of drawings per element
create index idx_project_documents_element_id
  on project_documents(element_id)
  where element_id is not null;

-- Composite index for finding drawings by category + project
create index idx_project_documents_category_project
  on project_documents(project_id, category);
