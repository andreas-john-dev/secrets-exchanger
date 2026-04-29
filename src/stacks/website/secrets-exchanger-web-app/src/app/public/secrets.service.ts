import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class SecretsService {
  constructor(private http: HttpClient) { }
  private baseUrl = environment.apiUrl;
  encrypt(
    secretString: string,
    passphrase?: string,
  ): Observable<{ encryptedResponse: string }> {
    const url = this.baseUrl + "/encrypt";
    return this.http.post<{ encryptedResponse: string }>(url, {
      secretString,
      passphrase,
    });
  }

  decrypt(
    encryptedInput: string,
    passphrase?: string,
  ): Observable<{ secretString: string }> {
    const url = this.baseUrl + "/decrypt";
    return this.http.post<{ secretString: string }>(url, {
      encryptedInput,
      passphrase,
    });
  }
}
