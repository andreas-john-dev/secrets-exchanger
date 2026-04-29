import { Clipboard } from "@angular/cdk/clipboard";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
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
import { SecretsService } from "../secrets.service";

const MAX_SECRET_LENGTH = 4096;

interface CreateSecretForm {
  message: FormControl<string>;
  passphrase: FormControl<string>;
}

@Component({
  selector: "app-create-secret",
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
  templateUrl: "./create-secret.component.html",
  styleUrl: "./create-secret.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSecretComponent {
  private readonly secretsService = inject(SecretsService);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly maxLength = MAX_SECRET_LENGTH;
  protected readonly form: FormGroup<CreateSecretForm> = new FormGroup<CreateSecretForm>({
    message: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_SECRET_LENGTH)],
    }),
    passphrase: new FormControl("", { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly encrypted = signal<string | null>(null);
  protected readonly showPassphrase = signal(false);

  protected readonly secretUrl = computed(() => {
    const value = this.encrypted();
    if (!value) return "";
    return `${window.location.origin}/public/read-secret?encryptedInput=${encodeURIComponent(value)}`;
  });

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    const { message, passphrase } = this.form.getRawValue();
    this.submitting.set(true);

    this.secretsService
      .encrypt(message, passphrase || undefined)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ encryptedResponse }) => {
          this.encrypted.set(encryptedResponse);
          this.copyLinkToClipboard();
        },
        error: () => {
          this.snackBar.open(
            "Something went wrong while encrypting. Please try again.",
            "Dismiss",
            { duration: 5000, panelClass: "app-notification-error" },
          );
        },
      });
  }

  protected copyLinkToClipboard(): void {
    const url = this.secretUrl();
    if (!url) return;
    this.clipboard.copy(url);
    this.snackBar.open("Secret link copied to clipboard", "Got it", {
      duration: 4000,
      panelClass: "app-notification-success",
    });
  }

  protected reset(): void {
    this.encrypted.set(null);
    this.form.reset({ message: "", passphrase: "" });
  }

  protected togglePassphrase(): void {
    this.showPassphrase.update((v) => !v);
  }
}
