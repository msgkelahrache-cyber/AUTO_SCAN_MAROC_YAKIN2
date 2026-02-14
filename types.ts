
export type UserRole = 'admin' | 'agent';
export type FuelType = 'Essence' | 'Diesel' | 'Hybride' | 'Électrique' | 'N/A';
export type ScanType = 'vin' | 'carte_grise';
export type AppLanguage = 'fr' | 'ar';

export interface UserPermissions {
  dashboard: boolean;
  scanner: boolean;
  history: boolean;
  chat: boolean;
  configGlobal: boolean;
  configCompany: boolean;
  configLocations: boolean;
  configUsers: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  avatar: string;
  permissions: UserPermissions;
}

export interface AppLocation {
  id: string;
  name: string;
}

export interface AppSettings {
  duplicateThresholdHours: number;
  monthlyTarget: number;
  companyName: string;
  appName: string;
  language: AppLanguage;
}

export interface VehicleAnalysis {
  vin?: string;
  brand: string;
  model: string;
  fuelType: FuelType;
  motorization?: string;
  yearOfManufacture: string;
  registrationYear?: string;
  licensePlate?: string;
  inventoryNotes: string;
  color?: string;
  deductionReasoning?: string;
  marketValueMin?: number;
  marketValueMax?: number;
  marketValueJustification?: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  analysis: VehicleAnalysis;
  userId: string;
  userName: string;
  locationId: string;
  location: string;
  scanDuration?: number;
  deepAnalysisDuration?: number;
  analysisReport?: string; 
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}