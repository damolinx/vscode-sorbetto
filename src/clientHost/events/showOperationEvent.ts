import { SorbetShowOperationParams } from '../../client/spec/showOperationNotification';
import { SorbetClientHost } from '../sorbetClientHost';

export interface ShowOperationEvent {
  readonly clientHost: SorbetClientHost;
  readonly operation: SorbetShowOperationParams;
}
