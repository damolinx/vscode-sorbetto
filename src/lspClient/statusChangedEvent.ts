import { LspStatus } from '../types';
import { SorbetClient } from './sorbetClient';

export interface StatusChangedEvent {
  readonly client: SorbetClient;
  readonly status: LspStatus;
}
