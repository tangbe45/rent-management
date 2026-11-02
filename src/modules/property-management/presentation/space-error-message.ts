import type { TranslationKey } from '../../../shared/i18n';
import { PropertyNotFoundError } from '../application/errors';
import {
  PropertyArchivedError,
  PropertySpaceCannotArchiveError,
  PropertySpaceCycleError,
  PropertySpaceNameAlreadyExistsError,
  PropertySpaceParentArchivedError,
  PropertySpaceParentMismatchError,
} from '../application/property-space-errors';

/**
 * Maps a Property Space domain/application error to a user-facing translation
 * key. The generic message is used for anything not explicitly handled so the
 * UI never leaks a raw technical message.
 */
export function spaceErrorMessage(
  translate: (key: TranslationKey) => string,
  error: unknown,
): string {
  if (error instanceof PropertySpaceNameAlreadyExistsError) {
    return translate('spaces.error.nameTaken');
  }
  if (error instanceof PropertySpaceParentArchivedError) {
    return translate('spaces.error.parentArchived');
  }
  if (error instanceof PropertySpaceParentMismatchError) {
    return translate('spaces.error.parentMismatch');
  }
  if (error instanceof PropertySpaceCycleError) {
    return translate('spaces.error.cycle');
  }
  if (error instanceof PropertySpaceCannotArchiveError) {
    return translate('spaces.error.archiveBlocked');
  }
  if (error instanceof PropertyArchivedError) {
    return translate('spaces.error.propertyArchived');
  }
  if (error instanceof PropertyNotFoundError) {
    return translate('spaces.error.generic');
  }
  return translate('spaces.error.generic');
}