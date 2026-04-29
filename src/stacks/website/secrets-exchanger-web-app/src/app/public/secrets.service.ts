import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

interface EncryptResponse {
  encryptedResponse: string;
}

interface DecryptResponse {
  secretString: string;
}

@Injectable({ providedIn: "root" })
export class SecretsService {
  private readonly http = inject(HttpClient);

  encrypt(secretString: string, passphrase?: string): Observable<EncryptResponse> {
    return this.http.post<EncryptResponse>(`${environment.apiUrl}/encrypt`, {
      secretString,
      passphrase,
    });
  }

  decrypt(encryptedInput: string, passphrase?: string): Observable<DecryptResponse> {
    return this.http.post<DecryptResponse>(`${environment.apiUrl}/decrypt`, {
      encryptedInput,
      passphrase,
    });
  }
}
