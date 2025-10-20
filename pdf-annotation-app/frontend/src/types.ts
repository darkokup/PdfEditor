export interface Annotation {
  id: string;
  type: 'text' | 'date' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  value: string;
  created_at: string;
  // New styling properties
  multiline?: boolean;
  transparent?: boolean;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderWidth?: number; // Line width in pixels (1-10)
}

export interface ProjectData {
  project_id: string;
  created_at: string;
  pdf_filename: string;
  pdf_data: string;
  annotations: Annotation[];
  metadata: {
    [key: string]: any;
  };
}

export interface ProjectSummary {
  project_id: string;
  created_at: string;
  pdf_filename: string;
  filename: string;
  annotation_count: number;
}