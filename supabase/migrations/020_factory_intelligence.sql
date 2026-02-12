-- Migration 020: Factory Intelligence
-- Adds document categories and element-tagged messages

-- A. Document categories
-- Categories: drawing (Teikning), rebar (Armeringsmynd), concrete_spec (Steypuskýrsla), other (Annað)
ALTER TABLE project_documents ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

-- B. Element-tagged messages
-- Optional element reference on project messages
ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS element_id uuid REFERENCES elements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_project_messages_element_id ON project_messages(element_id);
