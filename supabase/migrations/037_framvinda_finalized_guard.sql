-- Migration 037: Database-level guard against modifying finalized periods
-- Prevents any UPDATE to period_lines or the period itself once status = 'finalized'
-- This is a defense-in-depth measure — the server actions already check, but this
-- ensures no bypass is possible at the database level.

-- Guard: prevent updating period_lines when parent period is finalized
CREATE OR REPLACE FUNCTION prevent_finalized_period_line_update()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM framvinda_periods
    WHERE id = NEW.period_id AND status = 'finalized'
  ) THEN
    RAISE EXCEPTION 'Cannot modify lines of a finalized period';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_finalized_period_lines
  BEFORE UPDATE ON framvinda_period_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_period_line_update();

-- Guard: prevent inserting new period_lines into a finalized period
CREATE TRIGGER guard_finalized_period_lines_insert
  BEFORE INSERT ON framvinda_period_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_period_line_update();

-- Guard: prevent deleting period_lines from a finalized period
CREATE OR REPLACE FUNCTION prevent_finalized_period_line_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM framvinda_periods
    WHERE id = OLD.period_id AND status = 'finalized'
  ) THEN
    RAISE EXCEPTION 'Cannot delete lines from a finalized period';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_finalized_period_lines_delete
  BEFORE DELETE ON framvinda_period_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_period_line_delete();

-- Guard: prevent changing a finalized period's data fields (except status for reopen)
-- Allows: status change from 'finalized' to 'draft' (reopen action)
-- Blocks: any other field changes when status = 'finalized'
CREATE OR REPLACE FUNCTION prevent_finalized_period_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'finalized' THEN
    -- Allow reopening (status change back to draft)
    IF NEW.status = 'draft' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Cannot modify a finalized period. Reopen it first.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_finalized_period
  BEFORE UPDATE ON framvinda_periods
  FOR EACH ROW
  EXECUTE FUNCTION prevent_finalized_period_update();
