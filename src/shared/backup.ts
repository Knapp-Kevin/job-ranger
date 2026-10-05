export const JOB_RANGER_BACKUP_FORMAT = "job-ranger-backup" as const;
export const JOB_RANGER_BACKUP_VERSION = 1 as const;

/**
 * Single-file portable archive wrapping a backup bundle. This is the
 * interchange contract between the Electron and web/PWA runtimes.
 */
export const JOB_RANGER_ARCHIVE_FORMAT = "job-ranger-portable-archive" as const;
export const JOB_RANGER_ARCHIVE_VERSION = 1 as const;
export const JOB_RANGER_ARCHIVE_FILE_EXTENSION = ".jobranger" as const;

export interface JobRangerArchiveProducer {
  runtime: "electron" | "web";
  channel: string;
  appVersion: string;
  buildId: string;
}

export interface JobRangerArchiveManifest {
  format: typeof JOB_RANGER_ARCHIVE_FORMAT;
  archiveVersion: typeof JOB_RANGER_ARCHIVE_VERSION;
  createdAt: string;
  producer: JobRangerArchiveProducer;
  content: {
    format: typeof JOB_RANGER_BACKUP_FORMAT;
    version: typeof JOB_RANGER_BACKUP_VERSION;
  };
  backupManifest: {
    path: "manifest.json";
    sha256: string;
    bytes: number;
  };
}

export interface BackupArchiveRecord {
  path: string;
  fileName: string;
  bytes: number;
  sha256: string;
}

export interface BackupFileRecord {
  path: string;
  bytes: number;
  sha256: string;
}

export interface BackupMigrationRecord {
  version: number;
  name: string;
}

export interface BackupManagedPathRecord {
  table: "source_artifacts" | "resume_artifacts";
  id: string;
  relativePath: string;
}

export interface JobRangerBackupManifest {
  format: typeof JOB_RANGER_BACKUP_FORMAT;
  version: typeof JOB_RANGER_BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  database: BackupFileRecord;
  artifactFiles: BackupFileRecord[];
  migrations: BackupMigrationRecord[];
  managedPaths: BackupManagedPathRecord[];
}

export interface BackupSummary {
  bundlePath: string;
  createdAt: string;
  appVersion: string;
  artifactFileCount: number;
  totalBytes: number;
}

export interface BackupCreateResult {
  manifest: JobRangerBackupManifest;
  summary: BackupSummary;
  /** Present when the backup was written as a single-file portable archive. */
  archive?: BackupArchiveRecord;
}

export interface BackupRestoreSelection {
  bundlePath: string;
  /** Archive provenance when the selection came from a `.jobranger` file. */
  archive?: JobRangerArchiveManifest;
  manifest: JobRangerBackupManifest;
  summary: BackupSummary;
  warnings: string[];
}

export interface BackupDesktopApi {
  backups: {
    create: () => Promise<BackupCreateResult | null>;
    selectRestore: () => Promise<BackupRestoreSelection | null>;
    stageRestore: (bundlePath: string) => Promise<{ restarting: true }>;
  };
}
