type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    session: import("@auth").Session;
    user: import("@auth").User;
  }
}
