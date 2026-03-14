import { createApp } from './app';
import { PlaidMockedServiceState } from './state';

const app = createApp();

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;

export { PlaidMockedServiceState };
