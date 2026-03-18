export type LoginState = 'unknown' | 'logged_out' | 'logged_in';

export class GameManager {
  private static _loginState: LoginState = 'unknown';
  private static _userId: string | null = null;
  private static _language: string = 'zh-Hans';

  static get loginState(): LoginState {
    return this._loginState;
  }

  static set loginState(v: LoginState) {
    this._loginState = v;
  }

  static get userId(): string | null {
    return this._userId;
  }

  static set userId(v: string | null) {
    this._userId = v;
  }

  static get language(): string {
    return this._language;
  }

  static set language(v: string) {
    this._language = v;
  }
}

