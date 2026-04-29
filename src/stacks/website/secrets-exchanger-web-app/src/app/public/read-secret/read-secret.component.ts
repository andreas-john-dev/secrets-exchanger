import { AsyncPipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
  input,
} from "@angular/core";
import { Clipboard } from "@angular/cdk/clipboard";

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatButton } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { RouterModule } from "@angular/router";
import { Subject } from "rxjs";
import { SecretsService } from "../secrets.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpErrorResponse } from "@angular/common/http";
@Component({
  selector: "app-read-secret",
  imports: [
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButton,
    RouterModule,
  ],
  templateUrl: "./read-secret.component.html",
  styleUrl: "./read-secret.component.scss",
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ReadSecretComponent implements OnInit {
  form: FormGroup;

  private _snackBar = inject(MatSnackBar);

  encryptedInput = input<string>();

  constructor(
    private fb: FormBuilder,
    private secretsService: SecretsService,
    private clipboard: Clipboard,
  ) {
    this.form = this.fb.group({
      encryptedInput: ["", [Validators.required, Validators.maxLength(4096)]],
      passphrase: [""], // Optional field
      message: ["", []], // Optional field
    });
    this.form.get("message")?.disable();
  }

  ngOnInit(): void {
    // read secret from query param
    if (this.encryptedInput()) {
      console.log("encryptedInput", this.encryptedInput());
      this.form.get("encryptedInput")?.setValue(this.encryptedInput());
    }
  }

  onSubmit() {
    this.secretsService
      .decrypt(this.form.value.encryptedInput, this.form.value.passphrase)
      .subscribe(
        (response) => {
          this.form.get("message")?.setValue(response.secretString);
          this.clipboard.copy(response.secretString)
          this._snackBar.open("Copied Secret Text to Clipboard", "Got it", {
            duration: 5 * 1000,
            panelClass: "app-notification-info",
          });
        },
        (error: HttpErrorResponse) => {
          this.openSnackBar(error);
          // Handle the error here, e.g., show an error message
        },
      );
  }

  openSnackBar(error: HttpErrorResponse) {
    const errorText =
      error.status === 404
        ? "Encrypted Message not available (any longer)."
        : "Unknown error: " + error.error["message"];
    this._snackBar.open(errorText, "Got it", {
      // duration: 5 * 1000,
      panelClass: "app-notification-error",
    });
  }
}
