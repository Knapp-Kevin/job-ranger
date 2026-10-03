export type ApplicationMaterialKind = "cover-letter";
export type ApplicationMaterialStatus = "draft";

export interface ApplicationMaterialSection {
  id: string;
  label: "opening" | "evidence" | "closing";
  text: string;
  evidenceIds: string[];
}

export interface ApplicationMaterialProjection {
  id: string;
  applicationId: string;
  jobId: string;
  kind: ApplicationMaterialKind;
  version: number;
  status: ApplicationMaterialStatus;
  sections: ApplicationMaterialSection[];
  selectedEvidenceIds: string[];
  staleEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationMaterialCreateResult {
  projection: ApplicationMaterialProjection;
  warnings: string[];
}

export interface ApplicationMaterialsDesktopApi {
  applicationMaterials: {
    list: (applicationId: string) => Promise<ApplicationMaterialProjection[]>;
    createCoverLetter: (applicationId: string) => Promise<ApplicationMaterialCreateResult>;
    delete: (projectionId: string) => Promise<void>;
  };
}
