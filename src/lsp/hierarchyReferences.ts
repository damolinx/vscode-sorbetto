import * as vslc from 'vscode-languageclient';

export const HIERARCHY_REFERENCES_REQUEST = new vslc.RequestType<
  vslc.ReferenceParams,
  vslc.Location[],
  void
>('sorbet/hierarchyReferences');

/**
 * See https://sorbet.org/docs/lsp#sorbethierarchyreferences-request
 */
export interface HierarchyReferencesRequest {
  sendRequest(
    requestType: typeof HIERARCHY_REFERENCES_REQUEST,
    param: vslc.ReferenceParams,
    token?: vslc.CancellationToken,
  ): Promise<vslc.Location[]>;
}
