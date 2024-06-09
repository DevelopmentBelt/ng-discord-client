import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {SidebarServer} from "../../models/sidebar-server/sidebar-server";

@Component({
  selector: 'ang-content',
  templateUrl: './ang-content.component.html',
  styleUrls: ['./ang-content.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AngContentComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  handleServerChange(server: SidebarServer) {}

}
