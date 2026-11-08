import { SorbetClientHost } from '../sorbetClientHost';
import { SorbetClientHostStatus } from '../sorbetClientHostStatus';

export interface StatusChangedEvent {
  readonly clientHost: SorbetClientHost;
  readonly status?: SorbetClientHostStatus;
}
