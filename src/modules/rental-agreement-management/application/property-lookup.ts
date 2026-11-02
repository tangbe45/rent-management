/**
 * Minimal read model of a Property used by Rental Agreements. The property is
 * derived through the agreement's space; it is never stored on the agreement.
 */
export interface PropertyReference {
  id: string;
  name: string;
  isActive: boolean;
}

export interface PropertyLookup {
  findById(id: string): PropertyReference | null;
}
