export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_identifier TEXT,
        frequency_minutes INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        last_run_status TEXT NOT NULL DEFAULT 'idle',
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_job_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        employment_type TEXT,
        url TEXT NOT NULL,
        description_snippet TEXT NOT NULL,
        salary_min REAL,
        salary_max REAL,
        salary_currency TEXT,
        salary_text TEXT,
        post_date TEXT,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_new INTEGER NOT NULL DEFAULT 1,
        matched_filter_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE (company_id, source_job_id)
      );

      CREATE TABLE IF NOT EXISTS filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        title_include TEXT NOT NULL DEFAULT '[]',
        title_exclude TEXT NOT NULL DEFAULT '[]',
        keywords_include TEXT NOT NULL DEFAULT '[]',
        keywords_exclude TEXT NOT NULL DEFAULT '[]',
        salary_min REAL,
        location_include TEXT NOT NULL DEFAULT '[]',
        location_exclude TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scrape_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        jobs_found_count INTEGER NOT NULL DEFAULT 0,
        jobs_matched_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_last_seen_at ON jobs(last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scrape_runs_company_id ON scrape_runs(company_id);
      CREATE INDEX IF NOT EXISTS idx_scrape_runs_started_at ON scrape_runs(started_at DESC);
    `,
  },
  {
    version: 2,
    name: "circuit_breaker",
    sql: `
      ALTER TABLE companies ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE companies ADD COLUMN circuit_open_until TEXT;
    `,
  },
  {
    version: 3,
    name: "career_intelligence_persistence",
    sql: `
      CREATE TABLE IF NOT EXISTS career_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        home_location TEXT NOT NULL DEFAULT '',
        radius_miles INTEGER,
        minimum_pay REAL,
        pay_basis TEXT NOT NULL DEFAULT 'hourly',
        target_titles TEXT NOT NULL DEFAULT '[]',
        skills TEXT NOT NULL DEFAULT '[]',
        certifications TEXT NOT NULL DEFAULT '[]',
        sectors TEXT NOT NULL DEFAULT '[]',
        on_call_preference TEXT NOT NULL DEFAULT 'either',
        full_time_only INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company_name TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_id
        ON applications(job_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status
        ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_applications_updated_at
        ON applications(updated_at DESC);
    `,
  },
  {
    version: 4,
    name: "career_evidence_contracts",
    sql: `
      CREATE TABLE IF NOT EXISTS source_artifacts (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        original_name TEXT NOT NULL,
        media_type TEXT NOT NULL,
        detected_format TEXT,
        content_hash TEXT NOT NULL,
        managed_path TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        imported_at TEXT NOT NULL,
        parser_id TEXT,
        parser_version TEXT,
        extraction_state TEXT NOT NULL,
        warnings_json TEXT NOT NULL DEFAULT '[]'
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_source_artifacts_content_hash
        ON source_artifacts(content_hash);

      CREATE TABLE IF NOT EXISTS extraction_snapshots (
        id TEXT PRIMARY KEY,
        source_artifact_id TEXT NOT NULL REFERENCES source_artifacts(id) ON DELETE CASCADE,
        parser_id TEXT NOT NULL,
        parser_version TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        structured_payload_json TEXT,
        warnings_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_extraction_snapshots_artifact
        ON extraction_snapshots(source_artifact_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS candidate_evidence (
        id TEXT PRIMARY KEY,
        subject_type TEXT NOT NULL,
        organization TEXT,
        title_or_name TEXT,
        start_date TEXT,
        end_date TEXT,
        statement TEXT NOT NULL,
        action TEXT,
        context TEXT,
        skills_json TEXT NOT NULL DEFAULT '[]',
        methods_or_tools_json TEXT NOT NULL DEFAULT '[]',
        scope_json TEXT NOT NULL DEFAULT '[]',
        outcomes_json TEXT NOT NULL DEFAULT '[]',
        metrics_json TEXT NOT NULL DEFAULT '[]',
        verification_state TEXT NOT NULL,
        confidence REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_candidate_evidence_subject
        ON candidate_evidence(subject_type);
      CREATE INDEX IF NOT EXISTS idx_candidate_evidence_verification
        ON candidate_evidence(verification_state);

      CREATE TABLE IF NOT EXISTS evidence_source_links (
        id TEXT PRIMARY KEY,
        evidence_id TEXT NOT NULL REFERENCES candidate_evidence(id) ON DELETE CASCADE,
        source_artifact_id TEXT NOT NULL REFERENCES source_artifacts(id) ON DELETE CASCADE,
        extraction_snapshot_id TEXT REFERENCES extraction_snapshots(id) ON DELETE SET NULL,
        source_locator TEXT,
        source_text TEXT,
        relation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_evidence_source_links_evidence
        ON evidence_source_links(evidence_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_source_links_artifact
        ON evidence_source_links(source_artifact_id);

      CREATE TABLE IF NOT EXISTS job_requirements (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        normalized_term TEXT,
        importance REAL,
        source_text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_job_requirements_job
        ON job_requirements(job_id);

      CREATE TABLE IF NOT EXISTS requirement_evidence_maps (
        id TEXT PRIMARY KEY,
        job_requirement_id TEXT NOT NULL REFERENCES job_requirements(id) ON DELETE CASCADE,
        evidence_id TEXT REFERENCES candidate_evidence(id) ON DELETE SET NULL,
        classification TEXT NOT NULL,
        explanation TEXT NOT NULL,
        created_by TEXT NOT NULL,
        user_confirmed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_requirement_evidence_maps_requirement
        ON requirement_evidence_maps(job_requirement_id);

      CREATE TABLE IF NOT EXISTS resume_projections (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        context TEXT NOT NULL,
        page_format TEXT NOT NULL,
        source_projection_id TEXT REFERENCES resume_projections(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        sections_json TEXT NOT NULL DEFAULT '[]',
        selected_evidence_ids_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_resume_projections_job
        ON resume_projections(job_id);

      CREATE TABLE IF NOT EXISTS resume_statements (
        id TEXT PRIMARY KEY,
        projection_id TEXT NOT NULL REFERENCES resume_projections(id) ON DELETE CASCADE,
        section TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        text TEXT NOT NULL,
        evidence_ids_json TEXT NOT NULL DEFAULT '[]',
        generation_mode TEXT NOT NULL,
        user_edited INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_resume_statements_projection
        ON resume_statements(projection_id, display_order);

      CREATE TABLE IF NOT EXISTS resume_artifacts (
        id TEXT PRIMARY KEY,
        projection_id TEXT NOT NULL REFERENCES resume_projections(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        format TEXT NOT NULL,
        managed_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        page_count INTEGER,
        truth_gate_result TEXT,
        parseability_result TEXT,
        relevance_review_result TEXT,
        created_at TEXT NOT NULL,
        UNIQUE (projection_id, version, format)
      );

      CREATE INDEX IF NOT EXISTS idx_resume_artifacts_projection
        ON resume_artifacts(projection_id, version DESC);

      CREATE TABLE IF NOT EXISTS application_artifact_links (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        resume_artifact_id TEXT NOT NULL REFERENCES resume_artifacts(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        UNIQUE (application_id, resume_artifact_id, purpose)
      );

      CREATE INDEX IF NOT EXISTS idx_application_artifact_links_application
        ON application_artifact_links(application_id);
    `,
  },
  {
    version: 5,
    name: "job_requirement_source_text",
    sql: `
      ALTER TABLE jobs ADD COLUMN description_text TEXT;
      ALTER TABLE jobs ADD COLUMN description_updated_at TEXT;

      CREATE TABLE IF NOT EXISTS job_requirement_analysis (
        job_id TEXT PRIMARY KEY,
        source_hash TEXT NOT NULL,
        normalizer_version INTEGER NOT NULL,
        analyzed_at TEXT NOT NULL
      );
    `,
  },
];
