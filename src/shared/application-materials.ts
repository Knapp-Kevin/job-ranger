export type ApplicationMaterialKind = "cover-letter";
export type ApplicationMaterialPurpose = "submitted";

export interface ApplicationMaterialGenerateInput {
  applicationId: string;
  evidenceIds: string[];
}

export interface ApplicationMaterialProjection {
  id: string;
  applicationId: string;
  kind: ApplicationMaterialKind;
  evidenceIds: string[];
  content: string;
  staleEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationMaterialArtifact {
  id: string;
  projectionId: string;
  applicationId: string;
  kind: ApplicationMaterialKind;
  version: number;
  content: string;
  contentHash: string;
  purpose: ApplicationMaterialPurpose;
  recordedAt: string;
}

export interface ApplicationMaterialDetail {
  applicationId: string;
  projection: ApplicationMaterialProjection | null;
  artifacts: ApplicationMaterialArtifact[];
}

export interface ApplicationMaterialsDesktopApi {
  applicationMaterials: {
    get: (applicationId: string) => Promise<ApplicationMaterialDetail>;
    generateCoverLetter: (
      input: ApplicationMaterialGenerateInput,
    ) => Promise<ApplicationMaterialProjection>;
    recordSubmitted: (projectionId: string) => Promise<ApplicationMaterialArtifact>;
  };
}
