-- Cloud metadata and revision ledger. Snapshot JSON is a bounded compatibility
-- fallback while R2 is unavailable; binary assets never belong in this table.
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  current_revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_revisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  checksum TEXT NOT NULL,
  snapshot_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (project_id, revision)
);

CREATE INDEX IF NOT EXISTS project_revisions_project_revision_idx
  ON project_revisions(project_id, revision DESC);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  source_type TEXT NOT NULL,
  source_metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id);
