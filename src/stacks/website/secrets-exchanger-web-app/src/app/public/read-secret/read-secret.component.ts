import { Clipboard } from "@angular/cdk/clipboard";
import { HttpErrorResponse } from "@angular/common/http";
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from "@angular/core";
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

const MAX_INPUT_LENGTH = 4096;

interface ReadSecretForm {
  encryptedInput: FormControl<string>;
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
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  readonly encryptedInput = input<string>();

  protected readonly maxLength = MAX_INPUT_LENGTH;
  protected readonly form: FormGroup<ReadSecretForm> = new FormGroup<ReadSecretForm>({
    encryptedInput: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_INPUT_LENGTH)],
    }),
    passphrase: new FormControl("", { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly decrypted = signal<string | null>(null);
  protected readonly showPassphrase = signal(false);

  ngOnInit(): void {
    const fromUrl = this.encryptedInput();
    if (fromUrl) {
      this.form.controls.encryptedInput.setValue(fromUrl);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    const { encryptedInput, passphrase } = this.form.getRawValue();
    this.submitting.set(true);
    this.decrypted.set(null);

    this.secretsService
      .decrypt(encryptedInput, passphrase || undefined)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: ({ secretString }) => {
          this.decrypted.set(secretString);
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
          ? "Decryption failed. Please verify the passphrase and try again."
          : "Something went wrong while decrypting. Please try again.";

    this.snackBar.open(message, "Dismiss", {
      duration: 6000,
      panelClass: "app-notification-error",
    });
  }
}
