/** Stable server-facing API for the optional Google Workspace integration. */
export {
  GoogleWorkspaceConfigError,
  getNotificationRecipient,
  getBookingSlotMinutes,
  isOwnerAliasEmail,
  hasGoogleWorkspaceClientCredentials,
  hasGoogleWorkspaceAccess,
} from './config'
export {
  GOOGLE_WORKSPACE_SCOPES,
  createGoogleOAuthConsentUrl,
  exchangeGoogleCodeForCredentials,
} from './oauth'
export {
  AvailabilityRangeError,
  buildAvailabilityQueryWindow,
  buildAvailabilitySlots,
} from './availability'
export { queryBusyRanges, createGoogleMeetBooking } from './calendar'
export { sendEmail } from './delivery'
export { BookingConflictError, BookingPendingError } from './bookingCoordinator'
export { CalendarUnavailableError } from './freeBusy'
