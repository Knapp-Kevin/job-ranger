export const JOB_RANGER_BACKUP_FORMAT = "job-ranger-backup" as const;
export const JOB_RANGER_BACKUP_VERSION = 1 as const;

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
}

export interface BackupRestoreSelection {
  bundlePath: string;
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
