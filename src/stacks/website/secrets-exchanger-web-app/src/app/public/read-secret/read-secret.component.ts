import { Clipboard } from "@angular/cdk/clipboard";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatTooltipModule } from "@angular/material/tooltip";
import { RouterModule } from "@angular/router";
import { finalize } from "rxjs/operators";
import { ClientEncryptionService } from "../client-encryption.service";
import { SecretsService } from "../secrets.service";

interface ReadSecretForm {
  passphrase: FormControl<string>;
}

@Component({
  selector: "app-read-secret",
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: "./read-secret.component.html",
  styleUrl: "./read-secret.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadSecretComponent implements OnInit {
  private readonly secretsService = inject(SecretsService);
  private readonly clientEnc = inject(ClientEncryptionService);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  readonly encryptedInput = input<string>();

  protected readonly form: FormGroup<ReadSecretForm> = new FormGroup<ReadSecretForm>({
    passphrase: new FormControl("", { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly decrypted = signal<string | null>(null);
  protected readonly showPassphrase = signal(false);
  /** True when the URL is missing the `#key=` fragment — link is incomplete. */
  protected readonly keyMissing = signal(false);

  private encryptedToken = "";
  private fragmentKey = "";

  ngOnInit(): void {
    this.encryptedToken = this.encryptedInput() ?? "";

    // The key lives only in the URL fragment — it is never sent to the server.
    const hash = window.location.hash; // e.g. "#key=<base64>"
    const match = hash.match(/[#&]key=([^&]*)/);
    if (match) {
      try {
        this.fragmentKey = decodeURIComponent(match[1]);
      } catch {
        this.fragmentKey = "";
      }
    }

    this.keyMissing.set(!this.fragmentKey || !this.encryptedToken);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting() || this.keyMissing()) return;

    const { passphrase } = this.form.getRawValue();
    this.submitting.set(true);
    this.decrypted.set(null);

    this.secretsService
      .retrieveSecret(this.encryptedToken)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: async ({ encryptedData }) => {
          try {
            const plaintext = await this.clientEnc.decryptSecret(encryptedData, this.fragmentKey);
            const parsed: { secretString: string; passphrase?: string } = JSON.parse(plaintext);

            if ((parsed.passphrase ?? "") !== (passphrase ?? "")) {
              this.snackBar.open(
                "Wrong passphrase. The secret has been destroyed and cannot be recovered.",
                "Dismiss",
                { duration: 8000, panelClass: "app-notification-error" },
              );
              return;
            }

            this.decrypted.set(parsed.secretString);
          } catch {
            this.snackBar.open(
              "Decryption failed. The link may be corrupt or the key is wrong.",
              "Dismiss",
              { duration: 6000, panelClass: "app-notification-error" },
            );
          }
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  protected copyDecryptedToClipboard(): void {
    const value = this.decrypted();
    if (!value) return;
    this.clipboard.copy(value);
    this.snackBar.open("Decrypted message copied to clipboard", "Got it", {
      duration: 4000,
      panelClass: "app-notification-success",
    });
  }

  protected togglePassphrase(): void {
    this.showPassphrase.update((v) => !v);
  }

  private handleError(error: HttpErrorResponse): void {
    const message =
      error.status === 404
        ? "This secret is no longer available. It may have already been read or expired."
        : error.status === 400
          ? "Decryption failed. The encrypted token appears to be invalid."
          : "Something went wrong while retrieving the secret. Please try again.";

    this.snackBar.open(message, "Dismiss", {
      duration: 6000,
      panelClass: "app-notification-error",
    });
  }
}
