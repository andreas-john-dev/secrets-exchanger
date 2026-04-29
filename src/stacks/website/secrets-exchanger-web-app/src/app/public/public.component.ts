import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-public',
  imports: [RouterOutlet, MatToolbar, MatButton, RouterLink, RouterLinkActive],
  templateUrl: './public.component.html',
  styleUrl: './public.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicComponent { }
