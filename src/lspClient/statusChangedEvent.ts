import { SorbetClient } from './sorbetClient';
import { SorbetClientStatus } from './sorbetClientStatus';

export interface StatusChangedEvent {
  readonly client: SorbetClient;
  readonly status: SorbetClientStatus;
}
