export {};

declare global {
  interface CloudflareBindings {
    PLAID_MOCKED_SERVICE_STATE: DurableObjectNamespace;
  }
}
