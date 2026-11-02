import type { Clock } from '../../../shared/domain/clock';
import type { IdGenerator } from '../../../shared/domain/id-generator';
import { RentalAgreement } from '../domain/rental-agreement';
import type { RentalAgreementUnitOfWork } from './rental-agreement-unit-of-work';
import { assertAgreementPlacement } from './rental-agreement-validation';

export interface CreateRentalAgreementInput {
  tenantId: string;
  propertyId: string;
  spaceId: string;
  startDate: string;
  endDate?: string | null;
  rentAmount: number;
  rentFrequency: string;
  firstRentDueDate: string;
  securityDepositAmount?: number | null;
  notes?: string | null;
}

export class CreateRentalAgreement {
  constructor(
    private readonly deps: {
      unitOfWork: RentalAgreementUnitOfWork;
      clock: Clock;
      idGenerator: IdGenerator;
    },
  ) {}

  execute(input: CreateRentalAgreementInput): RentalAgreement {
    return this.deps.unitOfWork.run((repositories) => {
      const agreement = RentalAgreement.create({
        id: this.deps.idGenerator.next(),
        tenantId: input.tenantId,
        spaceId: input.spaceId,
        startDate: input.startDate,
        endDate: input.endDate,
        rentAmount: input.rentAmount,
        rentFrequency: input.rentFrequency,
        firstRentDueDate: input.firstRentDueDate,
        securityDepositAmount: input.securityDepositAmount,
        notes: input.notes,
        createdAt: this.deps.clock.now(),
      });

      assertAgreementPlacement(repositories, {
        tenantId: agreement.tenantId,
        propertyId: input.propertyId,
        spaceId: agreement.spaceId,
        startDate: agreement.startDate,
        effectiveEndDate: agreement.effectiveEndDate,
      });

      repositories.agreements.save(agreement);
      return agreement;
    });
  }
}
