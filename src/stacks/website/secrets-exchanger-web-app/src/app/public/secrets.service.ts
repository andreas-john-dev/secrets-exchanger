import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

interface StoreSecretResponse {
  encryptedResponse: string;
}

interface RetrieveSecretResponse {
  encryptedData: string;
}

@Injectable({ providedIn: "root" })
export class SecretsService {
  private readonly http = inject(HttpClient);

  /** Stores a browser-encrypted ciphertext blob; returns the KMS-wrapped token. */
  storeSecret(encryptedData: string): Observable<StoreSecretResponse> {
    return this.http.post<StoreSecretResponse>(`${environment.apiUrl}/encrypt`, {
      encryptedData,
    });
  }

  /** Retrieves and burns the stored ciphertext blob by KMS token. */
  retrieveSecret(encryptedInput: string): Observable<RetrieveSecretResponse> {
    return this.http.post<RetrieveSecretResponse>(`${environment.apiUrl}/decrypt`, {
      encryptedInput,
    });
  }
}
