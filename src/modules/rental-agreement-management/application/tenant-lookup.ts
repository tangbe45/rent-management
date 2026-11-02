/**
 * Minimal read model the Rental Agreement module needs from Tenant Management to
 * validate placement and to render list/detail names. This is the
 * dependency-inversion seam: the rental-agreement domain never imports the
 * Tenant domain.
 */
export interface TenantReference {
  id: string;
  fullName: string;
  isActive: boolean;
}

export interface TenantLookup {
  findById(id: string): TenantReference | null;
}
