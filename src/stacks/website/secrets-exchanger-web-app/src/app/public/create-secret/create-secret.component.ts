import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AsyncPipe, NgIf } from "@angular/common";
import { MatButton, MatIconButton } from "@angular/material/button";
import { MatInputModule } from "@angular/material/input";
import { SecretsService } from "../secrets.service";
import { BehaviorSubject, Subject } from "rxjs";
import { RouterModule } from "@angular/router";
import { Clipboard } from "@angular/cdk/clipboard";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "app-create-secret",
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    NgIf,
    MatButton,
    MatInputModule,
    AsyncPipe,
    RouterModule,MatIconButton, MatIcon
  ],
  templateUrl: "./create-secret.component.html",
  styleUrl: "./create-secret.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateSecretComponent {
  form: FormGroup;
  encryptedInput$ = new BehaviorSubject<string>("");
  private _snackBar = inject(MatSnackBar);

  constructor(
    private fb: FormBuilder,
    private secretsService: SecretsService,
    private clipboard: Clipboard,
  ) {
    this.form = this.fb.group({
      message: ["", [Validators.required, Validators.maxLength(4096)]],
      password: [""], // Optional field
    });
  }

  get messageLength(): number {
    return this.form.get("message")?.value?.length || 0;
  }

  onSubmit() {
    if (this.form.valid) {
      console.log("Form Submitted", this.form.value);
      this.secretsService
        .encrypt(this.form.value.message, this.form.value.password)
        .subscribe(
          (response) => {
            console.log("Encryption successful", response);
            this.encryptedInput$.next(response.encryptedResponse);
            this.copyToClipboard()
          },
          (error) => {
            console.error("Encryption failed", error);
          },
        );
    }
  }
  copyToClipboard() {
    const secretUrl =
      window.origin +
      "/public/read-secret?encryptedInput=" +
      encodeURIComponent(this.encryptedInput$.value);
    this.clipboard.copy(secretUrl);
    this._snackBar.open("Copied Secret Link to Clipboard", "Got it", {
      duration: 5 * 1000,
      panelClass: "app-notification-info",
    });
  }
}
