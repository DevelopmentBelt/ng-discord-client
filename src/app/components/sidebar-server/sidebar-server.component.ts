import {ChangeDetectionStrategy, Component, Input, OnInit, signal, WritableSignal} from '@angular/core';
import {Server} from "../../models/server/server";

@Component({
  selector: 'sidebar-server',
  templateUrl: './sidebar-server.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true
})
export class SidebarServerComponent implements OnInit {

  @Input() server: Server = {} as Server;

  public serverIconURL: WritableSignal<string> = signal("");
  public serverDesc: WritableSignal<string> = signal("");

  constructor() {}

  ngOnInit(): void {
    this.serverIconURL.set(this.server.iconURL || "");
    this.serverDesc.set(this.server.serverDescription || "");
  }

  onImageError(): void {
    // If image fails to load, clear the URL to show fallback
    this.serverIconURL.set("");
  }

  getServerInitials(): string {
    if (!this.server.serverName) return "?";
    
    const words = this.server.serverName.split(' ');
    if (words.length === 1) {
      return this.server.serverName.substring(0, 2).toUpperCase();
    } else {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
  }
}
