-- Database schema for Schedule Templates
-- Allows users to create reusable templates for daily schedules

-- Schedule templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_templates_name ON schedule_templates(name);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_created_at ON schedule_templates(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_templates_updated_at
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_templates_updated_at();

-- Sample template data (optional - uncomment to insert)
-- INSERT INTO schedule_templates (id, name, description, tasks) VALUES
-- ('tpl_workday', 'Standard Workday', 'Typical 9-5 workday schedule', 
--  '[
--    {"title": "Morning Routine", "start": "07:00", "durationMin": 60, "notes": "Exercise, breakfast, prep"},
--    {"title": "Deep Work Block 1", "start": "09:00", "durationMin": 120, "remind30m": true},
--    {"title": "Lunch Break", "start": "12:00", "durationMin": 60},
--    {"title": "Meetings & Collaboration", "start": "13:00", "durationMin": 120},
--    {"title": "Deep Work Block 2", "start": "15:00", "durationMin": 120, "remind30m": true},
--    {"title": "Wrap-up & Planning", "start": "17:00", "durationMin": 30}
--  ]'::jsonb
-- ),
-- ('tpl_weekend', 'Relaxed Weekend', 'Weekend routine with flexibility',
--  '[
--    {"title": "Sleep In & Breakfast", "start": "09:00", "durationMin": 90},
--    {"title": "Personal Projects", "start": "11:00", "durationMin": 120},
--    {"title": "Lunch", "start": "13:00", "durationMin": 60},
--    {"title": "Outdoor Activity", "start": "15:00", "durationMin": 120},
--    {"title": "Dinner & Relaxation", "start": "18:00", "durationMin": 180}
--  ]'::jsonb
-- );

-- Query to list all templates
-- SELECT id, name, description, jsonb_array_length(tasks) as task_count, created_at 
-- FROM schedule_templates 
-- ORDER BY created_at DESC;

-- Query to get a specific template with tasks
-- SELECT * FROM schedule_templates WHERE id = 'tpl_workday';
