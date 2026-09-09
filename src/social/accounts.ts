import { createBackend, type CloudSave, type GameBackend, type SessionRecord } from './backend';

export class AccountClient {
  private session: SessionRecord | null = null;

  constructor(private readonly backend: GameBackend) {}

  get token(): string | null {
    return this.session?.token ?? null;
  }

  get userId(): string | null {
    return this.session?.userId ?? null;
  }

  registerAndSignIn(username: string, password: string): SessionRecord {
    this.backend.register(username, password);
    return this.login(username, password);
  }

  login(username: string, password: string): SessionRecord {
    this.session = this.backend.login(username, password);
    return this.session;
  }

  saveCloud(save: CloudSave): CloudSave {
    if (!this.session) throw new Error('Not signed in');
    return this.backend.saveCloud(this.session.token, save);
  }

  loadCloud(): CloudSave {
    if (!this.session) throw new Error('Not signed in');
    return this.backend.loadCloud(this.session.token);
  }
}

export function createAccountClient(backend: GameBackend = createBackend()): AccountClient {
  return new AccountClient(backend);
}
