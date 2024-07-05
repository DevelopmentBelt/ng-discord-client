import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {AvatarModule} from "primeng/avatar";

@Component({
  selector: 'member-sidebar',
  templateUrl: './member-sidebar.component.html',
  styleUrls: ['./member-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvatarModule
  ],
  standalone: true
})
export class MemberSidebarComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
