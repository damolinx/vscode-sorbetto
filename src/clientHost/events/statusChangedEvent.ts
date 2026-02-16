import { SorbetClientHost } from '../sorbetClientHost';
import { SorbetClientStatus } from '../sorbetClientStatus';

export interface StatusChangedEvent {
  readonly clientHost: SorbetClientHost;
  readonly status: SorbetClientStatus;
}
