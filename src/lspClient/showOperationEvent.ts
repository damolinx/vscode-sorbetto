import { SorbetShowOperationParams } from '../lsp/showOperationNotification';
import { SorbetClient } from './sorbetClient';

export interface ShowOperationEvent {
  readonly client: SorbetClient;
  readonly params: SorbetShowOperationParams;
}
