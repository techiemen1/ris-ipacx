// src/types/patient.ts

export type ClinicalInfo = {
  allergies?: string[];
  renalFunction?: string;
  alerts?: string[];
};

export type PatientStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed';

export interface Patient {
  id: string;
  name: string; // aggregated first_name + last_name usually
  age?: number;
  gender: string;
  dob?: string;
  mrn?: string; // Medical Record Number
  studyDescription?: string;
  date?: string; // last visit or similar
  modality?: string;

  // New Enhanced Fields
  clinical_info?: ClinicalInfo;
  portal_access?: boolean;
  status?: PatientStatus; // Current journey status

  // Indian Context
  aadhaarNumber?: string; // Legacy/Specific
  abhaId?: string;
  preferredLanguage?: string;

  // Enhanced Registration
  idType?: string;
  idNumber?: string;
  insuranceProvider?: string;
  policyType?: string;
  policyValidity?: string;
}
