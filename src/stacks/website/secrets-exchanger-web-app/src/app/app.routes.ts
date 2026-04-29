import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "public",
    pathMatch: "full",
  },
  {
    path: "public",
    loadChildren: () =>
      import("./public/public.routes").then((m) => m.routes),
  },
  {
    path: "**",
    redirectTo: "public",
  },
];
