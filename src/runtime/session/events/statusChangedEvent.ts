import { SorbetClientSession } from '../sorbetClientSession';
import { SorbetClientSessionStatus } from '../sorbetClientSessionStatus';

export interface StatusChangedEvent {
  readonly session: SorbetClientSession;
  readonly status: SorbetClientSessionStatus;
  readonly oldStatus: SorbetClientSessionStatus;
}
