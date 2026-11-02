import {
  PropertyArchivedError,
  PropertySpaceCannotArchiveError,
  PropertySpaceCycleError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from '../application/property-space-errors';
import { spaceErrorMessage } from './space-error-message';

const translate = (key: string): string => `translated:${key}`;

describe('spaceErrorMessage', () => {
  it('maps each known application error to its translation key', () => {
    expect(spaceErrorMessage(translate, new PropertySpaceNameAlreadyExistsError('Room 1'))).toBe(
      'translated:spaces.error.nameTaken',
    );
    expect(spaceErrorMessage(translate, new PropertySpaceParentArchivedError('p'))).toBe(
      'translated:spaces.error.parentArchived',
    );
    expect(spaceErrorMessage(translate, new PropertySpaceParentMismatchError('p', 'q'))).toBe(
      'translated:spaces.error.parentMismatch',
    );
    expect(spaceErrorMessage(translate, new PropertySpaceCycleError('s'))).toBe(
      'translated:spaces.error.cycle',
    );
    expect(spaceErrorMessage(translate, new PropertySpaceCannotArchiveError('s'))).toBe(
      'translated:spaces.error.archiveBlocked',
    );
    expect(spaceErrorMessage(translate, new PropertyArchivedError('p'))).toBe(
      'translated:spaces.error.propertyArchived',
    );
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(spaceErrorMessage(translate, new Error('boom'))).toBe('translated:spaces.error.generic');
  });
});