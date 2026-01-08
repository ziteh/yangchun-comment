import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { yangChunCommentStyles } from './yangchun-comment.styles';
import type { ApiService } from '../api/apiService';

@customElement('comment-admin')
export class CommentAdmin extends LitElement {
  static styles = [
    yangChunCommentStyles,
    css`
      :host {
        display: block;
      }

      .form-group {
        margin-bottom: var(--ycc-spacing-m);
      }

      label {
        display: block;
        margin-bottom: var(--ycc-spacing-s);
        font-weight: 500;
        color: var(--ycc-text-color);
      }

      input[type='text'],
      input[type='password'] {
        width: 100%;
        padding: var(--ycc-spacing-s);
        border: 1px solid var(--ycc-border-color);
        border-radius: var(--ycc-radius);
        font-family: inherit;
        font-size: var(--ycc-font-size);
        box-sizing: border-box;
        transition: border-color 0.2s;
      }

      input[type='text']:focus,
      input[type='password']:focus {
        outline: none;
        border-color: var(--ycc-primary-color);
      }

      button[type='submit'] {
        width: 100%;
        padding: var(--ycc-spacing-s) var(--ycc-spacing-m);
        margin-top: var(--ycc-spacing-s);
      }

      .message {
        margin-top: var(--ycc-spacing-m);
        padding: var(--ycc-spacing-s);
        border-radius: var(--ycc-radius);
        text-align: center;
        display: none;
      }

      .message.show {
        display: block;
      }

      .message.error {
        background-color: #fee;
        border: 1px solid #fcc;
        color: var(--ycc-error-color);
      }

      .message.success {
        background-color: #efe;
        border: 1px solid #cfc;
        color: #22c55e;
      }
    `,
  ];

  @property({ type: Object, attribute: false }) accessor apiService: ApiService | undefined;

  @state() private accessor username = '';
  @state() private accessor password = '';
  @state() private accessor errorMessage = '';
  @state() private accessor successMessage = '';
  @state() private accessor isLoading = false;
  @state() private accessor isLoggedIn = false;
  @state() private accessor isCheckingAuth = true;

  render() {
    if (this.isCheckingAuth) {
      return html`<div>Checking authentication status...</div>`;
    }

    if (this.isLoggedIn) {
      return this.renderAdminPanel();
    }
    return this.renderLoginForm();
  }

  async connectedCallback() {
    super.connectedCallback();
    await this.checkAuthStatus();
  }

  private renderLoginForm() {
    return html`
      <form @submit=${this.handleSubmit}>
        <div class="form-group">
          <label for="username">Username</label>
          <input
            type="text"
            id="username"
            .value=${this.username}
            @change=${this.handleUsernameChange}
            ?disabled=${this.isLoading}
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            .value=${this.password}
            @change=${this.handlePasswordChange}
            ?disabled=${this.isLoading}
            required
          />
        </div>
        <button type="submit" ?disabled=${this.isLoading}>
          ${this.isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div class="message error ${this.errorMessage ? 'show' : ''}">${this.errorMessage}</div>

      <div class="message success ${this.successMessage ? 'show' : ''}">${this.successMessage}</div>
    `;
  }

  private renderAdminPanel() {
    return html`
      <div>
        <p>You are logged in as admin</p>
        <button @click=${this.handleLogout} ?disabled=${this.isLoading}>
          ${this.isLoading ? 'Logging out...' : 'Logout'}
        </button>

        <div class="message error ${this.errorMessage ? 'show' : ''}">${this.errorMessage}</div>
        <div class="message success ${this.successMessage ? 'show' : ''}">
          ${this.successMessage}
        </div>
      </div>
    `;
  }

  private handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      this.successMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.apiService) {
      this.errorMessage = 'API service not available';
      this.isLoading = false;
      return;
    }

    try {
      const data = await this.apiService.adminLogin(this.username, this.password);

      if (data) {
        this.successMessage = data.message || 'Login successful';
        this.username = '';
        this.password = '';
        this.isLoggedIn = true;
        this.handleAuthStatusChange();
      } else {
        this.errorMessage = 'Login failed';
      }
    } catch (error) {
      this.errorMessage = `Error (${error}). Please try again.`;
    } finally {
      this.isLoading = false;
    }
  };

  private async checkAuthStatus() {
    if (!this.apiService) {
      this.isCheckingAuth = false;
      return;
    }

    try {
      this.isLoggedIn = await this.apiService.checkAdminAuth();
      if (this.isLoggedIn) {
        this.handleAuthStatusChange();
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      this.isLoggedIn = false;
    } finally {
      this.isCheckingAuth = false;
    }
  }

  private handleLogout = async () => {
    if (!this.apiService) {
      this.errorMessage = 'API service not available';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const success = await this.apiService.adminLogout();

      if (success) {
        this.successMessage = 'Logged out successfully';
        this.isLoggedIn = false;
        this.handleAuthStatusChange();
      } else {
        this.errorMessage = 'Logout failed';
      }
    } catch (error) {
      this.errorMessage = `Error (${error}). Please try again.`;
    } finally {
      this.isLoading = false;
    }
  };

  private handleUsernameChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.username = target.value;
  };

  private handlePasswordChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    this.password = target.value;
  };

  private handleAuthStatusChange = () => {
    this.dispatchEvent(
      new CustomEvent('auth-status-change', {
        detail: this.isLoggedIn,
        bubbles: true,
        composed: true,
      }),
    );
  };
}
